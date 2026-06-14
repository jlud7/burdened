/**
 * Headless playtest harness for Wanderer's Burden.
 *
 * Imports the REAL game data (cards, enemies, items, destinations, tuning
 * constants) from src/data.ts and faithfully re-implements the combat loop from
 * src/combat.ts (which can't be imported directly — it's DOM-coupled). A simple
 * but competent card-playing AI drives thousands of fights and full extraction
 * runs so we can measure balance: win rates, HP loss, the day→night return
 * danger, and how the encumbrance/greed curve actually pays off.
 *
 * Run: node scripts/playtest.ts
 */
import {
  CARDS, ENEMIES, ITEMS, BASE_DECK, DESTINATIONS, DOG_CARDS,
  WEIGHT_TIERS, BURDEN_COPIES, MAX_WEIGHT, MULE_WEIGHT_BONUS,
  NIGHT_MULT, CORRUPTION_NIGHT, TORCH_CORRUPTION_BONUS, MAX_HP,
} from '../src/data.ts';

// ----------------------------- rng -----------------------------
function rand(n: number) { return Math.floor(Math.random() * n); }
function pick<T>(a: T[]): T { return a[rand(a.length)]; }
function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function weightedPick<T extends { weight: number }>(t: T[]): T {
  const total = t.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of t) { r -= e.weight; if (r <= 0) return e; }
  return t[t.length - 1];
}

// --------------------------- deck build ---------------------------
type Card = { defId: string; arrow?: boolean };

function buildDeck(loadout: string[], badgeId: string | null, weight: number, capacity: number, dogLevel = 0): Card[] {
  const deck: Card[] = [];
  const transform: Record<string, string> = badgeId ? (ITEMS[badgeId].badge?.transform ?? {}) : {};
  for (const cid of BASE_DECK) deck.push({ defId: transform[cid] ?? cid });
  for (const id of loadout) for (const cid of ITEMS[id].cards ?? []) deck.push({ defId: cid });
  if (dogLevel) for (const cid of (DOG_CARDS[dogLevel] ?? DOG_CARDS[1])) deck.push({ defId: cid });
  const frac = weight / capacity;
  for (const tier of WEIGHT_TIERS) if (frac >= tier.at) for (let i = 0; i < BURDEN_COPIES; i++) deck.push({ defId: tier.cardId });
  return deck.map((c) => ({ ...c, arrow: !!CARDS[c.defId].arrow }));
}

// --------------------------- combat sim ---------------------------
interface Fighter { hp: number; maxHp: number; }

interface Sim {
  enemyId: string; eHp: number; eBlock: number; idx: number; atkBonus: number;
  eBurn: number; ePoison: number; eBleed: number; eBlind: number; eWeak: number;
  pSleep: number; pRooted: number; pCorrosion: number;
  draw: Card[]; hand: Card[]; discard: Card[];
  energy: number; maxEnergy: number; block: number; turn: number; arrows: number;
  exhausted: boolean; over: boolean; win: boolean;
}

function initEnemy(s: Sim, enemyId: string, night: boolean) {
  const def = ENEMIES[enemyId];
  const hp = Math.round(def.hp * (night ? NIGHT_MULT : 1));
  const firstAtk = def.pattern.find((m) => m.attack)?.attack ?? 0;
  s.enemyId = enemyId; s.eHp = hp; s.eBlock = 0; s.idx = 0;
  s.atkBonus = night ? Math.round(firstAtk * (NIGHT_MULT - 1)) : 0;
  s.eBurn = s.ePoison = s.eBleed = s.eBlind = s.eWeak = 0;
}

function drawCards(s: Sim, n: number) {
  for (let i = 0; i < n; i++) {
    if (s.draw.length === 0) { if (s.discard.length === 0) return; s.draw = shuffle(s.discard); s.discard = []; }
    if (s.hand.length >= 10) return;
    const card = s.draw.pop()!;
    s.hand.push(card);
    const d = CARDS[card.defId];
    if (d.onDraw === 'sap') s.energy = Math.max(0, s.energy - 2);
    else if (d.onDraw === 'exhaust') s.exhausted = true;
  }
}

function dealDamage(s: Sim, dmg: number) {
  const blocked = Math.min(s.eBlock, dmg);
  s.eBlock -= blocked;
  s.eHp = Math.max(0, s.eHp - (dmg - blocked));
}

function intentDamage(s: Sim): number {
  const def = ENEMIES[s.enemyId];
  const move = def.pattern[s.idx % def.pattern.length];
  if (!move.attack) return 0;
  if (s.eBlind > 0) return 0; // will miss
  const per = Math.max(0, move.attack + s.atkBonus - s.eWeak);
  return per * (move.hits ?? 1);
}

/** healing multiplier from the worn badge (Devout) */
function healMultOf(badgeId: string | null) {
  return badgeId ? (ITEMS[badgeId].badge?.healMult ?? 1) : 1;
}

interface Policy { badgeId: string | null; healMult: number; arrowCrit: boolean; }

function playCard(s: Sim, card: Card, pol: Policy, f: Fighter) {
  const def = CARDS[card.defId];
  s.energy -= def.cost;
  const idx = s.hand.indexOf(card);
  if (idx >= 0) s.hand.splice(idx, 1); // remove from hand (matches combat.ts splice)
  s.discard.push(card);
  if (def.damage) {
    let dmg = def.damage;
    if (def.arrow) { s.arrows++; if (pol.arrowCrit && s.arrows % 3 === 0) dmg *= 2; }
    dealDamage(s, dmg);
  }
  if (def.block) s.block += (s.pCorrosion > 0 ? Math.floor(def.block / 2) : def.block);
  if (def.heal) f.hp = Math.min(f.maxHp, f.hp + Math.ceil(def.heal * pol.healMult));
  if (def.gainEnergy) s.energy += def.gainEnergy;
  if (def.weaken) s.eWeak += def.weaken;
  if (def.burn) s.eBurn += def.burn;
  if (def.poison) s.ePoison += def.poison;
  if (def.bleed) s.eBleed += def.bleed;
  if (def.blind) s.eBlind += def.blind;
  if (def.draw) drawCards(s, def.draw);
}

const isPlayable = (s: Sim, c: Card) => {
  const d = CARDS[c.defId];
  return !d.unplayable && !s.exhausted && d.cost <= s.energy && c.defId !== 'searing_strike';
};

/** greedy max single-turn direct damage reachable with current energy */
function reachableDamage(s: Sim): number {
  let energy = s.energy, dmg = 0;
  const atks = s.hand.filter((c) => CARDS[c.defId].damage && c.defId !== 'searing_strike')
    .map((c) => CARDS[c.defId]).sort((a, b) => (b.damage! / Math.max(1, b.cost)) - (a.damage! / Math.max(1, a.cost)));
  // play free energy first
  for (const c of s.hand) { const d = CARDS[c.defId]; if (d.cost === 0 && d.gainEnergy) energy += d.gainEnergy; }
  for (const d of atks) { if (d.cost <= energy) { energy -= d.cost; dmg += d.damage!; } }
  return dmg;
}

/** one full player turn driven by the AI heuristic */
function playerTurn(s: Sim, pol: Policy, f: Fighter) {
  if (s.exhausted) return;
  let guard = 0;
  while (guard++ < 40) {
    const playable = s.hand.filter((c) => isPlayable(s, c));
    if (!playable.length) break;
    const has = (pred: (d: any) => boolean) => playable.find((c) => pred(CARDS[c.defId]));

    // 1. free energy (Focus)
    const focus = has((d) => d.cost === 0 && d.gainEnergy);
    if (focus) { playCard(s, focus, pol, f); continue; }
    // 2. free card draw (Sprint / Fetch / 0-cost arrow)
    const freeDraw = has((d) => d.cost === 0 && d.draw);
    if (freeDraw) { playCard(s, freeDraw, pol, f); continue; }

    const incoming = intentDamage(s);
    const net = Math.max(0, incoming - s.block);
    const lethal = reachableDamage(s) + s.eBurn + s.ePoison >= s.eHp + s.eBlock;

    // 3. go for the kill
    if (lethal) {
      const atk = playable.filter((c) => CARDS[c.defId].damage).sort((a, b) => CARDS[b.defId].damage! - CARDS[a.defId].damage!)[0];
      if (atk) { playCard(s, atk, pol, f); continue; }
    }
    // 4. survive a meaningful hit: blind a big one, else weaken, else block
    const bigHit = net >= 9 || net >= f.maxHp * 0.3 || f.hp - net <= 12;
    if (net > 0 && bigHit) {
      const blind = has((d) => d.blind);
      if (blind && net >= 8) { playCard(s, blind, pol, f); continue; }
      const block = playable.filter((c) => CARDS[c.defId].block).sort((a, b) => CARDS[b.defId].block! - CARDS[a.defId].block!)[0];
      if (block && s.block < incoming) { playCard(s, block, pol, f); continue; }
      const weaken = has((d) => d.weaken);
      if (weaken) { playCard(s, weaken, pol, f); continue; }
    }
    // 5. heal when low
    if (f.hp < f.maxHp * 0.4) {
      const heal = has((d) => d.heal);
      if (heal) { playCard(s, heal, pol, f); continue; }
    }
    // 6. spend the rest on damage
    const atk = playable.filter((c) => CARDS[c.defId].damage).sort((a, b) => CARDS[b.defId].damage! - CARDS[a.defId].damage!)[0];
    if (atk) { playCard(s, atk, pol, f); continue; }
    // 7. bank a block if nothing better
    const block = has((d) => d.block);
    if (block) { playCard(s, block, pol, f); continue; }
    break;
  }
}

/** resolve the enemy's end-of-turn; returns true if player still alive */
function enemyTurn(s: Sim, f: Fighter): boolean {
  // damage over time
  const dot = s.eBurn + s.ePoison;
  if (dot > 0) { dealDamage(s, dot); if (s.eBurn) s.eBurn--; if (s.ePoison) s.ePoison--; if (s.eHp <= 0) { s.win = true; s.over = true; return true; } }

  const def = ENEMIES[s.enemyId];
  const move = def.pattern[s.idx % def.pattern.length];
  if (move.attack) {
    if (s.eBleed > 0) { dealDamage(s, s.eBleed); s.eBleed--; if (s.eHp <= 0) { s.win = true; s.over = true; return true; } }
    if (s.eBlind > 0) { s.eBlind--; }
    else {
      const per = Math.max(0, move.attack + s.atkBonus - s.eWeak);
      for (let h = 0; h < (move.hits ?? 1); h++) {
        const blocked = Math.min(s.block, per); s.block -= blocked; f.hp = Math.max(0, f.hp - (per - blocked));
      }
    }
  }
  if (move.block) s.eBlock += move.block;
  if (move.status === 'sleep') s.pSleep += move.sValue ?? 1;
  else if (move.status === 'rooted') s.pRooted += move.sValue ?? 1;
  else if (move.status === 'corrosion') s.pCorrosion += move.sValue ?? 1;
  s.eWeak = 0;
  s.idx++;
  if (f.hp <= 0) return false;

  // new player turn upkeep
  s.block = 0; s.exhausted = false;
  s.energy = Math.max(0, s.maxEnergy - s.pSleep); s.pSleep = 0;
  s.turn++;
  s.discard.push(...s.hand.filter((c) => !CARDS[c.defId].retain));
  s.hand = s.hand.filter((c) => CARDS[c.defId].retain);
  let draws = 5 - s.hand.length - s.pRooted; s.pRooted = 0;
  if (s.pCorrosion > 0) s.pCorrosion--;
  drawCards(s, Math.max(0, draws));
  return true;
}

interface FightResult { win: boolean; hpAfter: number; turns: number; }

function simFight(deck: Card[], enemyId: string, f: Fighter, night: boolean, pol: Policy): FightResult {
  const s: Sim = {
    enemyId, eHp: 0, eBlock: 0, idx: 0, atkBonus: 0,
    eBurn: 0, ePoison: 0, eBleed: 0, eBlind: 0, eWeak: 0,
    pSleep: 0, pRooted: 0, pCorrosion: 0,
    draw: shuffle(deck.map((c) => ({ ...c }))), hand: [], discard: [],
    energy: 3, maxEnergy: 3, block: 0, turn: 1, arrows: 0, exhausted: false, over: false, win: false,
  };
  initEnemy(s, enemyId, night);
  drawCards(s, 5);
  while (!s.over && s.turn < 120) {
    playerTurn(s, pol, f);
    if (s.eHp <= 0) { s.win = true; break; }
    if (!enemyTurn(s, f)) break;
    if (s.eHp <= 0) { s.win = true; break; }
  }
  return { win: s.win && f.hp > 0, hpAfter: f.hp, turns: s.turn };
}

function policyFor(badgeId: string | null): Policy {
  return { badgeId, healMult: healMultOf(badgeId), arrowCrit: !!(badgeId && ITEMS[badgeId].badge?.arrowCrit) };
}

// ============================================================================
// SIM 1 — single-fight balance grid
// ============================================================================
function pct(n: number, d: number) { return d ? (100 * n / d).toFixed(0) + '%' : '—'; }

function sim1() {
  console.log('\n========== SIM 1: single-fight balance (early-game deck, fresh 50 HP) ==========');
  const earlyLoadout = ['simple_sword', 'worn_shield', 'fire_runestone', 'healing_herbs'];
  const weight = earlyLoadout.reduce((s, id) => s + ITEMS[id].weight, 0); // ~16 → Light
  const N = 4000;
  const dayEnemies = ['slime', 'wolf', 'goblin', 'red_goblin', 'frog_soldier', 'hypno_toad', 'giant_snail', 'acid_snail'];
  const elites = ['treant', 'brute', 'stone_frog', 'king_croak'];
  const nightEnemies = ['shade', 'night_stalker'];

  const run = (enemyId: string, night: boolean, badge: string | null) => {
    const pol = policyFor(badge);
    let wins = 0, hpSum = 0, turnSum = 0;
    for (let i = 0; i < N; i++) {
      const f: Fighter = { hp: MAX_HP, maxHp: MAX_HP };
      const deck = buildDeck(earlyLoadout, badge, weight, MAX_WEIGHT);
      const r = simFight(deck, enemyId, f, night, pol);
      if (r.win) { wins++; hpSum += r.hpAfter; turnSum += r.turns; }
    }
    return { win: wins / N, hp: wins ? hpSum / wins : 0, turns: wins ? turnSum / wins : 0 };
  };

  const row = (label: string, enemyId: string, night: boolean) => {
    const r = run(enemyId, night, null);
    console.log(
      `  ${label.padEnd(20)} hp${String(ENEMIES[enemyId].hp).padStart(3)}  ` +
      `win ${pct(r.win * N, N).padStart(4)}  avgHPleft ${r.hp.toFixed(0).padStart(2)}/50  avgTurns ${r.turns.toFixed(1)}`
    );
  };
  console.log('-- normal enemies (day) --');
  for (const e of dayEnemies) row(ENEMIES[e].name, e, false);
  console.log('-- elites (day) --');
  for (const e of elites) row(ENEMIES[e].name + ' [elite]', e, false);
  console.log('-- night enemies (on the return, +30% hp/atk) --');
  for (const e of nightEnemies) row(ENEMIES[e].name + ' [night]', e, true);

  console.log('\n-- burden tax: same deck vs Forest Wolf at each load tier --');
  const wolfAt = (label: string, w: number) => {
    const pol = policyFor(null);
    let wins = 0, hpSum = 0;
    for (let i = 0; i < N; i++) {
      const f: Fighter = { hp: MAX_HP, maxHp: MAX_HP };
      const deck = buildDeck(earlyLoadout, null, w, MAX_WEIGHT);
      const r = simFight(deck, 'wolf', f, false, pol);
      if (r.win) { wins++; hpSum += r.hpAfter; }
    }
    console.log(`  ${label.padEnd(22)} (${(100 * w / MAX_WEIGHT).toFixed(0).padStart(3)}% load)  win ${pct(wins, N).padStart(4)}  avgHPleft ${(wins ? hpSum / wins : 0).toFixed(0)}/50`);
  };
  wolfAt('Light', 16);
  wolfAt('Encumbered', Math.ceil(0.5 * MAX_WEIGHT));
  wolfAt('Heavily Encumbered', Math.ceil(0.75 * MAX_WEIGHT));
  wolfAt('Overencumbered', MAX_WEIGHT);

  console.log('\n-- badge comparison: early deck vs Goblin Brute [elite] (day) --');
  for (const b of [null, 'pyro_badge', 'marksman_badge', 'devout_badge']) {
    const r = run('brute', false, b);
    console.log(`  ${(b ? ITEMS[b].name : 'No badge').padEnd(20)} win ${pct(r.win * N, N).padStart(4)}  avgHPleft ${r.hp.toFixed(0)}/50  avgTurns ${r.turns.toFixed(1)}`);
  }
}

// ============================================================================
// SIM 2 — full extraction runs (out by day, home by night)
// ============================================================================
type Greed = 'cautious' | 'balanced' | 'greedy' | 'reckless';
const GREED_CAP: Record<Greed, number> = { cautious: 0.5, balanced: 0.75, greedy: 1.0, reckless: 99 };

interface Loot { itemId: string; }
interface RunResult { survived: boolean; diedOnReturn: boolean; gold: number; haulValue: number; carriedWeight: number; burdensOnReturn: number; fights: number; }

const EARLY_GEAR = ['simple_sword', 'worn_shield', 'fire_runestone', 'healing_herbs', 'torch'];
const GEAR_WEIGHT = EARLY_GEAR.reduce((s, id) => s + ITEMS[id].weight, 0);

function lootWeight(loot: Loot[]) { return loot.reduce((s, l) => s + ITEMS[l.itemId].weight, 0); }
function haulValueOf(loot: Loot[]) {
  let v = 0;
  for (const l of loot) {
    const d = ITEMS[l.itemId];
    if (d.kind === 'crate') v += l.itemId === 'treasure_chest' ? 120 : 55; // crate expected gold (Blacksmith)
    else { v += (d.gold ?? 0) + (d.essence ?? 0) * 5 + (d.wood ?? 0) * 3 + (d.stone ?? 0) * 4; }
  }
  return v;
}

function simRun(destId: string, greed: Greed, badgeId: string | null): RunResult {
  const dest = DESTINATIONS[destId];
  const cap = MAX_WEIGHT; // no mule
  const pol = policyFor(badgeId);
  const f: Fighter = { hp: MAX_HP, maxHp: MAX_HP };
  const loadout = [...EARLY_GEAR];
  if (badgeId) loadout.push(badgeId);
  const baseGearWeight = loadout.reduce((s, id) => s + ITEMS[id].weight, 0);
  // consumables carried (eaten for healing; shed weight as used)
  let consumables: { itemId: string; heal: number; weight: number }[] = [
    { itemId: 'apple', heal: 5, weight: 1 }, { itemId: 'potion_minor', heal: 8, weight: 1 },
  ];
  const loot: Loot[] = [];
  let fights = 0, burdensOnReturn = 0, diedOnReturn = false;

  const curWeight = () => baseGearWeight + lootWeight(loot) + consumables.reduce((s, c) => s + c.weight, 0);
  const torchLit = () => loadout.includes('torch');

  const consider = (itemId: string) => {
    const w = ITEMS[itemId].weight;
    const capTarget = GREED_CAP[greed] * cap;
    if (curWeight() + w <= capTarget) { loot.push({ itemId }); return; }
    // greedy/reckless still grab high-value heavy hauls even past their soft cap
    if (greed === 'reckless') { loot.push({ itemId }); return; }
    if (greed === 'greedy' && haulValueOf([{ itemId }]) >= 35 && curWeight() + w <= cap) { loot.push({ itemId }); return; }
    // else leave it
  };

  const eatIfHurt = (threshold: number) => {
    while (f.hp < f.maxHp * threshold && consumables.length) {
      const c = consumables.shift()!;
      f.hp = Math.min(f.maxHp, f.hp + Math.ceil(c.heal * pol.healMult));
    }
  };

  const fight = (enemyId: string, night: boolean, elite: boolean) => {
    eatIfHurt(0.5);
    const w = curWeight();
    const deck = buildDeck(loadout, badgeId, w, cap);
    if (night) for (const t of WEIGHT_TIERS) if (w / cap >= t.at) burdensOnReturn += BURDEN_COPIES;
    fights++;
    const r = simFight(deck, enemyId, f, night, pol);
    return r.win && f.hp > 0;
  };

  // ---- outbound: one node per column, day ----
  const entries = Object.entries(dest.weights).map(([t, w]) => ({ t, weight: w as number }));
  for (let col = 0; col < dest.length; col++) {
    let type: string;
    if (col === dest.length - 1 && dest.finale) type = dest.finale;
    else { type = weightedPick(entries).t; if (col === 0 && type === 'elite') type = 'combat'; }

    if (type === 'combat' || type === 'elite') {
      const elite = type === 'elite';
      const enemyId = elite
        ? (col === dest.length - 1 && dest.finaleBoss ? dest.finaleBoss : pick(dest.elites))
        : pick(dest.enemies);
      if (!fight(enemyId, false, elite)) return { survived: false, diedOnReturn: false, gold: 0, haulValue: 0, carriedWeight: curWeight(), burdensOnReturn, fights };
      // drops
      const drop = elite ? dest.eliteReward : weightedPick(dest.lootTable).itemId;
      consider(drop);
      const enemy = ENEMIES[enemyId];
      if (enemy.drop && Math.random() < enemy.drop.chance) { /* gear drop — sell value, model as light loot skip */ }
      if (enemy.essence) consider('essence_vial');
    } else if (type === 'gather') {
      consider(weightedPick(dest.gatherTable).itemId);
    } else if (type === 'treasure') {
      consider(weightedPick(dest.lootTable).itemId); consider(weightedPick(dest.lootTable).itemId);
    } else if (type === 'event') {
      // model the average: ~half heal/help, ~half a small cost or a coin pickup
      const roll = rand(3);
      if (roll === 0) f.hp = Math.min(f.maxHp, f.hp + Math.ceil(8 * pol.healMult));
      else if (roll === 1) consider('coin_bag');
      else f.hp = Math.max(1, f.hp - 6);
    } else if (type === 'campfire') {
      if (f.hp < f.maxHp * 0.7) f.hp = Math.min(f.maxHp, f.hp + Math.ceil(12 * pol.healMult));
    }
  }

  // ---- the return: night, walk back through cleared nodes, corruption rolls ----
  let corrupt = CORRUPTION_NIGHT - (torchLit() ? TORCH_CORRUPTION_BONUS : 0);
  corrupt = Math.max(0.05, corrupt);
  for (let col = dest.length - 1; col >= 0; col--) {
    // drop down to the greed cap before risking a night fight (smart play)
    if (greed !== 'reckless') {
      const capTarget = GREED_CAP[greed] * cap;
      while (curWeight() > capTarget && loot.length) {
        // drop the heaviest, lowest-value-per-weight item
        loot.sort((a, b) => (haulValueOf([a]) / ITEMS[a.itemId].weight) - (haulValueOf([b]) / ITEMS[b.itemId].weight));
        loot.shift();
      }
    }
    if (Math.random() < corrupt) {
      const enemyId = pick(dest.nightEnemies);
      if (!fight(enemyId, true, false)) { diedOnReturn = true; return { survived: false, diedOnReturn, gold: 0, haulValue: 0, carriedWeight: curWeight(), burdensOnReturn, fights }; }
      consider('essence_vial');
    }
  }

  // banked
  let gold = 0;
  for (const l of loot) gold += ITEMS[l.itemId].gold ?? 0;
  return { survived: true, diedOnReturn: false, gold, haulValue: haulValueOf(loot), carriedWeight: curWeight(), burdensOnReturn, fights };
}

function sim2() {
  console.log('\n========== SIM 2: full extraction runs (out by day, home by night) ==========');
  const N = 3000;
  const greeds: Greed[] = ['cautious', 'balanced', 'greedy', 'reckless'];
  for (const destId of Object.keys(DESTINATIONS)) {
    const dest = DESTINATIONS[destId];
    console.log(`\n-- ${dest.name} (${dest.length} cols)  badge: Pyromancer --`);
    console.log('  greed       survive  diedReturn  banked$  haulValue  endLoad  burdens/return');
    for (const g of greeds) {
      let surv = 0, died = 0, diedRet = 0, gold = 0, haul = 0, load = 0, burdens = 0, fightsSum = 0;
      for (let i = 0; i < N; i++) {
        const r = simRun(destId, g, 'pyro_badge');
        if (r.survived) { surv++; gold += r.gold; haul += r.haulValue; load += r.carriedWeight; }
        else { died++; if (r.diedOnReturn) diedRet++; }
        burdens += r.burdensOnReturn; fightsSum += r.fights;
      }
      console.log(
        `  ${g.padEnd(10)}  ${pct(surv, N).padStart(5)}   ${pct(diedRet, died || 1).padStart(6)}    ` +
        `${(surv ? gold / surv : 0).toFixed(0).padStart(5)}    ${(surv ? haul / surv : 0).toFixed(0).padStart(6)}    ` +
        `${(surv ? load / surv : 0).toFixed(0).padStart(4)}/${MAX_WEIGHT}   ${(burdens / N).toFixed(1)}`
      );
    }
  }
}

sim1();
sim2();
console.log('\n(done)\n');
