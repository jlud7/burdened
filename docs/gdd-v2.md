# Wanderer's Burden — GDD v2 (June 2026)

Markdown capture of `Wanderers_Burden_GDD.docx` (kept out of the repo). This
supersedes [design-doc.md](design-doc.md) where they differ; the live game
("Burdened") implements the v1 core loop and is converging on this plan.

## Core concept

2D roguelite deckbuilder / extraction survival RPG. A young boy and his loyal
brown dog explore procedurally generated nodes, battle mutated fauna, and haul
loot home in a grid-based inventory. Minimalist vector art, risograph-like
grain, muted earthy palette, code-driven juice.

**USP:** treasure takes up grid space *and* pollutes the combat deck with
Burden cards. Greed vs. nighttime extraction with a bloated deck.

## Loop

Prepare (grid = deck) → Deploy (macro map) → Explore by day → Extract at
nightfall (harder enemies, corrupting nodes) → Upgrade the Hub Village.

## Classless deckbuilding

- **The Boy** provides ~2/3 of the deck from his grid inventory.
- **The Dog** provides ~1/3: utility/support cards (Bite, Distract, Fetch
  Item). Progresses at the **Kennel** (collars, upgraded canine cards).
- **Badges (class replacement)** — 1×1 items that *modify* rather than add:
  - *Devout Badge*: all healing +50%.
  - *Marksman's Badge*: transforms basic Slash cards into Shoot Arrow; adds
    signature card **Bullseye** (guaranteed crit).
  - *Apprentice Badge*: Runestone cards 25% chance to cost 1 instead of 2.
- **Dual-purpose items** — Torch lights the macro-map to *reveal node types*;
  playable once as Searing Strike (burn), shattering it (map goes dark).

## Encumbrance v2 — active Burden cards

Loot is no longer inert junk; while in hand it hurts you passively, and can be
*played* as a desperate measure that sacrifices extraction value:

| Loot | Size | Passive (in hand) | Active (play it) |
|---|---|---|---|
| Treasure Chest | 3×2 | other cards cost +1 energy | massive Block; 75% chance the chest breaks, loot lost |
| Gemstones / Chalice | 1×2 | on draw, discard top of draw pile | Blind enemy 1 turn; loot consumed |
| Sack of Coins | 1×1 | −1 max energy this turn | Throw Coins: deal X damage, lose X extracted gold |

## Consumables

- Healing: Minor Potion, Major Elixir (clears debuffs), Vitality Berries
  (temp max HP), Pear of Strength (damage buff), Meal of Recovery (campfire
  only), Linen Bandages (fuel Mend Wound), Healing Fruit (once per battle).
- **Aging**: Apple 1×1 (Fresh heal 5 → Ripe heal 3 +1 energy → Spoiled: throw,
  poison). Bread 2×1 (Fresh 8 → Stale 4 + 4 Block → Moldy: throw, poison).
  Ages by battles fought.
- **Transforming**: Hunk of Meat 2×2 (eat: heal 10) → becomes **Sharp Bone**
  for the rest of the run (4 damage + Bleed).
- Runestones (1×1): Fire (Fireball 12), Earth (Earth Spike 10 + Rooted),
  Light (Healing Light 6).

## Status effects

Poison (DoT, decays), Rooted (no movement cards, evasion 0), Sleep/Stun (skip
turn or start with 0 energy), Corrosion (Block −50% / armor durability),
Slime/Sticky (cards +1 cost this turn), Bleed (damage per card played).

## Bestiary

- **Frog Faction (swamps)**: Frog Soldier (Stab/Guard), Hypno-Toad (fills deck
  with Drowsy cards → Sleep if not discarded), Elite Stone-Frog Sentry (armor,
  Mud Sling → Rooted), **King Croak the Fat** (boss — throws his own loot at
  you; surviving it puts that loot in your grid mid-fight).
- **Snail Faction (overgrowth)**: Giant Snail (Shell Barricade), Acid-Spitter
  (Corrosion), Slime Trapper (Sticky trails).
- **Misc**: Red Goblin (fast, swarms, throws its own loot to become
  unencumbered).

## Meta-progression

Blacksmith (gear), **Kennel** (dog), more. **Surprise Village Raids**:
extraction can drag a threat home → 3-wave tower defense where your deck is
supplemented by **Town Cards** from upgrades (Catapult Strike, Militia
Volley). Losing ruins buildings (repair = resource sink), never wipes
progression.

## MVP build order (from the doc)

1. ✅ Core engine: turn loop, draw/discard, energy, grid inventory → deck
2. Dog familiar providing the 1/3 utility cards (Kennel progression)
3. Badge system — Devout Badge passive as the test case
4. Debuff enemies — Frog Soldier, Acid-Spitter Snail (Corrosion)
5. Active/passive encumbrance — Sack of Coins first
6. Consumable transformation — Meat → Sharp Bone
7. UI: statuses visible alongside grid/hand/piles/HP/energy
