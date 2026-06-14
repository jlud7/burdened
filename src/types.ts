export type CardType = 'attack' | 'skill' | 'junk' | 'burden';

/** statuses an enemy can carry (tick at the start of its action) */
export type EnemyStatus = 'burn' | 'poison' | 'bleed' | 'blind' | 'weak';
/** statuses the player can carry */
export type PlayerStatus = 'sleep' | 'rooted' | 'corrosion';

export interface CardDef {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  desc: string;
  art: string;
  damage?: number;
  block?: number;
  heal?: number;
  draw?: number;
  /** reduces the enemy's next attack by this much */
  weaken?: number;
  /** energy gained when played (Focus) */
  gainEnergy?: number;
  /** statuses applied to the enemy */
  burn?: number;
  poison?: number;
  bleed?: number;
  blind?: number;
  /** counts toward the Marksman badge's every-3rd-shot crit */
  arrow?: boolean;
  unplayable?: boolean;
  /** stays in hand at end of turn (Sluggish) */
  retain?: boolean;
  /** burden triggers when the card is drawn */
  onDraw?: 'sap' | 'exhaust';
  /** playing this card destroys the granting item (e.g. Torch) */
  breaksItem?: boolean;
}

export type ItemKind = 'gear' | 'badge' | 'consumable' | 'crate' | 'loot';

/** one stage of an aging consumable (Fresh → Ripe → Spoiled) */
export interface ConsumableStage {
  name: string;
  desc: string;
  heal?: number;
  gainEnergy?: number;
  block?: number;
  /** spoiled food: thrown at the enemy in combat instead of eaten */
  throwPoison?: number;
}

export interface BadgeDef {
  /** base-deck card ids transformed while the badge is worn (bash → firebolt) */
  transform?: Record<string, string>;
  /** multiplier on all healing (Devout) */
  healMult?: number;
  /** every 3rd arrow card crits (Marksman) */
  arrowCrit?: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  w: number;
  h: number;
  /** weight value — the heart of the encumbrance system */
  weight: number;
  desc: string;
  art: string;
  /** card ids granted while equipped (gear only) */
  cards?: string[];
  /** badge behavior (badge only — one badge per run) */
  badge?: BadgeDef;
  /** consumable: aging stages, indexed by age bracket */
  stages?: ConsumableStage[];
  /** battles carried per stage step (default 2) */
  ageEvery?: number;
  /** consumable: must be cooked at a campfire to unlock its full heal */
  cookable?: boolean;
  /** heal when eaten raw (cookable only) */
  rawHeal?: number;
  /** flat heal when eaten (non-aging consumables) */
  heal?: number;
  /** eaten: also clears player statuses (Major Elixir) */
  clearStatuses?: boolean;
  /** eaten: raises max HP for the rest of the run (Vitality Berries) */
  maxHpBonus?: number;
  /** item left behind after eating (Hunk of Meat → Sharp Bone) */
  transformTo?: string;
  /** sell price at the village (gear/badges) */
  value?: number;
  gold?: number;
  wood?: number;
  stone?: number;
  essence?: number;
  /** torch: lights the path home, reducing corruption */
  light?: boolean;
}

/** a concrete item instance, possibly placed on a grid */
export interface ItemInstance {
  uid: number;
  itemId: string;
  x: number; // -1 when not placed
  y: number;
  grid: 'pack' | 'mule' | 'stash';
  /** rotated 90°: width and height swap */
  rot?: boolean;
  /** battles carried (aging consumables) */
  age?: number;
  /** cooked at a campfire (Hunk of Meat) */
  cooked?: boolean;
}

/** one move in an enemy's repeating pattern */
export interface EnemyMove {
  name: string;
  attack?: number;
  /** number of hits (default 1) */
  hits?: number;
  block?: number;
  /** status applied to the player on this move */
  status?: PlayerStatus;
  sValue?: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  art: string;
  pattern: EnemyMove[];
  /** chance to drop a specific item (Goblin → Club) */
  drop?: { itemId: string; chance: number };
  /** magic essence awarded on kill */
  essence?: number;
}

export interface SidekickDef {
  id: string;
  name: string;
  cost: number;
  desc: string;
  art: string;
  /** combat HP when fielded as a unit (GDD v4 §7) */
  hp: number;
  cards: string[];
}

export type NodeType = 'combat' | 'elite' | 'gather' | 'event' | 'treasure' | 'campfire';

export interface MapNode {
  id: number;
  col: number;
  row: number;
  type: NodeType;
  cleared: boolean;
  /** set when a cleared node corrupts on the way home */
  corrupted: boolean;
  /** node ids reachable in the next column */
  next: number[];
}

export interface DestinationDef {
  id: string;
  name: string;
  desc: string;
  art: string;
  /** number of map columns */
  length: number;
  /** weights for node generation */
  weights: Partial<Record<NodeType, number>>;
  /** force the final node's type */
  finale?: NodeType;
  /** specific enemy for the finale (King Croak) */
  finaleBoss?: string;
  enemies: string[];
  nightEnemies: string[];
  elites: string[];
  lootTable: { itemId: string; weight: number }[];
  gatherTable: { itemId: string; weight: number }[];
  /** guaranteed drop from elites */
  eliteReward: string;
}

export interface BuildingDef {
  id: string;
  name: string;
  desc: string;
  art: string;
  costGold: number;
  costWood: number;
  costStone: number;
  /** item ids added to the stash when built */
  unlocks?: string[];
  /** can open loot crates (Blacksmith) */
  opensCrates?: boolean;
  /** reveals all node types on the expedition map (Watchtower) */
  scouts?: boolean;
  /** the dog joins every expedition for free (Kennel) */
  dog?: boolean;
  /** repeatable purchase: item for gold (Apothecary restock) */
  shop?: { itemId: string; price: number };
  /** card id contributed to the deck during village raids */
  townCard?: string;
}

export type Screen = 'village' | 'map' | 'combat' | 'summary';

export type TimePhase = 'day' | 'dusk' | 'night';

export interface CombatCard {
  uid: number;
  defId: string;
  /** uid of the granting item, for breaksItem */
  sourceUid?: number;
  /** contributed by the companion unit — pulled if it's incapacitated (GDD v4 §4.3) */
  companion?: boolean;
}

export interface EnemyInstance {
  enemyId: string;
  hp: number;
  maxHp: number;
  block: number;
  patternIdx: number;
  /** night/corruption attack bonus (flat), added on top of the move's attack */
  atkBonus: number;
  statuses: Partial<Record<EnemyStatus, number>>;
  /** this turn's intent is aimed at the companion instead of the Boy (GDD v4 §4.1) */
  targetCompanion: boolean;
}

/** a hired sidekick or the dog, fighting as a unit with its own HP (GDD v4 §4.3) */
export interface CompanionState {
  id: string;
  name: string;
  art: string;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface CombatState {
  enemies: EnemyInstance[];
  /** index of the currently targeted living enemy */
  focus: number;
  companion: CompanionState | null;
  playerStatuses: Partial<Record<PlayerStatus, number>>;
  draw: CombatCard[];
  hand: CombatCard[];
  discard: CombatCard[];
  energy: number;
  maxEnergy: number;
  playerBlock: number;
  turn: number;
  /** arrows fired this combat (Marksman crit counter) */
  arrows: number;
  /** Complete Exhaustion was drawn — no cards this turn */
  exhausted: boolean;
  /** village raid: remaining enemy waves after this one */
  waves?: string[];
  raid?: boolean;
  over: boolean;
}

export interface Expedition {
  destId: string;
  nodes: MapNode[];
  cols: number;
  /** current node id; -1 = village edge */
  pos: number;
  returning: boolean;
  /** items picked up this run (uids), for the summary */
  lootedUids: number[];
  mule: boolean;
  sidekickId: string | null;
  /** raid heat accumulated this run (elites, crates, greed) */
  heat: number;
}

export interface GameState {
  screen: Screen;
  hp: number;
  maxHp: number;
  resources: { gold: number; wood: number; stone: number; essence: number };
  buildings: Record<string, boolean>;
  /** built buildings knocked out by a raid; repair to reactivate */
  ruined: string[];
  /** kennel training level (1 = Bite, 2 = Savage Bite) */
  kennelLevel: number;
  items: ItemInstance[];
  nextUid: number;
  expedition: Expedition | null;
  combat: CombatState | null;
  /** results of the last run, for the summary screen */
  lastRun: {
    survived: boolean; gold: number; wood: number; stone: number; essence: number; nights: boolean;
    /** what was banked (or lost on the road), by item name */
    loot: { name: string; n: number }[];
    /** crates hauled home unopened */
    crates: number;
    raid?: { won: boolean; ruined?: string; gold?: number; essence?: number };
  } | null;
  runsCompleted: number;
}
