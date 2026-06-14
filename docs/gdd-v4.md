# Wanderer's Burden — GDD v4 (June 2026) — AUTHORITATIVE

This document supersedes [gdd-v3.md](gdd-v3.md). Where any document disagrees, **this one wins**.
Lineage: [design-doc.md](design-doc.md) → [gdd-v2.md](gdd-v2.md) → [gdd-v3.md](gdd-v3.md) → **gdd-v4.md**.

## 0. How to read this doc (it is the build spec)

This GDD is the **direct input for development** — the thing Claude Code is pointed at when
implementing changes. So it is written to be *concrete*, not aspirational: IDs are in the
codebase's `snake_case`, numbers are real starting values, and every system names the file it
lives in (`src/data.ts`, `src/combat.ts`, `src/state.ts`, `src/screens/*`). Treat tables as the
source of truth for `data.ts` and rules as the source of truth for `combat.ts`.

Two conventions:

- **Tier tags** mark build order, not optional-ness. `[CORE]` = the validated loop, keep it working.
  `[NEW v4]` = added this revision. `[FIX Pn]` = resolves a ranked pain point from
  [playtest-findings.md](playtest-findings.md).
- **The balance loop is part of the spec.** After any `data.ts` tuning, run `npm run playtest`
  (~1s for ~55k sims) and read the *relative* curves (zone vs zone, greed tier vs greed tier).
  Target curves are in §12. A change isn't "done" until the curve moves the right way.

What the playtest data already settled, and we do **not** relitigate: the central thesis is
correct — the loaded **night return** is where the game is decided. Build everything to sharpen
that, never to blunt it.

---

## 1. Core concept & the three pillars

2D side-scrolling roguelite **deckbuilder / extraction-survival RPG**. Minimalist 2D vector art
under a distressed, grainy risograph print overlay; muted earthy palette; flat presentation with
code-driven "juice" (tweens, screen shake, particles) over frame animation.

**USP — the fluid Weight & Encumbrance system.** Loot and gear have weight; carrying too much
*dynamically injects Burden cards* into your combat deck, and they leave the instant you drop or
eat enough to dip back under a threshold. Greed is the antagonist.

**The three pillars (all validated — protect them):**

1. **Your bag is your deck.** Spatial grid packing *is* deckbuilding. What you carry is what you draw.
2. **Greed vs. survival.** Every point of value carried pushes you toward mechanical paralysis.
   Knowing *when to jettison your fortune* is the skill.
3. **The hard backtrack.** Reaching the end is half the game. Victory is surviving the loaded
   return when the world corrupts under nightfall.

---

## 2. Run structure & the validated risk/reward

A run: **prep in the village → day leg out → dusk at the destination/Apex → night leg home →
extract at the gate.** Day is (mostly) a loot-walk; night is where you die hauling treasure.

**The curve we are tuning toward** (Broken Tower is the proven-good reference — keep it, make the
others match its shape):

```
Broken Tower    survive   banked$   haulValue     ← the target shape
cautious (<50%)   97%        40         57
balanced (<75%)   79%        72        106
greedy   (<100%)  51%        84        153
reckless (all)    34%        76        222
```

Survival should fall smoothly as greed rises; **banked value should keep climbing into the greedy
tier, then turn over at reckless** (you carried so much you died). Any zone whose tiers are flat or
whose deaths happen on the *day* leg is mis-tuned (see §9, P1).

**v4's structural changes to this loop:**

- `[NEW v4][FIX P4]` **The day leg gets teeth.** Multi-enemy packs, an occasional day-elite, and
  real pack/route decisions replace the current click-through (§4, §8, §9).
- `[NEW v4]` **Dusk is a distinct beat.** The destination's Apex Boss drops a **Biome Trophy** you
  must haul home through the night to bank its meta-reward (§8, §10) — but trophies are
  *bankable and splittable*, not a single inert mega-crate (P1 fix).
- `[CORE]` **Night is unchanged in spirit, deepened in systems** (§10): corruption on backtrack,
  the torch, Paranoia, and the Night Terror.

---

## 3. Character, equipment slots & inventory

### 3.1 Equipment slots `[NEW v4]`

Slots sit outside the backpack grid. **Items in slots do not occupy grid cells, but their weight
still counts toward encumbrance.** Swapping slots is allowed only at Campfire nodes or between map
encounters (never mid-combat).

| Slot | Count | Holds |
|---|---|---|
| **Badge** | 1 | The run-defining charm (§6d). Exactly one per run. |
| **Trinket pockets** | 1 → 3 | Weightless passive relics (§6e). Upgraded via meta (§11). |
| **Main hand** | 1 | The active weapon whose cards are "always drawn" — see below. |

**Main-hand vs. stored gear:** a weapon in the **Main Hand** injects its cards into the deck. A
weapon merely *stored in the backpack grid* contributes its **full weight but zero cards** — you're
hauling it home to sell/store, not wielding it. (Badges/runestones still grant their cards from the
grid as today; the Main Hand is specifically for the one active weapon, so weapon choice is a real
decision, not "slot everything.")

> Migration note for `data.ts`/`state.ts`: today badges are grid items and every gear item grants
> cards from the grid. v4 introduces `slot: 'badge' | 'trinket' | 'mainhand'` on `ItemDef` and a
> `G.equipped: { badge, trinkets[], mainhand }` on state; `buildDeck()` reads slots for badge +
> mainhand + trinkets, and the grid for runestones/charms/off-hand. Keep the grid as the spatial
> packing puzzle for everything else.

### 3.2 The backpack grid `[CORE]`

Grid is **5×4** (`PACK_GRID`). Items have a size (`w×h`) and an independent **weight**. Rotation
(R) and auto-repack on pickup stay. The Pack Mule adds a **3×3** side-grid (`MULE_GRID`) and
**+40** capacity for **+2 Cower curses** (§7).

### 3.3 Fluid encumbrance (retuned) `[CORE][FIX P4]`

`MAX_WEIGHT = 80` stays (validated — keeps a ~20-weight loadout + 2–3 treasures crossing 50%).
Burden cards are injected/removed live as weight crosses thresholds; `syncBurdens()` reconciles
across all piles the instant you drop or eat.

| Load | Tier | Injected (2× each) | v4 change |
|---|---|---|---|
| 0–49% | Light | — | — |
| 50–74% | **Encumbered** | 2× **Sluggish** | `[FIX P4]` Sluggish now also **−1 max hand size** *and* costs your first **Focus** of value (see below) — the 50% line must bite, not be free. |
| 75–99% | **Heavily Encumbered** | + 2× **Heavily Encumbered** (on draw: −2 energy) | `[CORE]` |
| 100%+ | **Overencumbered** | + 2× **Complete Exhaustion** (on draw: skip turn, **+50% damage taken this turn**) | `[FIX]` add the GDD's long-promised damage-taken penalty. |

**Sluggish redefine** (`CARDS.sluggish`): *Unplayable. Retain. While in hand, max hand size −1.*
Tune the bite by also injecting it slightly earlier if §12 shows 50% still trivial (candidate:
first tier at **45%**). Decide by the harness, not by feel.

---

## 4. Combat architecture `[NEW v4 — the headline upgrade]`

The biggest change in v4. Today combat is one enemy, one target, one row. v4 makes it tactical.

### 4.1 Multiple enemies & targeting `[NEW v4][FIX P4]`

- Encounters field **1–3 enemies**. Normal day fights skew to packs of weak foes; elites/bosses are
  often solo or 1+adds.
- Every offensive card resolves against a **selected target**. UI: click an enemy to focus it
  (default = leftmost living). Keyboard: `Tab` cycles target; `1–9` still plays cards at the focus.
- **Per-enemy intent** is shown above each foe: the icon *and who it targets* — **the Boy** or
  **the Companion** (§4.3).
- New card facets in `CardDef` to support this: `aoe?: boolean` (hits all enemies),
  `splash?: number` (focus full, others reduced), `hitsBackRow?: boolean`, `pierce?: boolean`
  (ignores enemy armor). Most single-target cards just use the focus.

> `combat.ts` change: `CombatState.enemies: EnemyInstance[]` (each with hp/maxHp/block/statuses/
> patternIdx/atkBonus/row/targeting), plus `focus: number`. `dealDamage` takes a target. `intent()`
> returns per-enemy. `endTurn` loops enemies in order. `checkWin` = all enemies dead.

### 4.2 Front / back rows `[NEW v4]`

You and your companion each occupy **Front** or **Back**. Swap a character's row for **1 energy**.

- The **Front** character absorbs **~75%** of enemy attacks that target "the party" (single-target
  intents still pick the Boy or the Companion specifically).
- A **Back**-row character can't play **Melee** cards (sword/axe/mace/dagger strikes) — only
  ranged (bows/arrows), **Reach** weapons (spears, whips — `hitsBackRow`), spells, and skills.
- This makes weapon *type* matter (a back-row archer is safe but melee-locked) and gives every
  fight a positioning decision — the day leg's missing tension.

### 4.3 The companion as a unit `[NEW v4][FIX — depth + greed]`

Companions stop being a passive card-pack and become a **protectable unit**:

- Each companion has its **own HP pool** (§7) and can be **targeted independently**.
- At **0 HP** the companion is **Incapacitated**: its cards are pulled from the deck immediately,
  and **any loot stored in its grid (e.g. the Mule's 3×3 or the Jar) is permanently lost.** This
  pushes pillar 2 into the fight: overload the mule and a bad fight can bury your fortune with it.
- Companions can be **healed** (Cleric cards, potions targeted at them) and **repositioned** (rows).
- Permadeath is per-run; the village roster/Kennel persists (death never wipes meta — keep this).

### 4.4 Resource rules `[CORE]`

- **Energy** 3/turn (`maxEnergy`). Hand drawn to 5 (minus Retained). Draw pile reshuffles from
  discard. Player **Block resets every turn**.
- `[FIX — enemy-armor opacity]` **Enemy Block** is currently permanent & cumulative, which makes
  Giant Snail / Stone-Frog *silent DPS-checks*. v4 makes it **legible and counterable**:
  enemy armor (1) is always shown as a number, and (2) **decays 50% at the start of each of the
  enemy's turns** (so it's a wall to break *now*, not a forever-tax), and (3) is hard-countered by
  **Sunder** cards (maces/axes, `pierce`/strip-block). Choose decay-rate by §12.

### 4.5 Keyword glossary `[NEW v4 — formalize]`

Maps to flags on `CardDef`. Implement as a shared resolver so cards compose.

| Keyword | Rule | `CardDef` flag |
|---|---|---|
| **Exhaust** | Removed from the combat for the rest of the encounter when played. | `exhaust` |
| **Fading** | Auto-exhausts at end of turn if unplayed. | `fading` |
| **Retain** | Stays in hand at end of turn. | `retain` (exists) |
| **Expert** | 20% base chance to crit (×2 damage). | `expert` |
| **Lifesteal** | Unblocked damage heals you for the same amount. | `lifesteal` |
| **Taxing** | Exhausts and stays gone across battles until you rest at a Campfire. | `taxing` |
| **Sunder X** | Strip X enemy Block before damage. | `sunder` |
| **Pierce** | Ignore enemy Block entirely. | `pierce` |
| **Reach** | May target the back row / be played from the back row. | `hitsBackRow` |
| **AoE / Splash** | Hits all / focus-plus-reduced. | `aoe` / `splash` |

**Statuses** — enemy: Burn, Poison, Bleed (ticks on its attack), Blind (next attack misses),
Weak (−atk), **Stun** `[NEW]` (skips its next action), **Sunder/Exposed** `[NEW]` (takes +X).
Player: Sleep (−energy next turn), Rooted (fewer draws), Corrosion (block halved).

---

## 5. Master card database `[CORE + NEW]`

Base, transforms, and burdens below; weapon/runestone/sidekick cards live with their items in §6.
This is representative, not exhaustive — `data.ts` `CARDS` is the full set; extend in this style.

**Naked base deck (6):** 2× `bash` (1E, 4 dmg) · 2× `block` (1E, 5 blk) · 2× `focus` (0E, +1 energy).
*(Block buffed 3→5 so the base deck isn't pure paper; verify vs §12.)*

**Burdens:** `sluggish` (see §3.3) · `heavily_encumbered` (0E, unplayable, on-draw −2 energy) ·
`complete_exhaustion` (0E, unplayable, on-draw skip turn + 50% dmg taken) · `cower` (mule junk,
unplayable) · `paranoia` `[NEW v4]` (0E, unplayable, **Fading**; if retained at end of turn, take 2 — §10).

**Town cards** (raids, from buildings): `catapult` (12 dmg) · `militia` (4 dmg, draw 1) ·
`field_dressing` (heal 6) · `loose_hounds` (8 dmg) · `[NEW]` `boiling_oil` (5 AoE + Burn) ·
`[NEW]` `palisade` (12 block, Retain).

---

## 6. Equipment content — the variety mandate `[NEW v4 — major]`

The build ships ~6 weapons / 3 badges / 3 runestones. v4 multiplies this. All IDs are real; copy the
shape into `data.ts`. Weapons grant cards while in the **Main Hand**.

### 6a. Weapons (~16) `[NEW]`

| id | name | size | wt | archetype | cards (effect) | keywords |
|---|---|---|---|---|---|---|
| `simple_sword` | Simple Sword | 1×3 | 6 | sword | 3× Strike (6) | — |
| `iron_sword` | Iron Sword | 1×3 | 9 | sword | 3× Heavy Strike (9) | — |
| `rapier` | Rapier | 1×2 | 4 | sword | 3× Lunge (5) | Expert |
| `great_blade` | Great Blade | 1×3 | 16 | greatsword | 2× Heave (14) | — |
| `rusty_dagger` | Rusty Dagger | 1×2 | 2 | dagger | 2× Quick Slash (0E, 3) | — |
| `assassin_dagger` | Assassin's Dagger | 1×1 | 3 | dagger | 2× Backstab (6, +4 if target has Block; Bleed 1) | — |
| `hand_axe` | Hand Axe | 1×2 | 5 | axe | 2× Chop (7) | Sunder 2 |
| `battle_axe` | Battle Axe | 2×2 | 12 | axe | 2× Cleave (9) | AoE, Sunder 2 |
| `iron_mace` | Iron Mace | 1×2 | 7 | mace | 2× Crush (6) | Sunder 5 |
| `warhammer` | Warhammer | 2×2 | 14 | mace | 2× Smash (12) | Sunder 4, Stun(25%) |
| `goblin_club` | Goblin Club | 1×2 | 5 | club | 2× Smash (8) | — |
| `spear` | Spear | 1×3 | 6 | spear | 2× Thrust (5) | Reach |
| `halberd` | Halberd | 1×3 | 11 | spear | 2× Sweep (8) | Reach, Splash 4 |
| `short_bow` | Short Bow | 2×2 | 4 | bow | 2× Shoot (4, arrow) | Reach |
| `heavy_crossbow` | Heavy Crossbow | 2×2 | 10 | crossbow | Bullseye (12) + Loose Bolt (7) | Expert |
| `spore_staff` | Spore Staff | 1×3 | 7 | staff | Fungal Bloom (4, Poison 2) | AoE |
| `apprentice_staff` | Apprentice Staff | 1×3 | 5 | staff | 1× Arcane Bolt (6, +1 per spell played this combat) | — |
| `whip` | Whip | 1×2 | 4 | exotic | 2× Lash (4, Weak 1) | Reach |

Design intent: archetypes carve niches — daggers light & cheap (great under load), greatswords/mauls
heavy (engage encumbrance), spears/bows enable a back-row build, maces/axes answer the new enemy
armor (§4.4). Weight spread is deliberate: choosing the Great Blade is choosing a heavier night.

### 6b. Shields & off-hand (~6)

| id | name | size | wt | cards |
|---|---|---|---|---|
| `worn_shield` | Worn Shield | 2×2 | 8 | 2× Defend (5) |
| `iron_buckler` | Iron Buckler | 2×2 | 6 | 2× Deflect (6) |
| `tower_shield` | Tower Shield | 2×2 | 14 | 2× Bulwark (9) |
| `spiked_shield` | Spiked Shield | 2×2 | 9 | 2× Shield Bash (4 dmg + 4 blk) |
| `kite_shield` | Kite Shield | 2×2 | 10 | 2× Guard (7, Retain) |
| `travel_cloak` | Travel Cloak | 1×2 | 2 | 2× Dodge (4 blk, draw 1) |

### 6c. Runestones (~10) `[NEW]` — 1×1, weight 1, grant one spell

| id | spell card | effect |
|---|---|---|
| `fire_runestone` | Fireball | 12 fire dmg |
| `frost_runestone` | Frost Nova | 6 dmg, Weak 3 |
| `dark_runestone` | Dark Blast | 6 dmg, Blind 1 |
| `lightning_runestone` | Chain Bolt | 7 dmg to focus + 3 to one other (Reach) |
| `venom_runestone` | Venom Spit | 4 dmg, Poison 3 |
| `holy_runestone` | Smite | 8 dmg; if you healed this turn, +4 |
| `blood_runestone` | Hemomancy | 14 dmg, pay 3 HP (Lifesteal) |
| `earth_runestone` | Stone Skin | 0E, +8 Block, Retain |
| `wind_runestone` | Gust | 0E, draw 2, +1 energy |
| `arcane_runestone` | Arcane Surge | 4 dmg × (spells played this combat, max 3) |

Runestones are the natural synergy soil for the **Stormcaller** badge and the Apprentice/Arcane
scaling builds. Consider a future "socket" meta where the Forge fuses two runestones.

### 6d. Badges (~12) — **the identity fix** `[NEW][FIX P2]`

One per run, in the Badge slot. Each **transforms the base deck and/or grants a run-defining
passive** — the playtest's headline gap was that these were noise; here they are builds.

| id | transform (Bash →) | passive |
|---|---|---|
| `pyro_badge` | **Firebolt** (4 dmg, Burn 2) | Your Burn deals +1/tick and **spreads to a new enemy on kill**. |
| `marksman_badge` | **Shoot Arrow** (5, arrow) | Every **3rd** arrow crits (×2, **pierces** Block) and draws 1. |
| `devout_badge` | — | Healing +50%, **and whenever you gain Block, heal 2**. |
| `warden_badge` | **Shield Strike** (4 dmg + 4 blk) | **Block carries over** one turn (doesn't fully reset). |
| `berserker_badge` | **Reckless Swing** (9, take 2 self) | +1 damage for every **8 missing HP**. |
| `hexer_badge` | **Hex Bolt** (3, Poison 2) | Poison & Bleed ticks deal **+1**. |
| `stormcaller_badge` | **Spark** (4, lightning) | Runestone spells cost **−1** (min 1) and deal **+3**. |
| `vanguard_badge` | — | Start each combat with **6 Block**; in Front row take **−25%** damage. |
| `packmaster_badge` | — | Capacity **+20**, and you **ignore the 50% (Encumbered) tier** entirely. |
| `alchemist_badge` | — | Consumables **+50%**; eating/throwing is free **and** also deals dmg = heal/2. |
| `revenant_badge` | **Leech** (4, Lifesteal) | Once per run, the blow that would kill you leaves you at **1 HP**. |
| `trapper_badge` | — | Start with 2× **Caltrops** (skill: Bleed 2 AoE); apply Bleed 1 on first attack each turn. |

These are deliberately *opinionated* (Packmaster rewrites your weight math; Berserker wants you
low; Stormcaller wants runestones) so badge choice reshapes the run. Re-sim each vs §12 — target:
no badge should be within "rounding error" of another on the same deck.

### 6e. Trinkets (~14) `[NEW]` — weightless passives, Trinket pockets (1→3)

Low individual power, high variety; the collection knob that makes runs feel different. Examples:
`whetstone` (+1 attack dmg) · `lucky_coin` (+3 gold per loot) · `iron_ring` (+5 max HP) ·
`feather_charm` (−10 effective carried weight) · `ember_pendant` (first attack each combat applies
Burn 1) · `oak_totem` (+3 Block turn 1) · `thiefs_glove` (crates also pay **10 gold on pickup** —
P3 relief) · `lantern_oil` (corruption −0.05) · `herbalists_pouch` (food heals +2) · `quiver` (+1
to arrow cards) · `rune_focus` (spells +2) · `war_drum` (+1 energy on turn 1) · `scavengers_map`
(+1 loot option after fights) · `worry_stone` (first Paranoia each night is harmless).

### 6f. Consumables `[CORE]`

Keep aging apples/bread (Fresh→Ripe/Stale→Spoiled/Moldy-throwable), the Hunk of Meat→Sharp Bone
cook transform, potions (minor/major), Vitality Berries (+max HP). `[NEW]` add **Antidote** (clear
Poison/Corrosion), **Smoke Bomb** (combat: all enemies Weak 2 — a tempo tool for packs), and
**Trail Rations** (light, small heal, doesn't spoil) for longer night legs.

### 6g. Loot & crates `[CORE][FIX P3]`

Treasure is heavy — that's the tension; keep coin_bag/chalice/small_chest/ancient_herbs and the
heavy wood/stone/essence gather loot. **Crate economy fixes:**

- **A small guaranteed gold sliver on crate pickup** (e.g. 8–12g) so the haul isn't fully inert.
- `[NEW]` **The Tinkerer** building (cheap, §11) cracks **small** crates; the Blacksmith remains for
  the big ones — so crate payoff isn't gated solely behind the 40g/15w building.
- Trophies (§8) are **loot, not locked crates** — they bank on extract.

---

## 7. Companions `[NEW v4 — expanded roster + HP]`

Hire at the village (gold) or field the free Kennel dog. Each has **HP**, cards, and an ability;
all can be targeted, healed, repositioned, and **lost** (§4.3). Roster (fold the v4 Master set in):

| id | name | HP | cards | ability |
|---|---|---|---|---|
| `dog` | Loyal Dog (Kennel, free) | 18 | 2× Bite (4), Fetch (draw 2) | Digs a low-weight item at campfires; high evasion. |
| `cleric` | Cleric | 16 | 2× Minor Heal (3), Smite (5) | Heals can target you **or** a companion. |
| `soldier` | Soldier | 24 | 2× Brace (4 blk), Shield Bash (3+3) | Absorbs the first unblocked hit each combat (Front). |
| `hound` | Hound | 14 | 2× Bite (4), Fetch | Cheap aggression. |
| `scout` | Royal Scout `[NEW]` | 14 | 2× Snap Shot (5, Reach) | Reveals the type of adjacent hidden nodes. |
| `falcon` | Feral Falcon `[NEW]` | 10 | 2× Dive (4, hits **back row**) | Carries nothing (0×0 grid); pure back-line pressure. |
| `jar` | Living Jar `[NEW]` | 12 | — | Isolated **2×2** grid; items inside weigh **−50%**. |
| `mule` | Pack Mule | 28 | (2× Cower curse while hired) | **+3×3 grid, +40 capacity**; stubborn (the curses). |
| `grave_robber` | Grave Robber `[NEW]` | 14 | 1× Pilfer (4, +gold on kill) | More Loot Crates appear; occasionally steals gold at rest. |
| `phantom` | Phantom Twin `[NEW]` | — | Mirror Strike (copies your last attack) | Shares 50% of damage it takes with the Boy. |

Targeting + HP turns these into the protectable units the design wants: the Mule is a 40-capacity
gift that's also a liability (lose it mid-fight, lose its 3×3 of loot). Re-cost in §11.

---

## 8. Enemies, factions & bosses `[CORE + NEW v4]`

Keep the faction identity (Frogs = control/Sleep/Rooted; Snails = armor/Corrosion; Goblins =
numbers). v4 adds **packs, a day-elite chance, and Apex Bosses with Trophies.**

### 8.1 Harder day `[FIX P4]`

- **Packs:** day combat nodes can spawn **2–3 weak enemies** (e.g. 2× Goblin Scout, or Slime +
  2× Red Goblin) instead of always one. Now positioning, AoE, and target order matter.
- **Day-elite chance:** ~12% of day combat nodes upgrade to an elite (still no elites on the very
  first column). Real HP loss before nightfall = real decisions about pressing on vs. turning back.
- **New/retuned foes:** add `bandit` (steals on hit), `goblin_pack` patterns, and give armor foes
  (Giant Snail, Stone-Frog) the new **decaying-but-high** Block (§4.4) so a low-damage deck feels
  the check *and can answer it* with Sunder.

### 8.2 Apex Bosses & the Trophy `[NEW v4][FIX P1]`

Each zone's final (dusk) node is an **Apex Boss**. Defeating it triggers nightfall and drops a
**Biome Trophy** — high value, heavy, and **bankable on extract** (not a locked crate):

| zone | Apex | Trophy (loot) | size / wt | banks |
|---|---|---|---|---|
| Broken Tower | Goblin Warboss | Warboss's Hoard | 2×2 / 18 | 80 gold |
| Sunken Fen | King Croak | Croak's Crown | 2×2 / **20** | 60 gold + 4 essence |
| Whispering Woods | Corrupted Treant | Heartwood Bole | 2×2 / 16 | 6 wood + 30 gold |

`[FIX P1]` Croak's Crown replaces the mandatory **30-weight locked Treasure Chest**. It's lighter
and banks immediately, so (a) greed past "take the trophy" still scales (you can pile *more*
treasure on top), and (b) a winning Fen run isn't worth a pitiful $22. Re-sim the swamp curve.

### 8.3 The Night Terror — "The Collector" `[NEW v4]`

A ~2% night encounter. The screen dims, music cuts; **you cannot win.** The only option is **Flee**,
which requires dragging a **15+ weight item out of your grid** to drop as a decoy. You buy your life
with your greed — pillar 2 at its purest. (Implement as a special combat state with a single
"Flee" action gated on dropping qualifying weight.)

---

## 9. Zones `[CORE + FIX P1]`

Three zones now; a 4th unlocks via meta (§11). Keep `DESTINATIONS` shape (length, node weights,
enemy/night/elite pools, loot/gather tables, eliteReward).

- **Whispering Woods** — onboarding zone. Low stakes, the validated easy curve. Keep.
- **Broken Tower** — the reference zone. Near-perfect risk/reward. **Do not touch** beyond §8 packs.
- **Sunken Fen** `[FIX P1]` — currently broken (flat greed curve; you die *outbound*; banks $22).
  Fixes: (1) Croak's Crown trophy (§8.2). (2) **Soften the outbound** — guarantee a Campfire on the
  penultimate column, reduce Hypno-Toad Sleep frequency, and trim the gauntlet length so you reach
  King Croak less battered, moving deaths back to the *return* where they belong. (3) Add lighter
  optional treasure to the Fen loot table so balanced vs greedy diverge. Validate: the Fen's tiers
  should slope like Broken Tower's, and >70% of its deaths should occur on the night leg.

---

## 10. Night systems `[CORE + NEW v4]`

The proven-dangerous half. Deepen, don't blunt.

- `[CORE]` **Corruption on backtrack:** each cleared node you re-cross may corrupt into a harder
  night fight (`CORRUPTION_NIGHT = 0.35`, floor 0.05). Night HP ×1.3 + flat per-attack bonus.
- `[NEW v4][FIX — Torch]` **Pitch-Black vision.** At night, **without a lit light source you are
  Blinded: enemy intent is hidden (shown as `?`).** A Torch/Lantern reveals intent *and* cuts
  corruption (−0.12). This reframes the Torch from a trap into near-essential kit — and
  `searing_strike` becomes an explicit **desperation** card: it's a big one-time burst that
  *sacrifices your light*, a real choice on a dark return, not a strict downgrade.
- `[NEW v4]` **Paranoia.** Every 3 nodes traveled at night shuffles a `paranoia` card into the deck
  (unplayable, Fading; 2 damage if retained at end of turn). Cured by extracting or resting.
- `[NEW v4]` **The Trophy haul** (§8.2) and **the Night Terror** (§8.3) are the night's set-pieces.

---

## 11. Meta-progression & town economy `[CORE + NEW v4 — major]`

Hard split between **Gold** (upkeep/hiring) and **structural resources** (Wood/Stone/Essence) plus
the new weightless meta currency **Memories** (dropped by elites/bosses). "Way more meta variety"
is a top ask — this section is deliberately expanded.

### 11.1 Buildings (expand from 4 → ~8)

| id | name | does | cost (g/w/s) |
|---|---|---|---|
| `blacksmith` | Blacksmith | Forges Iron Sword/Tower Shield; cracks **big** crates; town card Catapult. | 40/15/0 |
| `apothecary` | Apothecary | Stocks Frost rune + potions; potion shop; town card Field Dressing. | 30/10/0 |
| `watchtower` | Watchtower | Identifies all map nodes; town card Militia. | 25/5/10 |
| `kennel` | Kennel | Free Dog every run; train with essence; town card Loose Hounds. | 20/10/0 |
| `tinkerer` `[NEW][FIX P3]` | Tinkerer | Cracks **small** crates cheaply; unlocks Trinket recipes; +1 Trinket pocket (→ then via Shrine to 3). | 18/8/0 |
| `greenhouse` `[NEW]` | Greenhouse | (Botanist rescue, §11.3) grows a persistent healing item each run. | 25/5/5 |
| `forge` `[NEW]` | Forge | Upgrades a weapon a tier; later: socket two runestones. | 35/10/10 |
| `shrine` `[NEW]` | Ancestral Shrine | Opens the **skill tree** (§11.2); +Trinket pockets to 3. | 30/0/15 |

### 11.2 Ancestral Shrine — the skill tree `[NEW v4]`

Spend **Memories** on permanent, account-wide passives. Small, broad tree so meta runs feel like
growth: `+5 max HP` · `+10 capacity` · `+1 Trinket pocket` · `start with a random runestone` ·
`Burden tiers shifted +5% later` · `+1 starting energy on turn 1` · `campfires heal +50%` ·
`unlock a 4th zone (the Sunspire / Frostvault)`. Tier the costs; this is the long-haul progression
the findings flagged as currently thin.

### 11.3 NPC rescues `[NEW v4]`

"?" Event nodes can hide a captured NPC. Rescue to populate the town: **Botanist** → Greenhouse,
**Cartographer** → pay to reveal Campfires/scout, **Smith's Apprentice** → Forge discount,
**Hedge-Witch** → Antidotes & curse removal. NPC rescues are also a *reason to take the risky "?"
node*, adding day-leg decisions (P4).

### 11.4 Artifact Compendium `[NEW v4]` — ties content to progression

Extracting **Strange Blueprints** (rare loot/elite drops) lets the Blacksmith/Forge **learn a new
item**, permanently adding it to the global drop pool. This is the engine that makes §6's big
weapon/runestone/trinket catalog *unlock over time* instead of all at once — meta variety with a
discovery curve.

### 11.5 Village raids `[CORE]`

Keep: hauling high heat home can trigger a 2–3 wave tower-defense at the gate, fought with **Town
Cards** from your buildings. Lose → a building is *Ruined* (repairable), never progression.

---

## 12. Balance targets & the harness loop `[CORE]`

`scripts/playtest.ts` (`npm run playtest`) is part of the spec. After any `data.ts` change, re-sim
and check:

1. **Every zone slopes like Broken Tower** — survival falls smoothly with greed; banked value
   climbs into *greedy*, turns over at *reckless*. (Fen is the current failure — §9.)
2. **Deaths are a night phenomenon** — target ≥70% of each zone's deaths on the return leg.
3. **No badge is within "rounding error" of another** on the same deck (the P2 bar).
4. **The 50% tier costs something** — a measurable HP/why-delta vs Light (the P4 bar).
5. **The day leg has variance** — packs/elites should produce a spread of day-HP outcomes, not 100%
   win at near-full.

The harness models a "competent, not optimal" AI and omits dog/sidekick/mule/berries, so read win
rates as a **conservative floor** and trust **relative** comparisons. When v4 adds rows/multi-enemy/
companion-HP, extend the harness to model targeting + companion HP (these change attrition math).

---

## 13. Build order (so development is sequenced) `[roadmap]`

Ranked by the findings' "order of attack," front-loading the depth lever you called out:

1. **Combat upgrade (§4):** multi-enemy + targeting + rows + companion HP. The depth ceiling; do it
   first because everything else (enemy packs, day tension, companion identity) rides on it.
2. **Fix the Sunken Fen (§9, P1):** trophy swap + outbound softening. One genuinely broken zone.
3. **Make badges matter (§6d, P2):** strengthen the 3, add the roster.
4. **Crate/meta economy (§6g, §11, P3):** Tinkerer, pickup gold, Trophies-as-loot.
5. **Day-leg tension + 50% tier (§3.3, §8.1, P4):** packs, day-elites, Sluggish bite.
6. **Content & meta breadth (§6, §11):** weapons/runestones/trinkets catalog behind the Compendium;
   skill tree; NPC rescues.
7. **Night set-pieces (§10):** Pitch-Black/Torch reframe, Paranoia, the Night Terror.

Re-run `npm run playtest` after each step.

---

## 14. Changelog v3 → v4 (tied to the findings)

- **Combat is now multi-target with rows and companion HP** (§4) — the build was single-enemy
  solitaire; this is the headline depth addition and the basis for a harder day.
- **Sunken Fen rebuilt** (§9, P1) — Croak's Crown trophy replaces the inert 30-weight chest;
  outbound softened so deaths move to the night return.
- **Badges rewritten as builds** (§6d, P2) — strengthened transforms + teeth-y passives + a 12-badge
  roster.
- **Crate economy unstuck** (§6g, §11, P3) — pickup gold, the Tinkerer, trophies bank directly.
- **Day leg + 50% tier given tension** (§3.3, §8.1, P4) — packs, day-elites, a biting Sluggish.
- **Enemy armor made legible & counterable** (§4.4) — decays + Sunder, no more silent DPS-checks.
- **Torch reframed** via Pitch-Black night vision (§10) — light is near-essential; Searing Strike
  is now an explicit desperation play.
- **Massive content expansion** (§6) — ~16 weapons, ~10 runestones, ~12 badges, ~14 trinkets, new
  consumables, gated behind the **Artifact Compendium** (§11.4) for a discovery curve.
- **Meta deepened** (§11) — Trinket pockets, Ancestral Shrine skill tree (Memories), NPC rescues,
  new buildings, a 4th unlockable zone.
- **New night systems** (§10) — Paranoia, Pitch-Black vision, the Night Terror "Collector."
- **Kept, untouched:** the validated core loop, the encumbrance USP, Broken Tower's curve, and the
  genuinely-good onboarding.
