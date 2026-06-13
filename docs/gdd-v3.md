# Wanderer's Burden — GDD v3 (June 2026) — AUTHORITATIVE

Markdown capture of `Wanderers_Burden_GDD_v2.docx` (kept out of the repo). The
docx is *named* v2 but is chronologically the **third** design document:

1. `design-doc.rtf` → [design-doc.md](design-doc.md) — original concept
2. `Wanderers_Burden_GDD.docx` → [gdd-v2.md](gdd-v2.md) — second pass
3. `Wanderers_Burden_GDD_v2.docx` → **this file** — current authority

Where the documents disagree, **this one wins**.

## 1. Core concept & genre

2D roguelite deckbuilder / extraction survival RPG. Clean minimalist 2D vector
art with a distressed, risograph-like print texture; muted earthy palette;
flat side-scrolling presentation.

**USP:** a fluid **Weight & Encumbrance** deckbuilding mechanic. Loot and
equipment have weight values; carrying too much dynamically injects
debilitating Burden cards into the combat deck. Balance the greed of
extracting heavy, unidentified Loot Crates against survival.

## 2. Classless deckbuilding: base deck & equipment

**The naked base deck** (0 equipment) — 6 cards:

- 2× **Bash** — cost 1, deal 4 damage
- 2× **Block** — cost 1, gain 3 Block
- 2× **Focus** — cost 0, gain 1 Energy

**Equipment & runestones add cards** while slotted in the grid:

- Goblin Club → 2× **Smash** (deal 8, high energy cost)
- Runestone of Darkness → 1× **Dark Blast** (magic attack, Blinds 1 turn)
- Runestone of Fire → 1× **Fireball** (12 fire damage)
- Iron Buckler → 2× **Deflect** (gain 6 Block)

**Badges (class modifiers)** — exactly **one** Badge per run. Badges never
bloat the deck; they transform the base deck or grant run-defining passives:

- **Pyromancer Badge** — 2× Bash become 2× **Firebolt** (low damage, applies 1 Burn)
- **Marksman Badge** — Bash becomes **Shoot Arrow** (ranged); passive: every
  3rd arrow critical hits
- **Devout Badge** — all healing from cards and consumables +50%

## 3. The fluid encumbrance system (weight thresholds)

Every item has a **Weight Value** (Apple = 1, Club = 5, Treasure Chest = 30).
Max capacity ~100. Crossing thresholds dynamically injects negative cards;
dropping or consuming an item **instantly** removes that weight and pulls the
cards back out — fully fluid, even mid-combat.

| Load | Tier | Injected cards |
|---|---|---|
| 0–49% | Light | none |
| 50–74% | Encumbered | 2× **Sluggish** (unplayable, Retain, hand size −1) |
| 75–99% | Heavily Encumbered | 2× **Heavily Encumbered** (on draw: lose 2 Energy) |
| 100%+ | Overencumbered | 2× **Complete Exhaustion** (on draw: skip this turn) |

*Counter-play:* open the inventory to drop heavy items (permanently lost) or
eat food / drink potions to dip below a threshold.

## 4. Map traversal: branching paths & extraction

Branching, Slay-the-Spire-style node map with route agency:

- **Combat** — standard encounters
- **Elite** — harder, high-value drops
- **Forage/Loot** — free resources or item pickups
- **"?" Event** — text scenarios with choices (e.g. *a beggar asks for food:
  give an Apple for a random Runestone, or ignore?*)
- **Campfire** — rest to heal, or upgrade a consumable (e.g. cure raw meat)

**The extraction twist:** reaching the end of the map — or turning back early
— flips **Day to Night**. The player walks home back through the nodes;
night spawns corrupted enemies and stalkers, making the loaded return trip
the most dangerous part of the game.

## 5. Loot types & rewards

- **Meta materials** — Stone, Wood, Magic Essence (low weight) for village upgrades
- **Coins** — merchant gold; the weight adds up
- **Equipment & consumables** — enemy drops (a Goblin can drop its Club or a
  potion); equip mid-run for the cards, or haul home to sell/store
- **Loot Crates (unidentified)** — heavy, bulky (Treasure Chest, Ornate Box).
  Cannot be opened in the field; the **Blacksmith** opens them at the Hub for
  high-tier loot, badges, or big currency payouts

## 6. Consumables & healing

- **Standard**: Minor Healing Potion, Major Elixir, Vitality Berries
- **Aging** (ages per battle fought):
  - Apple: Fresh (heal 5) → Ripe (heal 3, +1 Energy) → Spoiled (throw: Poison)
  - Bread: Fresh (heal 8) → Stale (heal 4, +4 Block) → Moldy (throw: Poison)
- **Transforming**: Hunk of Meat — eat to heal 10; the item then becomes a
  **Sharp Bone** (grants a 0-cost attack: deal 4, apply 1 Bleed)

## 7. Bestiary

- **The Swamps (Frog faction)**: Frog Soldier (basic), Hypno-Toad (Sleep
  debuff), Elite Stone-Frog Sentry (high armor, applies Rooted)
- **The Overgrowth (Snail faction)**: Giant Snail (high Block), Acid-Spitter
  Snail (Corrosion weakens Block)
- **Goblin Raiders**: Red Goblin (fast, numerical advantage); chance to drop
  Goblin Clubs

## 8. Meta-progression & town defense

The Hub Village: extracted wood/stone/essence upgrade buildings. The
**Blacksmith** decodes extracted Loot Crates. The **Kennel** manages the Dog
companion's upgrades.

**Village Raids**: returning with high heat/danger can trigger a tower-defense
raid on the village. The player fights alongside **Town Cards** (e.g.
Catapult Volley) unlocked via meta-progression. Ruined buildings must be
repaired with resources — progression is never wiped.

## 9. MVP roadmap (from the doc)

1. ✅ Core engine: Slay-the-Spire node map + turn-based combat loop
2. Base deck & badges: 6-card base deck; Pyromancer Badge as the transform test
3. Grid & weight: 100 max weight; threshold logic
   (`if weight >= 75%: insert Heavily Encumbered`), re-evaluated dynamically
   on drop/consume
4. Enemy drops & loot crates: Goblin drops Club → slot for 2× Smash; Heavy
   Chest (30 weight) that does nothing but wait for extraction
5. Extraction phase: **Turn Back** reverses traversal and buffs enemies
   (Nighttime mode)

## Implementation notes (engine decisions, not in the docx)

- Threshold cards are **cumulative**: at 80% load the deck holds 2× Sluggish
  *and* 2× Heavily Encumbered; each tier's pair is removed the instant the
  load drops below its threshold.
- Night is **state-driven** (returning ⇒ night, finale ⇒ dusk) rather than
  tick-driven; the doc's "Day turns to Night" on turning back is literal.
- Corrupted-node fights on the return leg draw from the destination's night
  pool — that pool *is* the "corrupted enemies and stalkers".
