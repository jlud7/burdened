export type CardType = 'attack' | 'skill' | 'junk';

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
  unplayable?: boolean;
  /** playing this card destroys the granting item (e.g. Torch) */
  breaksItem?: boolean;
}

export type ItemKind = 'gear' | 'loot';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  w: number;
  h: number;
  desc: string;
  art: string;
  /** card ids granted while equipped (gear only) */
  cards?: string[];
  /** junk cards added to the deck while carried (loot only) */
  junk?: number;
  gold?: number;
  wood?: number;
  stone?: number;
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
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  art: string;
  /** repeating intent pattern */
  pattern: { kind: 'attack' | 'block'; value: number }[];
}

export interface SidekickDef {
  id: string;
  name: string;
  cost: number;
  desc: string;
  art: string;
  cards: string[];
}

export type NodeType = 'combat' | 'elite' | 'gather' | 'event' | 'treasure';

export interface MapNode {
  type: NodeType;
  cleared: boolean;
  /** set when a cleared node corrupts on the way home */
  corrupted: boolean;
}

export interface DestinationDef {
  id: string;
  name: string;
  desc: string;
  art: string;
  length: number;
  /** weights for node generation */
  weights: Partial<Record<NodeType, number>>;
  /** force the final node's type */
  finale?: NodeType;
  enemies: string[];
  nightEnemies: string[];
  elites: string[];
  lootTable: { itemId: string; weight: number }[];
  gatherTable: { itemId: string; weight: number }[];
  /** guaranteed drop from elites / corrupted nodes */
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
  /** extra ticks of daylight */
  daylight?: number;
}

export type Screen = 'village' | 'map' | 'combat' | 'summary';

export type TimePhase = 'day' | 'dusk' | 'night';

export interface CombatCard {
  uid: number;
  defId: string;
  /** uid of the granting item, for breaksItem */
  sourceUid?: number;
}

export interface CombatState {
  enemyId: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemyBlock: number;
  enemyWeak: number;
  patternIdx: number;
  /** night/corruption multiplier already applied to hp; applied to attacks via this */
  enemyAtkBonus: number;
  draw: CombatCard[];
  hand: CombatCard[];
  discard: CombatCard[];
  energy: number;
  maxEnergy: number;
  playerBlock: number;
  turn: number;
  over: boolean;
}

export interface Expedition {
  destId: string;
  nodes: MapNode[];
  /** index into nodes; -1 = village edge */
  pos: number;
  returning: boolean;
  ticks: number;
  /** items picked up this run (uids), for the summary */
  lootedUids: number[];
  mule: boolean;
  sidekickId: string | null;
  /** pending node to resolve at current position */
  pendingNode: number | null;
}

export interface GameState {
  screen: Screen;
  hp: number;
  maxHp: number;
  resources: { gold: number; wood: number; stone: number };
  buildings: Record<string, boolean>;
  items: ItemInstance[];
  nextUid: number;
  expedition: Expedition | null;
  combat: CombatState | null;
  /** results of the last run, for the summary screen */
  lastRun: { survived: boolean; gold: number; wood: number; stone: number; nights: boolean } | null;
  runsCompleted: number;
}
