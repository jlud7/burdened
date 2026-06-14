# Wanderer's Burden — Playtest Findings (2026-06-13)

Review of **GDD v3** ([gdd-v3.md](gdd-v3.md)) against the current build (`v0.3.0`),
backed by a headless balance harness. Reproduce any number below with:

```
npm run playtest
```

---

## How this was tested (and how much to trust it)

`combat.ts` is DOM-coupled and can't be imported directly, so the harness
(`scripts/playtest.ts`) imports the **real game data** from `src/data.ts` and
re-implements the combat loop faithfully — including the subtle rules:

- night HP ×1.3 **plus** a flat per-attack bonus
- burdens biting on **draw** (Heavily Encumbered −2 energy, Complete Exhaustion skip turn)
- bleed ticking **only** on enemy attack moves
- **enemy block is permanent & cumulative** — it never resets (player block resets each turn)

A "competent but not optimal" AI drives ~28k single fights and ~27k full runs.

**Calibration — read the numbers as a floor:**

- The AI plays a sensible line, not a perfect one → **win rates are conservative**.
- The dog, sidekicks, the mule, and Vitality Berries are **not modeled** → all make
  runs easier, so real survival is somewhat higher than shown.
- The map is modeled as the single path actually walked (correct for fight/loot
  counts); turning back early isn't modeled.
- **Trust the *relative* comparisons** — zone vs zone, greed vs greed, badge vs
  badge, load tier vs load tier — more than the absolute percentages.

`npm run build` passes clean. (One bug found during this pass was in the *harness*,
not the game.)

---

## Verdict: the core loop works, and the central thesis is validated

The design's bet is *"the loaded night return is the most dangerous part of the
game."* The data confirms it:

```
Whispering Woods / Broken Tower:  ~100% of all deaths happen on the night return
```

Days out are a safe loot-walk; you die hauling treasure home in the dark — exactly
the game GDD v3 describes.

**Broken Tower has a near-perfect risk/reward curve** — this is the proof the
system is fun:

```
Broken Tower    survive   banked$   haulValue
cautious  (<50%)   97%       40         57
balanced  (<75%)   79%       72        106
greedy    (<100%)  51%       84        153
reckless  (all)    34%       76        222
```

**Encumbrance (the USP) works.** No single fight is scary, but weight multiplies
attrition, and the compounding is what kills you on the return:

```
Same wolf fight, HP left out of 50:
Light(20%) 48  →  Encumbered(50%) 47  →  HeavilyEnc(75%) 43  →  Overenc(100%) 33
```

**Single fights are individually trivial** (every normal day enemy: 100% win,
47–50/50 HP left). Difficulty is attrition + night, not any one encounter.
Elites do cost real HP (King Croak −24, Treant −12, Stone-Frog −11 from full).

---

## Areas that need the most focus (ranked)

### 🔴 P1 — The Sunken Fen is mis-tuned (broken risk/reward + a lethal day leg)

```
Sunken Fen      survive   banked$   haulValue
cautious           79%       23         65
balanced           31%       22        121
greedy             31%       22        125   ← identical
reckless           31%       22        125   ← identical
```

1. **The curve flatlines.** balanced/greedy/reckless are identical — no incentive
   to push greed. King Croak's guaranteed **Treasure Chest (30 weight)** is
   mandatory and dominates the pack, so greed beyond "take the chest" adds nothing.
2. **You die on the way *out*, not home.** Only ~23–35% of swamp deaths are on the
   return (vs ~100% elsewhere). The outbound King Croak (60 HP, 14-dmg Belly Flop,
   Sleep) + Stone-Frog elite + Hypno-Toad gauntlet grinds you down before the
   "dangerous" part starts — breaking the day-is-safe promise in this zone only.
3. **A winning swamp run banks almost nothing** ($22) — its value is the chest,
   a *crate* locked behind the Blacksmith (see P3).

**Where to fix:** `data.ts` → `DESTINATIONS.swamp`, `ENEMIES.king_croak`.
Options: smaller/splittable boss chest; more healing (campfires/food) on the
outbound; retune King Croak's arrival difficulty; shorten the gauntlet so you
reach the boss less battered.

### 🟠 P2 — Badges don't matter (the headline "class" choice is a rounding error)

GDD v3 §2 calls badges *run-defining*. Mechanically they're noise:

```
Early deck vs Goblin Brute [elite]:
No badge 44 HP left · Pyro 44 · Marksman 45 · Devout 45   (identical 3.1 turns)
```

- **Pyro:** Bash (4 dmg) → Firebolt (3 dmg + 1 burn) is basically a *downgrade*
  for a tiny DoT.
- **Marksman:** Bash (4) → Shoot Arrow (4) + every-3rd crit → marginal.
- **Devout:** +50% healing barely registers when the early deck has ~1 heal card.

**Where to fix:** `data.ts` → `CARDS.firebolt` / `CARDS.shoot_arrow` and the badge
defs. Make transforms stronger and give passives teeth (e.g. Pyro burn that stacks
and spreads; Marksman lower crit threshold or crits pierce block; Devout also
heal-on-block).

### 🟡 P3 — The crate economy makes your best loot feel dead early

The most exciting hauls (Ornate Box, Treasure Chest) do **nothing** until the
Blacksmith — the *most expensive* building (40g / 15w). Early Tower/Swamp runs bank
little immediate gold and the payoff sits inert in the stash. Consider a cheap
early way to crack crates, a small guaranteed gold sliver on pickup, or
front-loading the Blacksmith. (Wood/stone for buildings also only come from heavy
gather loot competing for pack space — the meta economy is slow, which compounds
this.)

### 🟢 P4 — The day leg has no tension; the first weight tier is nearly free

Every normal day enemy is 100% win at near-full HP — the outbound is a click-through
with no decisions. And the **first burden tier (50% Encumbered / Sluggish) is almost
free** (47/50 HP); real choices start at 75%+. Consider making the 50% line bite a
little, and/or giving the day leg occasional tougher packs or resource decisions.

---

## Smaller things worth a look

- **Enemy block is permanent & cumulative** (verified in `combat.ts`). Giant Snail /
  Stone-Frog become silent DPS-checks that punish low-damage decks invisibly. Either
  intended-but-needs-a-tooltip, or a bug relative to player block (which resets each
  turn).
- **The Torch is a strict trap.** `searing_strike` breaks it, costing the whole
  return's −0.12 corruption for one 9-dmg hit — a smart player never swings it.
  Make it situationally worth it, or lean into it as an explicit desperation card.
- **Onboarding is genuinely good** (intro modal + per-screen coach marks incl. the
  night tip). Flagging as a strength — no change needed.

---

## Suggested order of attack

1. **Fix the Sunken Fen curve** (P1) — the one zone that's actually broken.
2. **Make badges matter** (P2) — biggest gap between the GDD's promise and the
   build; high payoff for identity/replayability.
3. **Smooth the crate → Blacksmith gate** (P3) — early-game feel.
4. **Polish day-leg tension + the 50% tier** (P4) during a tuning pass.

After any `data.ts` tuning, rerun `npm run playtest` (~1s for 55k sims) to watch the
curves move.
