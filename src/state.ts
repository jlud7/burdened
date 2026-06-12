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

/** effective footprint, accounting for rotation */
export function dims(inst: ItemInstance): { w: number; h: number } {
  const def = ITEMS[inst.itemId];
  return inst.rot ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

/** can `inst`'s item be placed with its top-left corner at (x, y) on `grid`? */
export function fits(grid: 'pack' | 'mule', inst: ItemInstance, x: number, y: number): boolean {
  const d = dims(inst);
  const { w, h } = gridSize(grid);
  if (x < 0 || y < 0 || x + d.w > w || y + d.h > h) return false;
  for (const other of itemsOn(grid)) {
    if (other.uid === inst.uid) continue;
    const od = dims(other);
    const overlap = x < other.x + od.w && x + d.w > other.x && y < other.y + od.h && y + d.h > other.y;
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

/** toggle 90° rotation. Placed items only rotate if they still fit in place. */
export function rotate(inst: ItemInstance): boolean {
  const def = ITEMS[inst.itemId];
  if (def.w === def.h) return false;
  inst.rot = !inst.rot;
  if (inst.grid !== 'stash' && !fits(inst.grid, inst, inst.x, inst.y)) {
    inst.rot = !inst.rot; // no room to swing it around here
    return false;
  }
  return true;
}

export function unequip(inst: ItemInstance) {
  inst.grid = 'stash';
  inst.x = -1;
  inst.y = -1;
  inst.rot = false;
}

function carryGrids(): ('pack' | 'mule')[] {
  return G.expedition?.mule ? ['pack', 'mule'] : ['pack'];
}

/** first open spot on pack, then mule — trying the current orientation, then rotated */
function quickPlace(inst: ItemInstance): boolean {
  const def = ITEMS[inst.itemId];
  const r0 = !!inst.rot;
  const rots = def.w === def.h ? [r0] : [r0, !r0];
  for (const rot of rots) {
    inst.rot = rot;
    for (const grid of carryGrids()) {
      const { w, h } = gridSize(grid);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (place(inst, grid, x, y)) return true;
        }
      }
    }
  }
  inst.rot = r0;
  return false;
}

type Layout = { inst: ItemInstance; grid: ItemInstance['grid']; x: number; y: number; rot: boolean }[];

const snapshot = (items: ItemInstance[]): Layout =>
  items.map((inst) => ({ inst, grid: inst.grid, x: inst.x, y: inst.y, rot: !!inst.rot }));

const restore = (layout: Layout) =>
  layout.forEach(({ inst, grid, x, y, rot }) => Object.assign(inst, { grid, x, y, rot }));

/**
 * Rearrange everything carried (plus `extra`, if given) from scratch so it all fits.
 * Greedy first-fit-decreasing under a few orderings and orientation preferences —
 * not provably optimal, but on grids this small it finds a packing whenever one
 * reasonably exists. Commits on success, rolls back untouched on failure.
 */
export function repack(extra?: ItemInstance): boolean {
  const items = [...itemsOn('pack'), ...itemsOn('mule'), ...(extra ? [extra] : [])];
  const saved = snapshot(items);
  const area = (i: ItemInstance) => ITEMS[i.itemId].w * ITEMS[i.itemId].h;
  const maxDim = (i: ItemInstance) => Math.max(ITEMS[i.itemId].w, ITEMS[i.itemId].h);
  const orderings: ((a: ItemInstance, b: ItemInstance) => number)[] = [
    (a, b) => area(b) - area(a) || maxDim(b) - maxDim(a),
    (a, b) => maxDim(b) - maxDim(a) || area(b) - area(a),
  ];
  for (const order of orderings) {
    for (const wideFirst of [true, false]) {
      const sorted = [...items].sort(order);
      sorted.forEach((i) => Object.assign(i, { grid: 'stash', x: -1, y: -1 }));
      let ok = true;
      for (const inst of sorted) {
        const def = ITEMS[inst.itemId];
        inst.rot = def.w === def.h ? false : (def.w >= def.h) !== wideFirst;
        if (!quickPlace(inst)) { ok = false; break; }
      }
      if (ok) return true;
      restore(saved);
    }
  }
  return false;
}

export type PlaceResult = 'placed' | 'repacked' | null;

/** place wherever it fits as-is; failing that, rearrange the whole pack around it */
export function autoPlace(inst: ItemInstance): PlaceResult {
  if (quickPlace(inst)) return 'placed';
  if (repack(inst)) return 'repacked';
  return null;
}

/** loot currently being carried — the only things that can be dropped mid-run */
export function carriedLoot(): ItemInstance[] {
  return G.items.filter((i) => i.grid !== 'stash' && ITEMS[i.itemId].kind === 'loot');
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

/** ticks until the next phase change (null at night — it doesn't get worse) */
export function nextPhaseIn(): number | null {
  const t = G.expedition?.ticks ?? 0;
  const day = dayLength();
  if (t < day) return day - t;
  if (t < day + DUSK_TICKS) return day + DUSK_TICKS - t;
  return null;
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

/** tally carried loot by name, for the run summary */
function lootTally(): { name: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const inst of carriedLoot()) {
    const name = ITEMS[inst.itemId].name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, n]) => ({ name, n }));
}

/** bank carried loot, return gear to stash-equipped state, end the run */
export function extract() {
  const gained = { gold: 0, wood: 0, stone: 0 };
  const loot = lootTally();
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
  G.lastRun = { survived: true, ...gained, nights: isNight(), loot };
  G.expedition = null;
  G.combat = null;
  G.hp = G.maxHp;
  G.runsCompleted++;
  G.screen = 'summary';
  save();
}

/** death: carried loot is gone, gear survives (kind to the player), village persists */
export function perish() {
  const loot = lootTally();
  for (const inst of [...G.items]) {
    if (inst.grid === 'stash') continue;
    if (ITEMS[inst.itemId].kind === 'loot') destroyItem(inst.uid);
    else unequip(inst);
  }
  G.lastRun = { survived: false, gold: 0, wood: 0, stone: 0, nights: isNight(), loot };
  G.expedition = null;
  G.combat = null;
  G.hp = G.maxHp;
  G.screen = 'summary';
  save();
}
