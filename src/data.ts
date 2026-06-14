import type { CardDef, ItemDef, EnemyDef, SidekickDef, DestinationDef, BuildingDef } from './types';

export const CARDS: Record<string, CardDef> = {
  // ---- the naked base deck (GDD v3 §2) ----
  bash: { id: 'bash', name: 'Bash', cost: 1, type: 'attack', damage: 4, desc: 'Deal 4 damage.', art: 'card_bash_basic' },
  block: { id: 'block', name: 'Block', cost: 1, type: 'skill', block: 3, desc: 'Gain 3 Block.', art: 'card_block' },
  focus: { id: 'focus', name: 'Focus', cost: 0, type: 'skill', gainEnergy: 1, desc: 'Gain 1 Energy.', art: 'card_focus' },
  // ---- badge transforms ----
  firebolt: { id: 'firebolt', name: 'Firebolt', cost: 1, type: 'attack', damage: 3, burn: 1, desc: 'Deal 3 damage. Apply 1 Burn.', art: 'card_firebolt' },
  shoot_arrow: { id: 'shoot_arrow', name: 'Shoot Arrow', cost: 1, type: 'attack', damage: 4, arrow: true, desc: 'Deal 4 damage. Every 3rd arrow crits.', art: 'card_shoot_arrow' },
  // ---- gear cards ----
  strike: { id: 'strike', name: 'Strike', cost: 1, type: 'attack', damage: 6, desc: 'Deal 6 damage.', art: 'card_strike' },
  heavy_strike: { id: 'heavy_strike', name: 'Heavy Strike', cost: 1, type: 'attack', damage: 9, desc: 'Deal 9 damage.', art: 'card_heavy_strike' },
  smash: { id: 'smash', name: 'Smash', cost: 2, type: 'attack', damage: 8, desc: 'Deal 8 damage.', art: 'card_smash' },
  arrow: { id: 'arrow', name: 'Arrow Shot', cost: 1, type: 'attack', damage: 4, draw: 1, arrow: true, desc: 'Deal 4 damage. Draw 1 card.', art: 'card_arrow' },
  defend: { id: 'defend', name: 'Defend', cost: 1, type: 'skill', block: 5, desc: 'Gain 5 Block.', art: 'card_defend' },
  deflect: { id: 'deflect', name: 'Deflect', cost: 1, type: 'skill', block: 6, desc: 'Gain 6 Block.', art: 'card_deflect' },
  bulwark: { id: 'bulwark', name: 'Bulwark', cost: 1, type: 'skill', block: 9, desc: 'Gain 9 Block.', art: 'card_bulwark' },
  fireball: { id: 'fireball', name: 'Fireball', cost: 2, type: 'attack', damage: 12, desc: 'Deal 12 fire damage.', art: 'card_fireball' },
  frost_nova: { id: 'frost_nova', name: 'Frost Nova', cost: 1, type: 'attack', damage: 6, weaken: 3, desc: 'Deal 6 damage. Enemy attacks 3 less next turn.', art: 'card_frost' },
  dark_blast: { id: 'dark_blast', name: 'Dark Blast', cost: 1, type: 'attack', damage: 6, blind: 1, desc: 'Deal 6 damage. Blind: its next attack misses.', art: 'card_dark_blast' },
  searing_strike: { id: 'searing_strike', name: 'Searing Strike', cost: 1, type: 'attack', damage: 9, breaksItem: true, desc: 'Deal 9 damage. Breaks your Torch — the road home grows dark.', art: 'card_searing' },
  bone_stab: { id: 'bone_stab', name: 'Sharp Bone', cost: 0, type: 'attack', damage: 4, bleed: 1, desc: 'Deal 4 damage. Apply 1 Bleed.', art: 'card_bone' },
  mend: { id: 'mend', name: 'Mend', cost: 1, type: 'skill', heal: 4, desc: 'Heal 4 HP.', art: 'card_mend' },
  sprint: { id: 'sprint', name: 'Sprint', cost: 0, type: 'skill', draw: 2, desc: 'Draw 2 cards.', art: 'card_sprint' },
  // ---- sidekick & dog cards ----
  minor_heal: { id: 'minor_heal', name: 'Minor Heal', cost: 1, type: 'skill', heal: 3, desc: 'The cleric murmurs. Heal 3 HP.', art: 'card_minor_heal' },
  smite: { id: 'smite', name: 'Smite', cost: 1, type: 'attack', damage: 5, desc: 'The cleric scowls. Deal 5 damage.', art: 'card_smite' },
  brace: { id: 'brace', name: 'Brace', cost: 1, type: 'skill', block: 4, desc: 'The soldier steps in. Gain 4 Block.', art: 'card_brace' },
  shield_bash: { id: 'shield_bash', name: 'Shield Bash', cost: 1, type: 'attack', damage: 3, block: 3, desc: 'Deal 3 damage. Gain 3 Block.', art: 'card_bash' },
  bite: { id: 'bite', name: 'Bite', cost: 1, type: 'attack', damage: 4, desc: 'The dog lunges. Deal 4 damage.', art: 'card_bite' },
  savage_bite: { id: 'savage_bite', name: 'Savage Bite', cost: 1, type: 'attack', damage: 5, bleed: 1, desc: 'Kennel-trained. Deal 5 damage, apply 1 Bleed.', art: 'card_savage_bite' },
  fetch: { id: 'fetch', name: 'Fetch', cost: 0, type: 'skill', draw: 2, desc: 'Good dog. Draw 2 cards.', art: 'card_fetch' },
  // ---- burdens (the fluid encumbrance system, GDD v3 §3) ----
  sluggish: { id: 'sluggish', name: 'Sluggish', cost: 0, type: 'burden', unplayable: true, retain: true, desc: 'Unplayable. Stays in hand, crowding out a draw each turn.', art: 'card_sluggish' },
  heavily_encumbered: { id: 'heavily_encumbered', name: 'Heavily Encumbered', cost: 0, type: 'burden', unplayable: true, onDraw: 'sap', desc: 'Unplayable. When drawn: lose 2 Energy.', art: 'card_heavy_enc' },
  complete_exhaustion: { id: 'complete_exhaustion', name: 'Complete Exhaustion', cost: 0, type: 'burden', unplayable: true, onDraw: 'exhaust', desc: 'Unplayable. When drawn: you cannot play cards this turn.', art: 'card_exhaustion' },
  cower: { id: 'cower', name: 'Cower in Fear', cost: 0, type: 'junk', unplayable: true, desc: 'The pack mule is panicking. Unplayable.', art: 'card_cower' },
  // ---- town cards (village raids, GDD v3 §8) ----
  catapult: { id: 'catapult', name: 'Catapult Volley', cost: 1, type: 'attack', damage: 12, desc: 'The blacksmith mans the war engine. Deal 12 damage.', art: 'card_catapult' },
  militia: { id: 'militia', name: 'Militia Volley', cost: 1, type: 'attack', damage: 4, draw: 1, desc: 'Arrows from the watchtower. Deal 4 damage, draw 1.', art: 'card_militia' },
  field_dressing: { id: 'field_dressing', name: 'Field Dressing', cost: 1, type: 'skill', heal: 6, desc: 'The apothecary patches you up. Heal 6 HP.', art: 'card_dressing' },
  loose_hounds: { id: 'loose_hounds', name: 'Loose the Hounds', cost: 1, type: 'attack', damage: 8, desc: 'The kennel empties. Deal 8 damage.', art: 'card_hounds' },
};

/** the 6-card deck everyone has with nothing equipped */
export const BASE_DECK = ['bash', 'bash', 'block', 'block', 'focus', 'focus'];

export const ITEMS: Record<string, ItemDef> = {
  // ---- gear ----
  simple_sword: { id: 'simple_sword', name: 'Simple Sword', kind: 'gear', w: 1, h: 3, weight: 6, value: 8, cards: ['strike', 'strike', 'strike'], desc: 'Adds 3× Strike to your deck.', art: 'item_sword' },
  iron_sword: { id: 'iron_sword', name: 'Iron Sword', kind: 'gear', w: 1, h: 3, weight: 9, value: 20, cards: ['heavy_strike', 'heavy_strike', 'heavy_strike'], desc: 'Adds 3× Heavy Strike to your deck.', art: 'item_iron_sword' },
  goblin_club: { id: 'goblin_club', name: 'Goblin Club', kind: 'gear', w: 1, h: 2, weight: 5, value: 10, cards: ['smash', 'smash'], desc: 'Crude but heavy. Adds 2× Smash to your deck.', art: 'item_club' },
  worn_shield: { id: 'worn_shield', name: 'Worn Shield', kind: 'gear', w: 2, h: 2, weight: 8, value: 8, cards: ['defend', 'defend'], desc: 'Adds 2× Defend to your deck.', art: 'item_shield' },
  iron_buckler: { id: 'iron_buckler', name: 'Iron Buckler', kind: 'gear', w: 2, h: 2, weight: 6, value: 14, cards: ['deflect', 'deflect'], desc: 'Adds 2× Deflect to your deck.', art: 'item_buckler' },
  tower_shield: { id: 'tower_shield', name: 'Tower Shield', kind: 'gear', w: 2, h: 2, weight: 14, value: 18, cards: ['bulwark', 'bulwark'], desc: 'Adds 2× Bulwark to your deck.', art: 'item_tower_shield' },
  hunter_badge: { id: 'hunter_badge', name: "Hunter's Charm", kind: 'gear', w: 1, h: 1, weight: 1, value: 12, cards: ['arrow', 'arrow'], desc: 'Adds 2× Arrow Shot to your deck.', art: 'item_hunter_badge' },
  deer_badge: { id: 'deer_badge', name: 'Deer Charm', kind: 'gear', w: 1, h: 1, weight: 1, value: 10, cards: ['sprint'], desc: 'Adds 1× Sprint to your deck.', art: 'item_deer_badge' },
  fire_runestone: { id: 'fire_runestone', name: 'Runestone of Fire', kind: 'gear', w: 1, h: 1, weight: 1, value: 15, cards: ['fireball'], desc: 'Adds 1× Fireball to your deck.', art: 'item_fire_rune' },
  frost_runestone: { id: 'frost_runestone', name: 'Runestone of Frost', kind: 'gear', w: 1, h: 1, weight: 1, value: 15, cards: ['frost_nova'], desc: 'Adds 1× Frost Nova to your deck.', art: 'item_frost_rune' },
  dark_runestone: { id: 'dark_runestone', name: 'Runestone of Darkness', kind: 'gear', w: 1, h: 1, weight: 1, value: 18, cards: ['dark_blast'], desc: 'Adds 1× Dark Blast to your deck.', art: 'item_dark_rune' },
  torch: { id: 'torch', name: 'Torch', kind: 'gear', w: 1, h: 1, weight: 2, value: 3, cards: ['searing_strike'], light: true, desc: 'Lights the road home (less corruption). Can be swung — once.', art: 'item_torch' },
  healing_herbs: { id: 'healing_herbs', name: 'Healing Herbs', kind: 'gear', w: 1, h: 1, weight: 1, value: 5, cards: ['mend'], desc: 'Adds 1× Mend to your deck.', art: 'item_herbs' },
  sharp_bone: { id: 'sharp_bone', name: 'Sharp Bone', kind: 'gear', w: 1, h: 1, weight: 1, value: 2, cards: ['bone_stab'], desc: 'What the meat left behind. Adds 1× Sharp Bone (0 cost) to your deck.', art: 'item_bone' },
  // ---- badges: one per run, transform the base deck (GDD v3 §2) ----
  pyro_badge: { id: 'pyro_badge', name: 'Pyromancer Badge', kind: 'badge', w: 1, h: 1, weight: 1, value: 25, badge: { transform: { bash: 'firebolt' } }, desc: 'Badge (max 1): your Bash cards become Firebolt — less damage, applies Burn.', art: 'item_pyro_badge' },
  marksman_badge: { id: 'marksman_badge', name: 'Marksman Badge', kind: 'badge', w: 1, h: 1, weight: 1, value: 25, badge: { transform: { bash: 'shoot_arrow' }, arrowCrit: true }, desc: 'Badge (max 1): Bash becomes Shoot Arrow, and every 3rd arrow crits.', art: 'item_marksman_badge' },
  devout_badge: { id: 'devout_badge', name: 'Devout Badge', kind: 'badge', w: 1, h: 1, weight: 1, value: 25, badge: { healMult: 1.5 }, desc: 'Badge (max 1): all healing from cards and consumables +50%.', art: 'item_devout_badge' },
  // ---- consumables (GDD v3 §6) ----
  apple: {
    id: 'apple', name: 'Apple', kind: 'consumable', w: 1, h: 1, weight: 1, desc: 'Ages as you fight: Fresh → Ripe → Spoiled.', art: 'item_apple',
    stages: [
      { name: 'Fresh', desc: 'Eat: heal 5 HP.', heal: 5 },
      { name: 'Ripe', desc: 'Eat: heal 3 HP, gain 1 Energy.', heal: 3, gainEnergy: 1 },
      { name: 'Spoiled', desc: 'Inedible. Throw in combat: 3 Poison.', throwPoison: 3 },
    ],
  },
  bread: {
    id: 'bread', name: 'Bread', kind: 'consumable', w: 2, h: 1, weight: 2, desc: 'Ages as you fight: Fresh → Stale → Moldy.', art: 'item_bread',
    stages: [
      { name: 'Fresh', desc: 'Eat: heal 8 HP.', heal: 8 },
      { name: 'Stale', desc: 'Eat: heal 4 HP, gain 4 Block.', heal: 4, block: 4 },
      { name: 'Moldy', desc: 'Inedible. Throw in combat: 4 Poison.', throwPoison: 4 },
    ],
  },
  meat: { id: 'meat', name: 'Hunk of Meat', kind: 'consumable', w: 2, h: 2, weight: 4, cookable: true, rawHeal: 3, heal: 10, transformTo: 'sharp_bone', desc: 'Raw: heal 3. Cook at a campfire: heal 10. Leaves a Sharp Bone.', art: 'item_meat' },
  potion_minor: { id: 'potion_minor', name: 'Minor Healing Potion', kind: 'consumable', w: 1, h: 1, weight: 1, heal: 8, value: 6, desc: 'Drink: heal 8 HP.', art: 'item_potion_minor' },
  potion_major: { id: 'potion_major', name: 'Major Elixir', kind: 'consumable', w: 1, h: 1, weight: 2, heal: 16, clearStatuses: true, value: 14, desc: 'Drink: heal 16 HP and clear your debuffs.', art: 'item_potion_major' },
  berries: { id: 'berries', name: 'Vitality Berries', kind: 'consumable', w: 1, h: 1, weight: 1, heal: 3, maxHpBonus: 3, value: 8, desc: 'Eat: heal 3 and gain +3 max HP for this run.', art: 'item_berries' },
  // ---- loot crates: unidentified until the Blacksmith opens them (GDD v3 §5) ----
  ornate_box: { id: 'ornate_box', name: 'Ornate Box', kind: 'crate', w: 2, h: 2, weight: 18, desc: 'Locked and heavy. The Blacksmith can open it back home.', art: 'item_ornate_box' },
  treasure_chest: { id: 'treasure_chest', name: 'Treasure Chest', kind: 'crate', w: 3, h: 2, weight: 30, desc: 'Enormous. Does nothing but wait for extraction — and pay off.', art: 'item_chest' },
  // ---- loot (treasure is HEAVY — that's the whole tension) ----
  coin_bag: { id: 'coin_bag', name: 'Bag of Coins', kind: 'loot', w: 1, h: 1, weight: 6, gold: 15, desc: '15 gold — and the coins weigh on you.', art: 'item_coin_bag' },
  chalice: { id: 'chalice', name: 'Golden Chalice', kind: 'loot', w: 1, h: 2, weight: 9, gold: 35, desc: '35 gold. Solid gold is solid weight.', art: 'item_chalice' },
  small_chest: { id: 'small_chest', name: 'Small Chest', kind: 'loot', w: 2, h: 2, weight: 18, gold: 70, desc: '70 gold in loose valuables — a real haul to lug home.', art: 'item_small_chest' },
  ancient_herbs: { id: 'ancient_herbs', name: 'Ancient Herbs', kind: 'loot', w: 1, h: 1, weight: 2, gold: 20, desc: '20 gold to the right buyer.', art: 'item_ancient_herbs' },
  wood_bundle: { id: 'wood_bundle', name: 'Wood Bundle', kind: 'loot', w: 2, h: 1, weight: 12, wood: 8, desc: '8 wood for the village. Bulky.', art: 'item_wood' },
  stone_block: { id: 'stone_block', name: 'Stone Block', kind: 'loot', w: 2, h: 1, weight: 16, stone: 6, desc: '6 stone for the village. Backbreaking.', art: 'item_stone' },
  essence_vial: { id: 'essence_vial', name: 'Vial of Essence', kind: 'loot', w: 1, h: 1, weight: 2, essence: 3, desc: '3 magic essence — the Kennel trains with it.', art: 'item_essence' },
};

export const ENEMIES: Record<string, EnemyDef> = {
  slime: {
    id: 'slime', name: 'Blue Slime', hp: 16, art: 'enemy_slime',
    pattern: [{ name: 'Tackle', attack: 5 }, { name: 'Squish', attack: 7 }, { name: 'Harden', block: 4 }],
  },
  wolf: {
    id: 'wolf', name: 'Forest Wolf', hp: 18, art: 'enemy_wolf',
    pattern: [{ name: 'Bite', attack: 8 }, { name: 'Claw', attack: 4 }],
  },
  goblin: {
    id: 'goblin', name: 'Goblin Scout', hp: 18, art: 'enemy_goblin',
    pattern: [{ name: 'Stab', attack: 6 }, { name: 'Guard', block: 5 }, { name: 'Swipe', attack: 4 }],
    drop: { itemId: 'goblin_club', chance: 0.35 },
  },
  red_goblin: {
    id: 'red_goblin', name: 'Red Goblin', hp: 14, art: 'enemy_red_goblin',
    pattern: [{ name: 'Frenzy', attack: 3, hits: 2 }, { name: 'Stab', attack: 5 }, { name: 'Frenzy', attack: 3, hits: 2 }],
    drop: { itemId: 'goblin_club', chance: 0.3 },
  },
  shade: {
    id: 'shade', name: 'Night Shade', hp: 24, art: 'enemy_shade',
    pattern: [{ name: 'Drain', attack: 8 }, { name: 'Smother', attack: 10 }],
  },
  night_stalker: {
    id: 'night_stalker', name: 'Night Stalker', hp: 26, art: 'enemy_stalker',
    pattern: [{ name: 'Pounce', attack: 9 }, { name: 'Circle', block: 6 }, { name: 'Rake', attack: 11 }],
    essence: 1,
  },
  brute: {
    id: 'brute', name: 'Goblin Brute', hp: 32, art: 'enemy_brute',
    pattern: [{ name: 'Club', attack: 9 }, { name: 'Guard', block: 6 }, { name: 'Crush', attack: 11 }],
    drop: { itemId: 'iron_buckler', chance: 0.25 },
  },
  treant: {
    id: 'treant', name: 'Corrupted Treant', hp: 38, art: 'enemy_treant', essence: 2,
    pattern: [{ name: 'Lash', attack: 10 }, { name: 'Bark', block: 8 }, { name: 'Slam', attack: 12 }],
  },
  // ---- the Swamps: frog faction (GDD v3 §7) ----
  frog_soldier: {
    id: 'frog_soldier', name: 'Frog Soldier', hp: 17, art: 'enemy_frog_soldier',
    pattern: [{ name: 'Stab', attack: 6 }, { name: 'Guard', block: 6 }, { name: 'Lunge', attack: 5 }],
  },
  hypno_toad: {
    id: 'hypno_toad', name: 'Hypno-Toad', hp: 20, art: 'enemy_hypno_toad',
    pattern: [{ name: 'Hypnotic Croak', status: 'sleep', sValue: 1 }, { name: 'Tongue Lash', attack: 6 }, { name: 'Lick', attack: 4 }],
  },
  stone_frog: {
    id: 'stone_frog', name: 'Stone-Frog Sentry', hp: 42, art: 'enemy_stone_frog', essence: 2,
    pattern: [{ name: 'Mud Sling', attack: 6, status: 'rooted', sValue: 1 }, { name: 'Stone Guard', block: 10 }, { name: 'Boulder Slam', attack: 12 }],
    drop: { itemId: 'dark_runestone', chance: 0.4 },
  },
  king_croak: {
    id: 'king_croak', name: 'King Croak the Fat', hp: 60, art: 'enemy_king_croak', essence: 4,
    pattern: [{ name: 'Gulp', block: 12 }, { name: 'Belly Flop', attack: 14 }, { name: 'Croak of the Deep', attack: 6, status: 'sleep', sValue: 1 }],
    drop: { itemId: 'treasure_chest', chance: 1 },
  },
  // ---- the Overgrowth: snail faction ----
  giant_snail: {
    id: 'giant_snail', name: 'Giant Snail', hp: 22, art: 'enemy_giant_snail',
    pattern: [{ name: 'Shell Barricade', block: 10 }, { name: 'Slam', attack: 8 }],
  },
  acid_snail: {
    id: 'acid_snail', name: 'Acid-Spitter Snail', hp: 16, art: 'enemy_acid_snail',
    pattern: [{ name: 'Acid Spit', attack: 4, status: 'corrosion', sValue: 2 }, { name: 'Ooze', attack: 5 }],
  },
  // ---- raiders (village raids) ----
  warboss: {
    id: 'warboss', name: 'Goblin Warboss', hp: 45, art: 'enemy_warboss', essence: 3,
    pattern: [{ name: 'Warcry', block: 8 }, { name: 'Cleave', attack: 10 }, { name: 'Overrun', attack: 13 }],
  },
};

export const SIDEKICKS: Record<string, SidekickDef> = {
  cleric: { id: 'cleric', name: 'Cleric', cost: 12, hp: 16, desc: '2× Minor Heal, 1× Smite', art: 'side_cleric', cards: ['minor_heal', 'minor_heal', 'smite'] },
  soldier: { id: 'soldier', name: 'Soldier', cost: 10, hp: 24, desc: '2× Brace, 1× Shield Bash', art: 'side_soldier', cards: ['brace', 'brace', 'shield_bash'] },
  hound: { id: 'hound', name: 'Hound', cost: 8, hp: 14, desc: '2× Bite, 1× Fetch', art: 'side_hound', cards: ['bite', 'bite', 'fetch'] },
};

/** the kennel dog's cards by training level */
export const DOG_CARDS: Record<number, string[]> = {
  1: ['bite', 'bite', 'fetch'],
  2: ['savage_bite', 'savage_bite', 'fetch'],
};
export const KENNEL_UPGRADE_ESSENCE = 6;
/** the Kennel dog's HP when it fights as a unit (GDD v4 §7) */
export const DOG_HP = 18;

export const MULE_COST = 6;
export const MULE_CURSES = 2; // Cower in Fear cards while hired
export const MULE_GRID = { w: 3, h: 3 };
export const PACK_GRID = { w: 5, h: 4 };

// ---- the fluid encumbrance system (GDD v3 §3) ----
// capacity 80 (the doc's "e.g. 100" is an example): with a ~20-weight gear
// loadout sitting near 25%, grabbing 2-3 treasures reliably crosses the 50%
// Encumbered line, so the burden tension shows up even in a short first run.
export const MAX_WEIGHT = 80;
export const MULE_WEIGHT_BONUS = 40;
/** thresholds as fractions of capacity; each tier injects 2 of its card while crossed */
export const WEIGHT_TIERS: { at: number; cardId: string; label: string }[] = [
  { at: 0.5, cardId: 'sluggish', label: 'Encumbered' },
  { at: 0.75, cardId: 'heavily_encumbered', label: 'Heavily Encumbered' },
  { at: 1.0, cardId: 'complete_exhaustion', label: 'Overencumbered' },
];
export const BURDEN_COPIES = 2;

export const CORRUPTION_NIGHT = 0.35; // fewer forced ambushes on the way home (was 0.45)
export const TORCH_CORRUPTION_BONUS = 0.12; // a lit torch matters more now
export const NIGHT_MULT = 1.3; // night still bites, but isn't an instant wipe (was 1.4)

// ---- village raids ----
export const RAID_POOL = ['red_goblin', 'goblin', 'brute'];
export const RAID_BOSS = 'warboss';
export const RAID_CHANCE_PER_HEAT = 0.12;
export const RAID_CHANCE_CAP = 0.6;

/** what the Blacksmith finds inside a crate */
export type CrateResult =
  | { kind: 'gold'; min: number; max: number; weight: number }
  | { kind: 'essence'; min: number; max: number; weight: number }
  | { kind: 'badge'; weight: number }
  | { kind: 'item'; itemId: string; weight: number };

export const CRATE_TABLES: Record<string, CrateResult[]> = {
  ornate_box: [
    { kind: 'gold', min: 40, max: 70, weight: 4 },
    { kind: 'essence', min: 4, max: 6, weight: 2 },
    { kind: 'badge', weight: 2 },
    { kind: 'item', itemId: 'dark_runestone', weight: 1 },
    { kind: 'item', itemId: 'iron_buckler', weight: 1 },
    { kind: 'item', itemId: 'potion_major', weight: 1 },
  ],
  treasure_chest: [
    { kind: 'gold', min: 90, max: 150, weight: 4 },
    { kind: 'essence', min: 7, max: 10, weight: 2 },
    { kind: 'badge', weight: 3 },
    { kind: 'item', itemId: 'iron_sword', weight: 1 },
    { kind: 'item', itemId: 'tower_shield', weight: 1 },
  ],
};
/** badges a crate can yield (ones you don't own yet are preferred) */
export const CRATE_BADGES = ['marksman_badge', 'devout_badge', 'pyro_badge'];

export const DESTINATIONS: Record<string, DestinationDef> = {
  woods: {
    id: 'woods',
    name: 'Whispering Woods',
    desc: 'Low stakes. Wood, herbs, the occasional wolf. A sensible place.',
    art: 'dest_woods',
    length: 5,
    weights: { combat: 3, gather: 4, event: 2, treasure: 1, campfire: 1 },
    enemies: ['slime', 'wolf'],
    nightEnemies: ['shade', 'night_stalker', 'wolf'],
    elites: ['treant'],
    lootTable: [
      { itemId: 'coin_bag', weight: 4 },
      { itemId: 'chalice', weight: 3 },
      { itemId: 'ancient_herbs', weight: 2 },
      { itemId: 'apple', weight: 2 },
      { itemId: 'bread', weight: 1 },
      { itemId: 'small_chest', weight: 1 },
    ],
    gatherTable: [
      { itemId: 'wood_bundle', weight: 4 },
      { itemId: 'stone_block', weight: 2 },
      { itemId: 'ancient_herbs', weight: 2 },
      { itemId: 'apple', weight: 1 },
      { itemId: 'berries', weight: 1 },
    ],
    eliteReward: 'ornate_box',
  },
  dungeon: {
    id: 'dungeon',
    name: 'Broken Tower',
    desc: 'High stakes. Gold and goblins, and something big at the top.',
    art: 'dest_dungeon',
    length: 6,
    weights: { combat: 5, event: 2, treasure: 2, gather: 1, campfire: 1 },
    finale: 'elite',
    enemies: ['goblin', 'red_goblin', 'slime'],
    nightEnemies: ['shade', 'night_stalker', 'red_goblin'],
    elites: ['brute'],
    lootTable: [
      { itemId: 'coin_bag', weight: 4 },
      { itemId: 'chalice', weight: 3 },
      { itemId: 'potion_minor', weight: 2 },
      { itemId: 'small_chest', weight: 1 },
      { itemId: 'ornate_box', weight: 1 },
    ],
    gatherTable: [
      { itemId: 'stone_block', weight: 5 },
      { itemId: 'coin_bag', weight: 2 },
      { itemId: 'bread', weight: 2 },
      { itemId: 'potion_minor', weight: 1 },
    ],
    eliteReward: 'treasure_chest',
  },
  swamp: {
    id: 'swamp',
    name: 'Sunken Fen',
    desc: 'The frog domain. Essence and meat — and King Croak at the bottom.',
    art: 'dest_swamp',
    length: 6,
    weights: { combat: 5, gather: 2, event: 2, treasure: 1, campfire: 1 },
    finale: 'elite',
    finaleBoss: 'king_croak',
    enemies: ['frog_soldier', 'hypno_toad', 'giant_snail', 'acid_snail'],
    nightEnemies: ['night_stalker', 'hypno_toad', 'shade'],
    elites: ['stone_frog'],
    lootTable: [
      { itemId: 'coin_bag', weight: 4 },
      { itemId: 'essence_vial', weight: 3 },
      { itemId: 'meat', weight: 2 },
      { itemId: 'chalice', weight: 2 },
      { itemId: 'apple', weight: 1 },
    ],
    gatherTable: [
      { itemId: 'meat', weight: 3 },
      { itemId: 'essence_vial', weight: 3 },
      { itemId: 'wood_bundle', weight: 2 },
      { itemId: 'berries', weight: 1 },
      { itemId: 'bread', weight: 1 },
    ],
    eliteReward: 'ornate_box',
  },
};

export const BUILDINGS: Record<string, BuildingDef> = {
  blacksmith: {
    id: 'blacksmith', name: 'Blacksmith', art: 'bld_blacksmith',
    desc: 'Forges an Iron Sword and Tower Shield — and cracks open extracted Loot Crates.',
    costGold: 40, costWood: 15, costStone: 0,
    unlocks: ['iron_sword', 'tower_shield'],
    opensCrates: true,
    townCard: 'catapult',
  },
  apothecary: {
    id: 'apothecary', name: 'Apothecary', art: 'bld_apothecary',
    desc: 'Stocks a Runestone of Frost and potions; sells Minor Healing Potions.',
    costGold: 30, costWood: 10, costStone: 0,
    unlocks: ['frost_runestone', 'potion_minor', 'potion_minor'],
    shop: { itemId: 'potion_minor', price: 10 },
    townCard: 'field_dressing',
  },
  watchtower: {
    id: 'watchtower', name: 'Watchtower', art: 'bld_watchtower',
    desc: 'Scouts chart the land: every node on the expedition map is identified.',
    costGold: 25, costWood: 5, costStone: 10,
    scouts: true,
    townCard: 'militia',
  },
  kennel: {
    id: 'kennel', name: 'Kennel', art: 'bld_kennel',
    desc: 'A loyal dog joins every expedition free (2× Bite, 1× Fetch). Train it with essence.',
    costGold: 20, costWood: 10, costStone: 0,
    dog: true,
    townCard: 'loose_hounds',
  },
};

export const STARTING_STASH = ['simple_sword', 'worn_shield', 'torch', 'healing_herbs', 'pyro_badge', 'fire_runestone', 'apple', 'potion_minor'];
export const STARTING_GOLD = 25;
export const MAX_HP = 50;
