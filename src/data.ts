import type { CardDef, ItemDef, EnemyDef, SidekickDef, DestinationDef, BuildingDef } from './types';

export const CARDS: Record<string, CardDef> = {
  strike: { id: 'strike', name: 'Strike', cost: 1, type: 'attack', damage: 6, desc: 'Deal 6 damage.', art: 'card_strike' },
  heavy_strike: { id: 'heavy_strike', name: 'Heavy Strike', cost: 1, type: 'attack', damage: 9, desc: 'Deal 9 damage.', art: 'card_heavy_strike' },
  arrow: { id: 'arrow', name: 'Arrow Shot', cost: 1, type: 'attack', damage: 4, draw: 1, desc: 'Deal 4 damage. Draw 1 card.', art: 'card_arrow' },
  defend: { id: 'defend', name: 'Defend', cost: 1, type: 'skill', block: 5, desc: 'Gain 5 Block.', art: 'card_defend' },
  bulwark: { id: 'bulwark', name: 'Bulwark', cost: 1, type: 'skill', block: 9, desc: 'Gain 9 Block.', art: 'card_bulwark' },
  fireball: { id: 'fireball', name: 'Fireball', cost: 2, type: 'attack', damage: 12, desc: 'Deal 12 fire damage.', art: 'card_fireball' },
  frost_nova: { id: 'frost_nova', name: 'Frost Nova', cost: 1, type: 'attack', damage: 6, weaken: 3, desc: 'Deal 6 damage. Enemy attacks 3 less next turn.', art: 'card_frost' },
  searing_strike: { id: 'searing_strike', name: 'Searing Strike', cost: 1, type: 'attack', damage: 9, breaksItem: true, desc: 'Deal 9 damage. Breaks your Torch — the road home grows dark.', art: 'card_searing' },
  mend: { id: 'mend', name: 'Mend', cost: 1, type: 'skill', heal: 4, desc: 'Heal 4 HP.', art: 'card_mend' },
  sprint: { id: 'sprint', name: 'Sprint', cost: 0, type: 'skill', draw: 2, desc: 'Draw 2 cards.', art: 'card_sprint' },
  minor_heal: { id: 'minor_heal', name: 'Minor Heal', cost: 1, type: 'skill', heal: 3, desc: 'The cleric murmurs. Heal 3 HP.', art: 'card_minor_heal' },
  smite: { id: 'smite', name: 'Smite', cost: 1, type: 'attack', damage: 5, desc: 'The cleric scowls. Deal 5 damage.', art: 'card_smite' },
  brace: { id: 'brace', name: 'Brace', cost: 1, type: 'skill', block: 4, desc: 'The soldier steps in. Gain 4 Block.', art: 'card_brace' },
  shield_bash: { id: 'shield_bash', name: 'Shield Bash', cost: 1, type: 'attack', damage: 3, block: 3, desc: 'Deal 3 damage. Gain 3 Block.', art: 'card_bash' },
  bite: { id: 'bite', name: 'Bite', cost: 1, type: 'attack', damage: 4, desc: 'The hound lunges. Deal 4 damage.', art: 'card_bite' },
  fetch: { id: 'fetch', name: 'Fetch', cost: 0, type: 'skill', draw: 2, desc: 'Good dog. Draw 2 cards.', art: 'card_fetch' },
  junk: { id: 'junk', name: 'Junk', cost: 0, type: 'junk', unplayable: true, desc: 'Dead weight. Worth something back home — worthless here.', art: 'card_junk' },
  cower: { id: 'cower', name: 'Cower in Fear', cost: 0, type: 'junk', unplayable: true, desc: 'The pack mule is panicking. Unplayable.', art: 'card_cower' },
};

export const ITEMS: Record<string, ItemDef> = {
  // ---- gear ----
  simple_sword: { id: 'simple_sword', name: 'Simple Sword', kind: 'gear', w: 1, h: 3, cards: ['strike', 'strike', 'strike'], desc: 'Adds 3× Strike to your deck.', art: 'item_sword' },
  iron_sword: { id: 'iron_sword', name: 'Iron Sword', kind: 'gear', w: 1, h: 3, cards: ['heavy_strike', 'heavy_strike', 'heavy_strike'], desc: 'Adds 3× Heavy Strike to your deck.', art: 'item_iron_sword' },
  worn_shield: { id: 'worn_shield', name: 'Worn Shield', kind: 'gear', w: 2, h: 2, cards: ['defend', 'defend'], desc: 'Adds 2× Defend to your deck.', art: 'item_shield' },
  tower_shield: { id: 'tower_shield', name: 'Tower Shield', kind: 'gear', w: 2, h: 2, cards: ['bulwark', 'bulwark'], desc: 'Adds 2× Bulwark to your deck.', art: 'item_tower_shield' },
  hunter_badge: { id: 'hunter_badge', name: 'Hunter Badge', kind: 'gear', w: 1, h: 1, cards: ['arrow', 'arrow'], desc: 'Adds 2× Arrow Shot to your deck.', art: 'item_hunter_badge' },
  deer_badge: { id: 'deer_badge', name: 'Deer Badge', kind: 'gear', w: 1, h: 1, cards: ['sprint'], desc: 'Adds 1× Sprint to your deck.', art: 'item_deer_badge' },
  fire_runestone: { id: 'fire_runestone', name: 'Fire Runestone', kind: 'gear', w: 1, h: 1, cards: ['fireball'], desc: 'Adds 1× Fireball to your deck.', art: 'item_fire_rune' },
  frost_runestone: { id: 'frost_runestone', name: 'Frost Runestone', kind: 'gear', w: 1, h: 1, cards: ['frost_nova'], desc: 'Adds 1× Frost Nova to your deck.', art: 'item_frost_rune' },
  torch: { id: 'torch', name: 'Torch', kind: 'gear', w: 1, h: 1, cards: ['searing_strike'], light: true, desc: 'Lights the road home (less corruption). Can be swung — once.', art: 'item_torch' },
  healing_herbs: { id: 'healing_herbs', name: 'Healing Herbs', kind: 'gear', w: 1, h: 1, cards: ['mend'], desc: 'Adds 1× Mend to your deck.', art: 'item_herbs' },
  // ---- loot ----
  coin_bag: { id: 'coin_bag', name: 'Bag of Coins', kind: 'loot', w: 1, h: 1, junk: 1, gold: 15, desc: '15 gold. Adds 1 Junk card while carried.', art: 'item_coin_bag' },
  chalice: { id: 'chalice', name: 'Golden Chalice', kind: 'loot', w: 1, h: 2, junk: 2, gold: 35, desc: '35 gold. Adds 2 Junk cards while carried.', art: 'item_chalice' },
  small_chest: { id: 'small_chest', name: 'Small Chest', kind: 'loot', w: 2, h: 2, junk: 3, gold: 70, desc: '70 gold. Adds 3 Junk cards while carried.', art: 'item_chest' },
  ancient_herbs: { id: 'ancient_herbs', name: 'Ancient Herbs', kind: 'loot', w: 1, h: 1, junk: 1, gold: 20, desc: '20 gold. Adds 1 Junk card while carried.', art: 'item_ancient_herbs' },
  wood_bundle: { id: 'wood_bundle', name: 'Wood Bundle', kind: 'loot', w: 2, h: 1, junk: 1, wood: 8, desc: '8 wood. Adds 1 Junk card while carried.', art: 'item_wood' },
  stone_block: { id: 'stone_block', name: 'Stone Block', kind: 'loot', w: 2, h: 1, junk: 1, stone: 6, desc: '6 stone. Adds 1 Junk card while carried.', art: 'item_stone' },
};

export const ENEMIES: Record<string, EnemyDef> = {
  slime: {
    id: 'slime', name: 'Blue Slime', hp: 14, art: 'enemy_slime',
    pattern: [{ kind: 'attack', value: 5 }, { kind: 'attack', value: 6 }, { kind: 'block', value: 4 }],
  },
  wolf: {
    id: 'wolf', name: 'Forest Wolf', hp: 16, art: 'enemy_wolf',
    pattern: [{ kind: 'attack', value: 7 }, { kind: 'attack', value: 3 }],
  },
  goblin: {
    id: 'goblin', name: 'Goblin Scout', hp: 18, art: 'enemy_goblin',
    pattern: [{ kind: 'attack', value: 6 }, { kind: 'block', value: 5 }, { kind: 'attack', value: 4 }],
  },
  shade: {
    id: 'shade', name: 'Night Shade', hp: 24, art: 'enemy_shade',
    pattern: [{ kind: 'attack', value: 8 }, { kind: 'attack', value: 10 }],
  },
  brute: {
    id: 'brute', name: 'Goblin Brute', hp: 32, art: 'enemy_brute',
    pattern: [{ kind: 'attack', value: 9 }, { kind: 'block', value: 6 }, { kind: 'attack', value: 11 }],
  },
  treant: {
    id: 'treant', name: 'Corrupted Treant', hp: 38, art: 'enemy_treant',
    pattern: [{ kind: 'attack', value: 10 }, { kind: 'block', value: 8 }, { kind: 'attack', value: 12 }],
  },
};

export const SIDEKICKS: Record<string, SidekickDef> = {
  cleric: { id: 'cleric', name: 'Cleric', cost: 12, desc: '2× Minor Heal, 1× Smite', art: 'side_cleric', cards: ['minor_heal', 'minor_heal', 'smite'] },
  soldier: { id: 'soldier', name: 'Soldier', cost: 10, desc: '2× Brace, 1× Shield Bash', art: 'side_soldier', cards: ['brace', 'brace', 'shield_bash'] },
  hound: { id: 'hound', name: 'Hound', cost: 8, desc: '2× Bite, 1× Fetch', art: 'side_hound', cards: ['bite', 'bite', 'fetch'] },
};

export const MULE_COST = 6;
export const MULE_CURSES = 2; // Cower in Fear cards while hired
export const MULE_GRID = { w: 3, h: 3 };
export const PACK_GRID = { w: 5, h: 4 };
export const BASE_DAY_TICKS = 12; // dusk at 12, night at 15
export const DUSK_TICKS = 3;
export const CORRUPTION_DAY = 0.25;
export const CORRUPTION_NIGHT = 0.45;
export const TORCH_CORRUPTION_BONUS = 0.1; // subtracted while carrying a lit torch
export const NIGHT_MULT = 1.4;

export const DESTINATIONS: Record<string, DestinationDef> = {
  woods: {
    id: 'woods',
    name: 'Whispering Woods',
    desc: 'Low stakes. Wood, herbs, the occasional wolf. A sensible place.',
    art: 'dest_woods',
    length: 5,
    weights: { combat: 3, gather: 4, event: 2, treasure: 1 },
    enemies: ['slime', 'wolf'],
    nightEnemies: ['shade', 'wolf'],
    elites: ['treant'],
    lootTable: [
      { itemId: 'coin_bag', weight: 5 },
      { itemId: 'ancient_herbs', weight: 3 },
      { itemId: 'chalice', weight: 1 },
    ],
    gatherTable: [
      { itemId: 'wood_bundle', weight: 5 },
      { itemId: 'ancient_herbs', weight: 2 },
      { itemId: 'stone_block', weight: 1 },
    ],
    eliteReward: 'chalice',
  },
  dungeon: {
    id: 'dungeon',
    name: 'Broken Tower',
    desc: 'High stakes. Gold and goblins, and something big at the top.',
    art: 'dest_dungeon',
    length: 6,
    weights: { combat: 5, event: 2, treasure: 2, gather: 1 },
    finale: 'elite',
    enemies: ['goblin', 'slime'],
    nightEnemies: ['shade', 'goblin'],
    elites: ['brute'],
    lootTable: [
      { itemId: 'coin_bag', weight: 4 },
      { itemId: 'chalice', weight: 3 },
      { itemId: 'small_chest', weight: 1 },
    ],
    gatherTable: [
      { itemId: 'stone_block', weight: 5 },
      { itemId: 'coin_bag', weight: 2 },
    ],
    eliteReward: 'small_chest',
  },
};

export const BUILDINGS: Record<string, BuildingDef> = {
  blacksmith: {
    id: 'blacksmith', name: 'Blacksmith', art: 'bld_blacksmith',
    desc: 'Forges an Iron Sword and a Tower Shield into your stash.',
    costGold: 40, costWood: 15, costStone: 0,
    unlocks: ['iron_sword', 'tower_shield'],
  },
  apothecary: {
    id: 'apothecary', name: 'Apothecary', art: 'bld_apothecary',
    desc: 'Adds a Frost Runestone and extra Healing Herbs to your stash.',
    costGold: 30, costWood: 10, costStone: 0,
    unlocks: ['frost_runestone', 'healing_herbs'],
  },
  watchtower: {
    id: 'watchtower', name: 'Watchtower', art: 'bld_watchtower',
    desc: 'Scouts buy you time: +3 ticks of daylight on every expedition.',
    costGold: 25, costWood: 5, costStone: 10,
    daylight: 3,
  },
};

export const STARTING_STASH = ['simple_sword', 'worn_shield', 'torch', 'healing_herbs', 'deer_badge', 'hunter_badge', 'fire_runestone'];
export const STARTING_GOLD = 25;
export const MAX_HP = 50;
