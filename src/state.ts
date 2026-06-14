import type { GameState, ItemInstance, Expedition, MapNode, NodeType, TimePhase, CombatCard, ConsumableStage } from './types';
import {
  ITEMS, CARDS, SIDEKICKS, DESTINATIONS, BUILDINGS, BASE_DECK, DOG_CARDS,
  PACK_GRID, MULE_GRID, MULE_CURSES,
  MAX_WEIGHT, MULE_WEIGHT_BONUS, WEIGHT_TIERS, BURDEN_COPIES,
  CORRUPTION_NIGHT, TORCH_CORRUPTION_BONUS,
  RAID_CHANCE_PER_HEAT, RAID_CHANCE_CAP,
  CRATE_TABLES, CRATE_BADGES,
  STARTING_STASH, STARTING_GOLD, MAX_HP,
} from './data';

const SAVE_KEY = 'burdened-save-v1';

export let G: GameState = newGame();

export function newGame(): GameState {
  const g: GameState = {
    screen: 'village',
    hp: MAX_HP,
    maxHp: MAX_HP,
    resources: { gold: STARTING_GOLD, wood: 0, stone: 0, essence: 0 },
    buildings: {},
    ruined: [],
    kennelLevel: 1,
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
    ruined: G.ruined,
    kennelLevel: G.kennelLevel,
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
    G.resources = { essence: 0, ...data.resources };
    G.buildings = data.buildings;
    G.ruined = data.ruined ?? [];
    G.kennelLevel = data.kennelLevel ?? 1;
    // drop any items whose defs no longer exist (saves from older builds)
    G.items = (data.items as ItemInstance[]).filter((i) => ITEMS[i.itemId]);
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

export function randRange(min: number, max: number): number {
  return min + rand(max - min + 1);
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

/** everything on the pack or mule */
export function carried(): ItemInstance[] {
  return G.items.filter((i) => i.grid !== 'stash');
}

/** effective footprint, accounting for rotation */
export function dims(inst: ItemInstance): { w: number; h: number } {
  const def = ITEMS[inst.itemId];
  return inst.rot ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

/** the one badge currently carried, if any (one per run — GDD v3 §2) */
export function carriedBadge(): ItemInstance | undefined {
  return carried().find((i) => ITEMS[i.itemId].kind === 'badge');
}

/** can `inst`'s item be placed with its top-left corner at (x, y) on `grid`? */
export function fits(grid: 'pack' | 'mule', inst: ItemInstance, x: number, y: number): boolean {
  const def = ITEMS[inst.itemId];
  // only one badge may be worn per run
  if (def.kind === 'badge') {
    const other = carriedBadge();
    if (other && other.uid !== inst.uid) return false;
  }
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

/** carried things that can be abandoned mid-run: loot, crates, consumables */
export function droppable(): ItemInstance[] {
  return carried().filter((i) => ITEMS[i.itemId].kind !== 'gear' && ITEMS[i.itemId].kind !== 'badge');
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

// ---------- weight & the fluid encumbrance system (GDD v3 §3) ----------

export function carriedWeight(): number {
  return carried().reduce((s, i) => s + ITEMS[i.itemId].weight, 0);
}

export function weightCapacity(): number {
  return MAX_WEIGHT + (G.expedition?.mule ? MULE_WEIGHT_BONUS : 0);
}

/** crossed tiers, lightest first */
export function crossedTiers() {
  const frac = carriedWeight() / weightCapacity();
  return WEIGHT_TIERS.filter((t) => frac >= t.at);
}

export function loadLabel(): string {
  const crossed = crossedTiers();
  return crossed.length ? crossed[crossed.length - 1].label : 'Light';
}

/** burden card ids the deck must currently contain, with copy counts */
export function requiredBurdens(): Record<string, number> {
  const req: Record<string, number> = {};
  for (const t of crossedTiers()) req[t.cardId] = BURDEN_COPIES;
  return req;
}

// ---------- buildings ----------

export function isBuilt(id: string): boolean {
  return !!G.buildings[id] && !G.ruined.includes(id);
}

export function hasDog(): boolean {
  return isBuilt('kennel');
}

// ---------- deck ----------

let cardUid = 1;

function pushCard(deck: CombatCard[], defId: string, sourceUid?: number, companion?: boolean) {
  deck.push({ uid: cardUid++, defId, sourceUid, companion });
}

/**
 * The full deck implied by the current state: naked base deck (badge-transformed),
 * cards from gridded gear, the dog, the sidekick, mule curses, and the burden
 * cards your current load injects. Raids swap burdens/hirelings for Town Cards.
 */
export function buildDeck(forRaid = false): CombatCard[] {
  const deck: CombatCard[] = [];
  // the naked base deck, run through the badge's transform
  const badge = carriedBadge();
  const transform = badge ? ITEMS[badge.itemId].badge?.transform ?? {} : {};
  for (const cid of BASE_DECK) pushCard(deck, transform[cid] ?? cid, badge?.uid);
  // gear cards
  for (const inst of carried()) {
    const def = ITEMS[inst.itemId];
    for (const cid of def.cards ?? []) pushCard(deck, cid, inst.uid);
  }
  // the dog defends the road and the village alike
  const exp = G.expedition;
  // the companion unit is the sidekick if hired, else the dog; tag its cards so they
  // leave the deck if it's incapacitated mid-fight (GDD v4 §4.3)
  const primaryIsSidekick = !forRaid && !!exp?.sidekickId;
  if (hasDog()) {
    for (const cid of DOG_CARDS[G.kennelLevel] ?? DOG_CARDS[1]) pushCard(deck, cid, undefined, !primaryIsSidekick);
  }
  if (!forRaid) {
    if (exp?.sidekickId) {
      for (const cid of SIDEKICKS[exp.sidekickId].cards) pushCard(deck, cid, undefined, true);
    }
    if (exp?.mule) {
      for (let j = 0; j < MULE_CURSES; j++) pushCard(deck, 'cower');
    }
    // the burden of the pack
    for (const [cid, n] of Object.entries(requiredBurdens())) {
      for (let j = 0; j < n; j++) pushCard(deck, cid);
    }
  } else {
    // town cards from standing buildings
    for (const b of Object.values(BUILDINGS)) {
      if (isBuilt(b.id) && b.townCard) pushCard(deck, b.townCard);
    }
  }
  return deck;
}

export function deckBreakdown() {
  const deck = buildDeck();
  const playable = deck.filter((c) => !CARDS[c.defId].unplayable).length;
  return { total: deck.length, playable, burdens: deck.length - playable };
}

// ---------- healing (Devout badge) ----------

export function healMult(): number {
  const badge = carriedBadge();
  return badge ? ITEMS[badge.itemId].badge?.healMult ?? 1 : 1;
}

/** heal through the badge multiplier; returns the actual amount restored */
export function healPlayer(n: number): number {
  const amt = Math.ceil(n * healMult());
  const before = G.hp;
  G.hp = Math.min(G.maxHp, G.hp + amt);
  return G.hp - before;
}

// ---------- consumables (GDD v3 §6) ----------

const AGE_EVERY_DEFAULT = 2;

export function stageOf(inst: ItemInstance): ConsumableStage | null {
  const def = ITEMS[inst.itemId];
  if (!def.stages) return null;
  const per = def.ageEvery ?? AGE_EVERY_DEFAULT;
  const idx = Math.min(Math.floor((inst.age ?? 0) / per), def.stages.length - 1);
  return def.stages[idx];
}

/** display name with stage/cooked prefix: "Ripe Apple", "Raw Hunk of Meat" */
export function displayName(inst: ItemInstance): string {
  const def = ITEMS[inst.itemId];
  const stage = stageOf(inst);
  if (stage) return `${stage.name} ${def.name}`;
  if (def.cookable) return `${inst.cooked ? 'Cooked' : 'Raw'} ${def.name}`;
  return def.name;
}

/** food ages one step per battle survived */
export function ageConsumables() {
  for (const inst of carried()) {
    if (ITEMS[inst.itemId].stages) inst.age = (inst.age ?? 0) + 1;
  }
}

export interface ConsumeResult {
  ok: boolean;
  msg: string;
  /** spoiled food hurled at the enemy */
  thrownPoison?: number;
  /** energy gained (combat only) */
  gainEnergy?: number;
  /** block gained (combat only) */
  block?: number;
  /** item id spawned in the eaten item's place (Sharp Bone) */
  transformedTo?: string;
}

/**
 * Eat/drink/throw a carried consumable. Combat-only effects (energy, block,
 * throwing) are surfaced in the result for the combat layer to apply.
 */
export function consume(uid: number, inCombat: boolean): ConsumeResult {
  const inst = findItem(uid);
  if (!inst || inst.grid === 'stash') return { ok: false, msg: 'Not carried.' };
  const def = ITEMS[inst.itemId];
  if (def.kind !== 'consumable') return { ok: false, msg: 'Not edible.' };

  const stage = stageOf(inst);
  if (stage?.throwPoison) {
    if (!inCombat) return { ok: false, msg: `The ${def.name.toLowerCase()} is ${stage.name.toLowerCase()} — only good for throwing at something.` };
    destroyItem(uid);
    return { ok: true, msg: `You hurl the ${stage.name.toLowerCase()} ${def.name.toLowerCase()}!`, thrownPoison: stage.throwPoison };
  }

  const parts: string[] = [];
  const result: ConsumeResult = { ok: true, msg: '' };
  const healBase = stage ? stage.heal ?? 0 : def.cookable ? (inst.cooked ? def.heal ?? 0 : def.rawHeal ?? 0) : def.heal ?? 0;
  if (healBase) {
    const healed = healPlayer(healBase);
    parts.push(`+${healed} HP`);
  }
  if (def.maxHpBonus) {
    G.maxHp += def.maxHpBonus;
    G.hp += def.maxHpBonus;
    parts.push(`+${def.maxHpBonus} max HP`);
  }
  if (inCombat && stage?.gainEnergy) {
    result.gainEnergy = stage.gainEnergy;
    parts.push(`+${stage.gainEnergy} energy`);
  }
  if (inCombat && stage?.block) {
    result.block = stage.block;
    parts.push(`+${stage.block} block`);
  }
  if (def.clearStatuses && G.combat) {
    G.combat.playerStatuses = {};
    parts.push('debuffs cleared');
  }

  destroyItem(uid);
  if (def.transformTo) {
    const bone = spawnItem(def.transformTo);
    if (!autoPlace(bone)) unequip(bone); // shouldn't happen (smaller than what it replaced)
    result.transformedTo = def.transformTo;
    parts.push(`a ${ITEMS[def.transformTo].name} remains`);
  }
  result.msg = `${displayNameFromDef(def.id, inst)} eaten: ${parts.join(', ') || 'nothing much'}.`;
  return result;
}

function displayNameFromDef(itemId: string, inst: ItemInstance): string {
  const def = ITEMS[itemId];
  const stage = stageOf(inst);
  if (stage) return `${stage.name} ${def.name}`;
  if (def.cookable) return `${inst.cooked ? 'Cooked' : 'Raw'} ${def.name}`;
  return def.name;
}

// ---------- time: day out, dusk at the bottom, night home (GDD v3 §4) ----------

export function timePhase(): TimePhase {
  const exp = G.expedition;
  if (!exp) return 'day';
  if (exp.returning) return 'night';
  const node = exp.pos >= 0 ? exp.nodes[exp.pos] : null;
  if (node && node.col === exp.cols - 1) return 'dusk';
  return 'day';
}

export function isNight(): boolean {
  return timePhase() === 'night';
}

export function corruptionChance(): number {
  let c = CORRUPTION_NIGHT;
  if (carryingLitTorch()) c -= TORCH_CORRUPTION_BONUS;
  return Math.max(0.05, c);
}

// ---------- expedition: branching node map (GDD v3 §4) ----------

export function generateExpedition(destId: string, sidekickId: string | null, mule: boolean): Expedition {
  const dest = DESTINATIONS[destId];
  const cols = dest.length;
  const entries = Object.entries(dest.weights) as [NodeType, number][];
  const rows: number[] = [];
  for (let c = 0; c < cols; c++) {
    rows.push(c === cols - 1 ? 1 : c === 0 ? 2 : 2 + rand(2)); // 2..3 wide, single finale
  }
  const nodes: MapNode[] = [];
  const colNodes: MapNode[][] = [];
  let id = 0;
  for (let c = 0; c < cols; c++) {
    const list: MapNode[] = [];
    for (let r = 0; r < rows[c]; r++) {
      let type: NodeType;
      if (c === cols - 1 && dest.finale) {
        type = dest.finale;
      } else {
        type = weightedPick(entries.map(([t, w]) => ({ t, weight: w }))).t;
        if (c === 0 && type === 'elite') type = 'combat'; // no elites on the doorstep
      }
      const node: MapNode = { id: id++, col: c, row: r, type, cleared: false, corrupted: false, next: [] };
      nodes.push(node);
      list.push(node);
    }
    colNodes.push(list);
  }
  // non-crossing edge windows guaranteeing every node is reachable both ways
  for (let c = 0; c < cols - 1; c++) {
    const a = colNodes[c].length;
    const b = colNodes[c + 1].length;
    for (let j = 0; j < a; j++) {
      const lo = Math.floor((j * b) / a);
      const hi = Math.min(Math.floor(((j + 1) * b) / a), b - 1);
      for (let k = lo; k <= hi; k++) colNodes[c][j].next.push(colNodes[c + 1][k].id);
    }
  }
  return {
    destId,
    nodes,
    cols,
    pos: -1,
    returning: false,
    lootedUids: [],
    mule,
    sidekickId,
    heat: 0,
  };
}

export function nodeById(id: number): MapNode {
  return G.expedition!.nodes[id];
}

/** nodes the player can step to right now */
export function reachable(): MapNode[] {
  const exp = G.expedition!;
  if (!exp.returning) {
    if (exp.pos === -1) return exp.nodes.filter((n) => n.col === 0);
    return nodeById(exp.pos).next.map(nodeById);
  }
  // homeward: any previous-column node that connects to where you stand
  if (exp.pos === -1) return [];
  const cur = nodeById(exp.pos);
  if (cur.col === 0) return []; // next step is the village gate
  return exp.nodes.filter((n) => n.col === cur.col - 1 && n.next.includes(cur.id));
}

/** is this node's type visible? (adjacent-reachable, cleared, scouted, or already entered) */
export function nodeKnown(node: MapNode): boolean {
  if (isBuilt('watchtower')) return true;
  if (node.cleared || node.corrupted) return true;
  const exp = G.expedition!;
  if (node.col === 0) return true;
  if (exp.pos >= 0) {
    const cur = nodeById(exp.pos);
    if (node.col <= cur.col) return true;
    if (cur.next.includes(node.id)) return true;
  }
  return false;
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

// ---------- extraction & death ----------

/** tally carried loot+crates by name, for the run summary */
function lootTally(): { name: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const inst of carried()) {
    const kind = ITEMS[inst.itemId].kind;
    if (kind !== 'loot' && kind !== 'crate') continue;
    const name = ITEMS[inst.itemId].name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, n]) => ({ name, n }));
}

/**
 * Bank carried loot, stash crates for the Blacksmith, end the run.
 * Returns the raid heat if the haul dragged trouble home, else null —
 * the caller starts the raid (GDD v3 §8).
 */
export function extract(): number | null {
  const exp = G.expedition!;
  const greedy = carriedWeight() / weightCapacity() >= 0.75;
  const gained = { gold: 0, wood: 0, stone: 0, essence: 0 };
  const loot = lootTally();
  let crates = 0;
  for (const inst of [...G.items]) {
    if (inst.grid === 'stash') continue;
    const def = ITEMS[inst.itemId];
    if (def.kind === 'loot') {
      gained.gold += def.gold ?? 0;
      gained.wood += def.wood ?? 0;
      gained.stone += def.stone ?? 0;
      gained.essence += def.essence ?? 0;
      destroyItem(inst.uid);
    } else if (def.kind === 'crate') {
      crates++;
      unequip(inst); // waits in the stash for the Blacksmith
    } else if (inst.grid === 'mule') {
      unequip(inst); // the mule goes home; gear it carried returns to the stash
    }
  }
  G.resources.gold += gained.gold;
  G.resources.wood += gained.wood;
  G.resources.stone += gained.stone;
  G.resources.essence += gained.essence;
  G.lastRun = { survived: true, ...gained, nights: true, loot, crates };
  const heat = exp.heat + crates + (greedy ? 1 : 0);
  G.expedition = null;
  G.combat = null;
  G.maxHp = MAX_HP; // berry bonuses end with the run
  G.hp = G.maxHp;
  G.runsCompleted++;
  G.screen = 'summary';
  save();
  const anyBuilding = Object.values(BUILDINGS).some((b) => G.buildings[b.id]);
  if (G.runsCompleted >= 2 && anyBuilding && heat > 0) {
    const chance = Math.min(heat * RAID_CHANCE_PER_HEAT, RAID_CHANCE_CAP);
    if (Math.random() < chance) return heat;
  }
  return null;
}

/** death: carried loot is gone, gear survives (kind to the player), village persists */
export function perish() {
  const loot = lootTally();
  for (const inst of [...G.items]) {
    if (inst.grid === 'stash') continue;
    const kind = ITEMS[inst.itemId].kind;
    if (kind === 'loot' || kind === 'crate' || kind === 'consumable') destroyItem(inst.uid);
    else unequip(inst);
  }
  G.lastRun = { survived: false, gold: 0, wood: 0, stone: 0, essence: 0, nights: isNight(), loot, crates: 0 };
  G.expedition = null;
  G.combat = null;
  G.maxHp = MAX_HP;
  G.hp = G.maxHp;
  G.screen = 'summary';
  save();
}

// ---------- the village: crates, shop, kennel, repairs ----------

export interface CrateOpening {
  crateName: string;
  msg: string;
}

/** the Blacksmith cracks open a stashed crate (GDD v3 §5) */
export function openCrate(uid: number): CrateOpening | null {
  const inst = findItem(uid);
  if (!inst || inst.grid !== 'stash') return null;
  const def = ITEMS[inst.itemId];
  const table = CRATE_TABLES[inst.itemId];
  if (def.kind !== 'crate' || !table || !isBuilt('blacksmith')) return null;
  destroyItem(uid);
  const roll = weightedPick(table);
  let msg: string;
  if (roll.kind === 'gold') {
    const n = randRange(roll.min, roll.max);
    G.resources.gold += n;
    msg = `${n} gold inside!`;
  } else if (roll.kind === 'essence') {
    const n = randRange(roll.min, roll.max);
    G.resources.essence += n;
    msg = `${n} magic essence, humming softly.`;
  } else if (roll.kind === 'badge') {
    const owned = new Set(G.items.map((i) => i.itemId));
    const fresh = CRATE_BADGES.filter((b) => !owned.has(b));
    if (fresh.length) {
      const id = pick(fresh);
      spawnItem(id);
      msg = `A ${ITEMS[id].name} — a new calling.`;
    } else {
      G.resources.gold += 40;
      msg = 'A badge you already wear. The smith pays 40 gold for it.';
    }
  } else {
    spawnItem(roll.itemId);
    msg = `A ${ITEMS[roll.itemId].name}, good as new.`;
  }
  save();
  return { crateName: def.name, msg };
}

/** sell a stashed item for its listed value */
export function sellItem(uid: number): boolean {
  const inst = findItem(uid);
  if (!inst || inst.grid !== 'stash') return false;
  const def = ITEMS[inst.itemId];
  if (!def.value) return false;
  G.resources.gold += def.value;
  destroyItem(uid);
  save();
  return true;
}

export function repairCost(id: string): { gold: number; wood: number; stone: number } {
  const b = BUILDINGS[id];
  return { gold: Math.ceil(b.costGold / 2), wood: Math.ceil(b.costWood / 2), stone: Math.ceil(b.costStone / 2) };
}

export function repairBuilding(id: string): boolean {
  if (!G.ruined.includes(id)) return false;
  const c = repairCost(id);
  const r = G.resources;
  if (r.gold < c.gold || r.wood < c.wood || r.stone < c.stone) return false;
  r.gold -= c.gold;
  r.wood -= c.wood;
  r.stone -= c.stone;
  G.ruined = G.ruined.filter((x) => x !== id);
  save();
  return true;
}
