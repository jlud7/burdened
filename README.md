# BURDENED

*A roguelite deckbuilder crossed with an extraction survival game.*

Your gear **is** your deck — arrange items in a grid-based pack and every sword, shield and runestone adds its cards to your draw pile. But so does your greed: every chalice and chest you haul home stuffs the deck with unplayable **Junk**, choking out the cards that keep you alive. Get in, get loot, and get back to the village **before nightfall** — the road home corrupts behind you.

Full concept: [docs/design-doc.md](docs/design-doc.md)

## Play it

```sh
npm install
npm run dev      # → http://localhost:5173
```

Built with Vite + TypeScript, no runtime dependencies. (The GDD calls for minimalist 2D vector art with code-driven juice — a DOM/CSS renderer fits that better than a 3D engine, and keeps the UI-heavy parts — grid inventory, cards, tooltips — trivial to iterate on.)

## What's in the MVP

The complete core loop from the GDD:

- **Inventory-based deckbuilding** — a 5×4 pack grid; equipped items grant cards (Simple Sword → 3× Strike, Fire Runestone → Fireball, …). No classes, just gear.
- **The encumbrance system** — loot occupies grid space *and* adds Junk cards to your combat deck while carried. Drop loot mid-run if it's getting you killed.
- **Dual-purpose items** — the Torch lights the road home (less corruption on the return trip), or can be played as *Searing Strike*… once.
- **The 2/3–1/3 rule** — hire a Cleric, Soldier or Hound to fill out the back third of your deck; hire a Pack Mule for a bonus 3×3 grid at the cost of two *Cower in Fear* curses.
- **Expeditions & backtracking** — pick the low-stakes Whispering Woods or the high-stakes Broken Tower, walk a node path out, then walk it back. Cleared nodes can **corrupt** into elite fights behind you.
- **Day/night enrage timer** — every action ticks the clock. Night means harder enemies and much more corruption.
- **Turn-based card combat** — energy, block, enemy intents, deck/discard cycling.
- **Soft-fail extraction** — die and you lose everything you carried, but the village (and your gear) endures.
- **Meta-progression** — bank gold/wood/stone, build the Blacksmith, Apothecary and Watchtower to unlock better gear and longer days. Saved in localStorage.

### Not yet (roadmap)

- Village **Raid** events (3-wave tower defense with Town Cards) and building ruin/repair
- Item rotation & true tetromino shapes in the grid
- Multi-enemy fights, more destinations, more events, audio
- GitHub Pages deploy

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

## How to play

1. **Village** — click a stash item, then a pack cell, to equip it. Watch the deck readout under the grid. Pick a destination, maybe hire help, and *Set out at dawn*.
2. **Expedition** — press on through nodes; fight, gather, investigate. Every action ticks the clock (top middle). Loot is offered after fights — taking it adds Junk to your deck.
3. **Turn back** before the clock beats you. Each cleared node you re-cross can corrupt into an elite fight — worse at night, better with a torch.
4. **Extract** at the village gate to bank resources, then build up the village and go again.
