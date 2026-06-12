import type { GameState, ItemInstance, Expedition, MapNode, NodeType, TimePhase, CombatCard } from './types';
import {
  ITEMS, CARDS, SIDEKICKS, DESTINATIONS, BUILDINGS,
  PACK_GRID, MULE_GRID, MULE_CURSES,
  BASE_DAY_TICKS, DUSK_TICKS, CORRUPTION_DAY, CORRUPTION_NIGHT, TORCH_CORRUPTION_BONUS,
  STARTING_STASH, STARTING_GOLD, MAX_HP,
} from './data';

const SAVE_KEY = 'burdened-save-v1';

export let G: GameState = newGame();

export function newGame(): GameState {
  const g: GameState = {
    screen: 'village',
    hp: MAX_HP,
    maxHp: MAX_HP,
    resources: { gold: STARTING_GOLD, wood: 0, stone: 0 },
    buildings: {},
    items: [],
    nextUid: 1,
    expedition: null,
    combat: null,
    lastRun: null,
    runsCompleted: 0,
  };
  for (const id of STARTING_STASH) {
    g.items.push({ uid: g.nextUid++, itemId: id, x: -1, y: -1, grid: 'stash' });
  }
  return g;
}

// ---------- persistence (village-level only; runs are not save-scummable) ----------

export function save() {
  if (G.expedition) return; // only persist between runs
  const data = {
    resources: G.resources,
    buildings: G.buildings,
    items: G.items,
    nextUid: G.nextUid,
    runsCompleted: G.runsCompleted,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* private mode etc. */ }
}

export function load(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    G = newGame();
    G.resources = data.resources;
    G.buildings = data.buildings;
    G.items = data.items;
    G.nextUid = data.nextUid;
    G.runsCompleted = data.runsCompleted ?? 0;
    return true;
  } catch {
    return false;
  }
}

export function wipeSave() {
  localStorage.removeItem(SAVE_KEY);
  G = newGame();
}

// ---------- rng ----------

export function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

export function pick<T>(arr: T[]): T {
  return arr[rand(arr.length)];
}

export function weightedPick<T extends { weight: number }>(table: T[]): T {
  const total = table.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of table) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return table[table.length - 1];
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- grid / inventory ----------

export function gridSize(grid: 'pack' | 'mule') {
  return grid === 'pack' ? PACK_GRID : MULE_GRID;
}

export function itemsOn(grid: 'pack' | 'mule' | 'stash'): ItemInstance[] {
  return G.items.filter((i) => i.grid === grid);
}

export function findItem(uid: number): ItemInstance | undefined {
  return G.items.find((i) => i.uid === uid);
}

/** can `inst`'s item be placed with its top-left corner at (x, y) on `grid`? */
export function fits(grid: 'pack' | 'mule', inst: ItemInstance, x: number, y: number): boolean {
  const def = ITEMS[inst.itemId];
  const { w, h } = gridSize(grid);
  if (x < 0 || y < 0 || x + def.w > w || y + def.h > h) return false;
  for (const other of itemsOn(grid)) {
    if (other.uid === inst.uid) continue;
    const od = ITEMS[other.itemId];
    const overlap = x < other.x + od.w && x + def.w > other.x && y < other.y + od.h && y + def.h > other.y;
    if (overlap) return false;
  }
  return true;
}

export function place(inst: ItemInstance, grid: 'pack' | 'mule', x: number, y: number): boolean {
  if (!fits(grid, inst, x, y)) return false;
  inst.grid = grid;
  inst.x = x;
  inst.y = y;
  return true;
}

export function unequip(inst: ItemInstance) {
  inst.grid = 'stash';
  inst.x = -1;
  inst.y = -1;
}

/** auto-place into the first open spot on pack, then mule. */
export function autoPlace(inst: ItemInstance): boolean {
  const grids: ('pack' | 'mule')[] = G.expedition?.mule ? ['pack', 'mule'] : ['pack'];
  for (const grid of grids) {
    const { w, h } = gridSize(grid);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (place(inst, grid, x, y)) return true;
      }
    }
  }
  return false;
}

export function spawnItem(itemId: string): ItemInstance {
  const inst: ItemInstance = { uid: G.nextUid++, itemId, x: -1, y: -1, grid: 'stash' };
  G.items.push(inst);
  return inst;
}

export function destroyItem(uid: number) {
  G.items = G.items.filter((i) => i.uid !== uid);
}

export function carryingLitTorch(): boolean {
  return G.items.some((i) => i.grid !== 'stash' && ITEMS[i.itemId].light);
}

// ---------- deck ----------

let cardUid = 1;

/** the full deck implied by the current grids + sidekick + mule, per the 2/3–1/3 rule */
export function buildDeck(): CombatCard[] {
  const deck: CombatCard[] = [];
  for (const inst of G.items) {
    if (inst.grid === 'stash') continue;
    const def = ITEMS[inst.itemId];
    for (const cid of def.cards ?? []) {
      deck.push({ uid: cardUid++, defId: cid, sourceUid: inst.uid });
    }
    for (let j = 0; j < (def.junk ?? 0); j++) {
      deck.push({ uid: cardUid++, defId: 'junk', sourceUid: inst.uid });
    }
  }
  const exp = G.expedition;
  if (exp?.sidekickId) {
    for (const cid of SIDEKICKS[exp.sidekickId].cards) {
      deck.push({ uid: cardUid++, defId: cid });
    }
  }
  if (exp?.mule) {
    for (let j = 0; j < MULE_CURSES; j++) {
      deck.push({ uid: cardUid++, defId: 'cower' });
    }
  }
  return deck;
}

export function deckBreakdown() {
  const deck = buildDeck();
  const playable = deck.filter((c) => !CARDS[c.defId].unplayable).length;
  return { total: deck.length, playable, junk: deck.length - playable };
}

// ---------- clock ----------

export function dayLength(): number {
  let ticks = BASE_DAY_TICKS;
  for (const [id, built] of Object.entries(G.buildings)) {
    if (built && BUILDINGS[id].daylight) ticks += BUILDINGS[id].daylight!;
  }
  return ticks;
}

export function timePhase(): TimePhase {
  const t = G.expedition?.ticks ?? 0;
  const day = dayLength();
  if (t < day) return 'day';
  if (t < day + DUSK_TICKS) return 'dusk';
  return 'night';
}

export function isNight(): boolean {
  return timePhase() === 'night';
}

export function tick(n = 1) {
  if (G.expedition) G.expedition.ticks += n;
}

export function corruptionChance(): number {
  let c = isNight() ? CORRUPTION_NIGHT : CORRUPTION_DAY;
  if (carryingLitTorch()) c -= TORCH_CORRUPTION_BONUS;
  return Math.max(0.05, c);
}

// ---------- expedition ----------

export function generateExpedition(destId: string, sidekickId: string | null, mule: boolean): Expedition {
  const dest = DESTINATIONS[destId];
  const nodes: MapNode[] = [];
  const entries = Object.entries(dest.weights) as [NodeType, number][];
  for (let i = 0; i < dest.length; i++) {
    let type: NodeType;
    if (i === dest.length - 1 && dest.finale) {
      type = dest.finale;
    } else {
      type = weightedPick(entries.map(([t, w]) => ({ t, weight: w }))).t;
    }
    nodes.push({ type, cleared: false, corrupted: false });
  }
  return {
    destId,
    nodes,
    pos: -1,
    returning: false,
    ticks: 0,
    lootedUids: [],
    mule,
    sidekickId,
    pendingNode: null,
  };
}

/** chance roll for a cleared node corrupting as you backtrack through it */
export function maybeCorrupt(node: MapNode): boolean {
  if (!node.cleared || node.corrupted) return false;
  if (Math.random() < corruptionChance()) {
    node.corrupted = true;
    return true;
  }
  return false;
}

/** bank carried loot, return gear to stash-equipped state, end the run */
export function extract() {
  const gained = { gold: 0, wood: 0, stone: 0 };
  for (const inst of [...G.items]) {
    if (inst.grid === 'stash') continue;
    const def = ITEMS[inst.itemId];
    if (def.kind === 'loot') {
      gained.gold += def.gold ?? 0;
      gained.wood += def.wood ?? 0;
      gained.stone += def.stone ?? 0;
      destroyItem(inst.uid);
    } else if (inst.grid === 'mule') {
      unequip(inst); // the mule goes home; gear it carried returns to the stash
    }
  }
  G.resources.gold += gained.gold;
  G.resources.wood += gained.wood;
  G.resources.stone += gained.stone;
  G.lastRun = { survived: true, ...gained, nights: isNight() };
  G.expedition = null;
  G.combat = null;
  G.hp = G.maxHp;
  G.runsCompleted++;
  G.screen = 'summary';
  save();
}

/** death: carried loot is gone, gear survives (kind to the player), village persists */
export function perish() {
  for (const inst of [...G.items]) {
    if (inst.grid === 'stash') continue;
    if (ITEMS[inst.itemId].kind === 'loot') destroyItem(inst.uid);
    else unequip(inst);
  }
  G.lastRun = { survived: false, gold: 0, wood: 0, stone: 0, nights: isNight() };
  G.expedition = null;
  G.combat = null;
  G.hp = G.maxHp;
  G.screen = 'summary';
  save();
}
