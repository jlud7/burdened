# BURDENED

*A roguelite deckbuilder crossed with an extraction survival game.*

Your gear **is** your deck — arrange items in a grid-based pack and every sword, shield and runestone adds its cards to your draw pile. But so does your greed: every item has a **weight**, and as your pack fills past 50/75/100% capacity, debilitating **Burden** cards flood your deck — and vanish the instant you drop or eat enough to dip back under. Get in, get loot, and carry it home through the **night** that falls when you turn back, while the road corrupts behind you.

Full concept: [docs/gdd-v3.md](docs/gdd-v3.md) (the current design authority) · earlier passes: [gdd-v2](docs/gdd-v2.md), [design-doc](docs/design-doc.md)

## Play it

**▶ [jlud7.github.io/burdened](https://jlud7.github.io/burdened/)** (deployed from `main` on every push)

```sh
npm install
npm run dev      # → http://localhost:5173
```

Built with Vite + TypeScript, no runtime dependencies. (The GDD calls for minimalist 2D vector art with code-driven juice — a DOM/CSS renderer fits that better than a 3D engine, and keeps the UI-heavy parts — grid inventory, cards, tooltips — trivial to iterate on.)

## What's in the build

The full GDD v3 loop:

- **Classless deckbuilding from a naked base deck** — everyone starts with 6 cards (2× Bash, 2× Block, 2× Focus). A 5×4 pack grid adds cards on top: Simple Sword → 3× Strike, Goblin Club → 2× Smash, Runestone of Fire → Fireball, … Items rotate (**R**), pick up and move, and a **tidy** button repacks.
- **Badges as class modifiers** — one badge per run, and they *transform* rather than bloat: **Pyromancer** turns Bash into Firebolt (Burn), **Marksman** turns it into Shoot Arrow with an every-3rd-shot crit, **Devout** boosts all healing +50%.
- **The fluid weight & encumbrance system** — every item has a weight; capacity is 100 (+40 with a mule). Cross 50% and 2× *Sluggish* (unplayable, retained, shrinks your hand) join the deck; 75% adds *Heavily Encumbered* (−2 energy on draw); 100% adds *Complete Exhaustion* (skip the turn). It's **fully fluid** — drop a chest or eat an apple mid-combat and those Burden cards leave the deck the same instant.
- **Smart packing** — taking loot auto-fits it, rearranging the whole pack if needed; when nothing fits, a discard picker lets you drop something (weights/values shown) and the loot packs itself.
- **Loot crates** — Ornate Boxes and Treasure Chests can't be opened in the field; haul their massive weight home and the **Blacksmith** cracks them for gold, essence, gear, or a new badge.
- **The Dog & sidekicks** — build the **Kennel** and a dog joins every run free (Bite ×2 + Fetch, upgradable to Savage Bite with essence). Or hire a Cleric/Soldier; bring a Pack Mule for a 3×3 side-grid and +40 capacity at the cost of two *Cower in Fear* curses.
- **Status effects** — Burn, Poison, Bleed, Blind, Weak on enemies; Sleep, Rooted, Corrosion on you. The **Frog** (Hypno-Toad, Stone-Frog, King Croak) and **Snail** (Acid-Spitter, Giant Snail) factions are built around them.
- **Consumables** — aging Apples (Fresh → Ripe → Spoiled-and-throwable) and Bread; a Hunk of Meat you cook at a campfire and that leaves a Sharp Bone; potions, elixirs, vitality berries.
- **Branching Slay-the-Spire map** — choose your route through the Whispering Woods, Broken Tower, or the frog-ruled Sunken Fen. The Watchtower scouts node types; campfires rest and tend food.
- **Nightfall extraction** — reach the bottom (or turn back early) and **day turns to night**; pick your way home as cleared nodes corrupt into harder fights behind you. Torch lit = less corruption.
- **Village raids** — haul too much heat home and raiders hit the gate: a 2–3 wave fight where your deck is supplemented by **Town Cards** (Catapult, Militia, Field Dressing, Loose the Hounds) from your buildings. Lose and a building is *ruined* (repairable), never your progression.
- **Meta-progression** — bank gold/wood/stone/essence; build the Blacksmith, Apothecary (with a potion shop), Watchtower and Kennel; sell surplus gear. Saved in localStorage.

### Roadmap

- Active Burden cards (throw the coins / hide behind the chest for a one-time effect at the cost of extraction value)
- Multi-enemy fights, true tetromino item shapes, audio

## Art pipeline

The game ships with hand-rolled SVG placeholders in the concept style (chibi, blank oval eyes, muted earthy palette). To replace them with generated art via **GPT Image on Replicate**:

1. Copy `.env.example` to `.env` and add your token (never committed):

   ```
   REPLICATE_API_TOKEN=r8_xxxxxxxxxxxx
   ```

2. ```sh
   npm run art               # generate everything missing (~45 images)
   npm run art -- hero enemy_slime   # or just specific ids
   ```

PNGs land in `public/art/` and the game uses them automatically — any id without a PNG falls back to its SVG placeholder. Prompts live in `scripts/art-manifest.json`; the shared style prefix is in `scripts/generate-art.mjs`. If Replicate's slug for GPT Image 2.0 differs, set `REPLICATE_MODEL` in `.env`.

3. ```sh
   npm run art:bg            # strip backgrounds from sprites (851-labs/background-remover)
   ```

   Characters, enemies, items, cards and buildings become transparent cutouts that float on the game's own UI; scene art (destinations, run summaries) keeps its painted background. New generations should be downscaled (`sips -Z 320 public/art/<id>.png`) and then stripped.

## How to play

1. **Village** — click a stash item, then a pack cell, to equip it (**R** rotates; click packed items to pick them up and move them). Watch the deck readout under the grid. Pick a destination, maybe hire help, and *Set out at dawn*.
2. **Expedition** — press on through nodes; fight, gather, investigate. Every action ticks the clock (top middle). Loot is offered after fights — taking it adds Junk to your deck. In combat, **1–9** plays cards and **E** ends the turn.
3. **Turn back** before the clock beats you. Each cleared node you re-cross can corrupt into an elite fight — worse at night, better with a torch.
4. **Extract** at the village gate to bank resources, then build up the village and go again.
