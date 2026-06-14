import type { CombatCard, CombatState, EnemyInstance, CompanionState, EnemyMove, EnemyStatus } from './types';
import { CARDS, ENEMIES, ITEMS, NIGHT_MULT, WEIGHT_TIERS, SIDEKICKS, DOG_HP } from './data';
import {
  G, buildDeck, shuffle, rand, destroyItem, perish, isNight,
  carriedBadge, healPlayer, consume, requiredBurdens, hasDog,
} from './state';
import { rerender } from './router';
import { floatText, shake, flash, screenShake } from './fx';

let onWin: () => void = () => {};
let onLose: (() => void) | null = null;

export interface CombatOpts {
  onWin: () => void;
  /** raids: losing is not dying */
  onLose?: () => void;
  /** raids: town cards instead of burdens and hirelings */
  raid?: boolean;
  /** raids: enemy ids still queued after this one */
  waves?: string[];
  elite?: boolean;
}

/** how often an enemy aims at the companion instead of the Boy, when one is alive (GDD v4 §4.1) */
const COMPANION_TARGET_CHANCE = 0.35;

function makeEnemy(enemyId: string, night: boolean): EnemyInstance {
  const def = ENEMIES[enemyId];
  const hp = Math.round(def.hp * (night ? NIGHT_MULT : 1));
  const firstAtk = def.pattern.find((m) => m.attack)?.attack ?? 0;
  return {
    enemyId,
    hp,
    maxHp: hp,
    block: 0,
    patternIdx: 0,
    atkBonus: night ? Math.round(firstAtk * (NIGHT_MULT - 1)) : 0,
    statuses: {},
    targetCompanion: false,
  };
}

/** the sidekick (if hired) or the dog fights as a unit with HP (GDD v4 §4.3) */
function buildCompanion(raid: boolean): CompanionState | null {
  if (raid) return null;
  const exp = G.expedition;
  if (exp?.sidekickId) {
    const s = SIDEKICKS[exp.sidekickId];
    return { id: s.id, name: s.name, art: s.art, hp: s.hp, maxHp: s.hp, alive: true };
  }
  if (hasDog()) {
    return { id: 'dog', name: 'The Dog', art: 'side_hound', hp: DOG_HP, maxHp: DOG_HP, alive: true };
  }
  return null;
}

/** (re)pick each enemy's target for the upcoming turn so the shown intent matches resolution */
function rollTargets(c: CombatState) {
  const canHit = !!c.companion?.alive;
  for (const e of c.enemies) e.targetCompanion = canHit && e.hp > 0 && Math.random() < COMPANION_TARGET_CHANCE;
}

export function startCombat(enemyIds: string[], opts: CombatOpts) {
  const night = !opts.raid && isNight();
  onWin = opts.onWin;
  onLose = opts.onLose ?? null;
  const c: CombatState = {
    enemies: enemyIds.map((id) => makeEnemy(id, night)),
    focus: 0,
    companion: buildCompanion(!!opts.raid),
    playerStatuses: {},
    draw: shuffle(buildDeck(opts.raid)),
    hand: [],
    discard: [],
    energy: 3,
    maxEnergy: 3,
    playerBlock: 0,
    turn: 1,
    arrows: 0,
    exhausted: false,
    waves: opts.waves,
    raid: opts.raid,
    over: false,
  };
  rollTargets(c);
  G.combat = c;
  drawCards(5);
  G.screen = 'combat';
}

// ---------- enemies & targeting ----------

export function livingEnemyIdxs(): number[] {
  const c = G.combat!;
  return c.enemies.map((_, i) => i).filter((i) => c.enemies[i].hp > 0);
}

function ensureFocusAlive() {
  const c = G.combat!;
  if ((c.enemies[c.focus]?.hp ?? 0) > 0) return;
  const alive = livingEnemyIdxs();
  if (alive.length) c.focus = alive[0];
}

/** click an enemy to aim your single-target cards at it */
export function setFocus(i: number) {
  const c = G.combat;
  if (!c || c.over) return;
  if ((c.enemies[i]?.hp ?? 0) > 0) { c.focus = i; rerender(); }
}

export function intent(i: number): { move: EnemyMove; attack: number } {
  const c = G.combat!;
  const e = c.enemies[i];
  const def = ENEMIES[e.enemyId];
  const move = def.pattern[e.patternIdx % def.pattern.length];
  const attack = move.attack
    ? Math.max(0, move.attack + e.atkBonus - (e.statuses.weak ?? 0))
    : 0;
  return { move, attack };
}

const enemyEl = (i: number) => document.getElementById('enemy-box-' + i);

function allDead(): boolean {
  return G.combat!.enemies.every((e) => e.hp <= 0);
}

// ---------- card resolution ----------

function drawCards(n: number) {
  const c = G.combat!;
  for (let i = 0; i < n; i++) {
    if (c.draw.length === 0) {
      if (c.discard.length === 0) return;
      c.draw = shuffle(c.discard);
      c.discard = [];
    }
    if (c.hand.length >= 10) return;
    const card = c.draw.pop()!;
    c.hand.push(card);
    // burdens bite the moment they hit your hand (GDD v3 §3)
    const def = CARDS[card.defId];
    if (def.onDraw === 'sap') {
      c.energy = Math.max(0, c.energy - 2);
      floatText(document.getElementById('energy-orb'), 'the weight drags: -2 energy', 'ft-junk');
    } else if (def.onDraw === 'exhaust') {
      c.exhausted = true;
      floatText(document.getElementById('player-box'), 'completely exhausted!', 'ft-junk');
    }
  }
}

/** apply block through Corrosion (halved while corroded) */
function gainBlock(n: number) {
  const c = G.combat!;
  const eaten = (c.playerStatuses.corrosion ?? 0) > 0;
  const amt = eaten ? Math.floor(n / 2) : n;
  c.playerBlock += amt;
  floatText(document.getElementById('player-box'), `+${amt} block${eaten ? ' (corroded)' : ''}`, 'ft-block');
}

function dealDamageTo(i: number, dmg: number) {
  const c = G.combat!;
  const e = c.enemies[i];
  if (!e || e.hp <= 0) return;
  const blocked = Math.min(e.block, dmg);
  e.block -= blocked;
  const through = dmg - blocked;
  e.hp = Math.max(0, e.hp - through);
  const el = enemyEl(i);
  shake(el, through >= 9);
  flash(el);
  floatText(el, through > 0 ? `-${through}` : 'blocked', through > 0 ? 'ft-dmg' : 'ft-block');
}

function addEnemyStatus(i: number, s: EnemyStatus, n: number) {
  const c = G.combat!;
  const e = c.enemies[i];
  if (!e || e.hp <= 0) return;
  e.statuses[s] = (e.statuses[s] ?? 0) + n;
  floatText(enemyEl(i), `+${n} ${s}`, 'ft-status');
}

function checkWin(): boolean {
  const c = G.combat!;
  if (!allDead()) return false;
  if (c.waves && c.waves.length) {
    const next = c.waves.shift()!;
    floatText(document.getElementById('enemy-box-0'), 'another wave!', 'ft-dmg');
    setTimeout(() => {
      // fresh enemy, fresh footing: hand recycles, energy and block reset
      c.enemies = [makeEnemy(next, false)];
      c.focus = 0;
      c.playerStatuses = {};
      c.playerBlock = 0;
      c.energy = c.maxEnergy;
      c.exhausted = false;
      c.turn = 1;
      c.discard.push(...c.hand.filter((h) => !CARDS[h.defId].retain));
      c.hand = c.hand.filter((h) => CARDS[h.defId].retain);
      rollTargets(c);
      drawCards(5 - c.hand.length);
      rerender();
    }, 700);
    return true;
  }
  c.over = true;
  setTimeout(() => {
    G.combat = null;
    onWin();
    rerender();
  }, 700);
  return true;
}

export function playCard(uid: number) {
  const c = G.combat!;
  if (c.over) return;
  const idx = c.hand.findIndex((h) => h.uid === uid);
  if (idx < 0) return;
  const card = c.hand[idx];
  const def = CARDS[card.defId];
  const cardEl = document.querySelector(`[data-card-uid="${uid}"]`);

  if (c.exhausted) {
    shake(cardEl);
    floatText(cardEl, 'too exhausted…', 'ft-junk');
    return;
  }
  if (def.unplayable) {
    shake(cardEl);
    floatText(cardEl, 'useless…', 'ft-junk');
    return;
  }
  if (def.cost > c.energy) {
    shake(document.getElementById('energy-orb'));
    floatText(document.getElementById('energy-orb'), 'not enough!', 'ft-junk');
    return;
  }

  ensureFocusAlive();
  const target = c.focus;

  c.energy -= def.cost;
  c.hand.splice(idx, 1);

  let exhaustedCard = false;
  if (def.breaksItem && card.sourceUid != null) {
    // the torch burns up: the item is gone, along with every card it granted
    destroyItem(card.sourceUid);
    const strip = (pile: CombatCard[]) => pile.filter((p) => p.sourceUid !== card.sourceUid);
    c.draw = strip(c.draw);
    c.discard = strip(c.discard);
    c.hand = strip(c.hand);
    exhaustedCard = true;
  }
  if (!exhaustedCard) c.discard.push(card);

  if (def.damage) {
    let dmg = def.damage;
    if (def.arrow) {
      c.arrows++;
      const badge = carriedBadge();
      if (badge && ITEMS[badge.itemId].badge?.arrowCrit && c.arrows % 3 === 0) {
        dmg *= 2;
        floatText(enemyEl(target), 'CRIT!', 'ft-crit');
      }
    }
    dealDamageTo(target, dmg);
  }
  if (def.block) gainBlock(def.block);
  if (def.heal) {
    const healed = healPlayer(def.heal);
    floatText(document.getElementById('player-box'), `+${healed} hp`, 'ft-heal');
  }
  if (def.gainEnergy) c.energy += def.gainEnergy;
  if (def.weaken) addEnemyStatus(target, 'weak', def.weaken);
  if (def.burn) addEnemyStatus(target, 'burn', def.burn);
  if (def.poison) addEnemyStatus(target, 'poison', def.poison);
  if (def.bleed) addEnemyStatus(target, 'bleed', def.bleed);
  if (def.blind) addEnemyStatus(target, 'blind', def.blind);
  if (def.draw) drawCards(def.draw);

  if (def.breaksItem) {
    floatText(document.getElementById('player-box'), 'the torch is gone', 'ft-junk');
  }

  checkWin();
  rerender();
}

// ---------- the enemy turn ----------

function hitCompanion(c: CombatState, dmg: number) {
  if (!c.companion || !c.companion.alive) return;
  c.companion.hp = Math.max(0, c.companion.hp - dmg);
  screenShake();
  floatText(document.getElementById('companion-box'), `-${dmg}`, 'ft-dmg');
  if (c.companion.hp <= 0) incapacitate(c);
}

/** the companion falls: its cards leave the deck and it can't be targeted again */
function incapacitate(c: CombatState) {
  if (!c.companion) return;
  c.companion.alive = false;
  c.companion.hp = 0;
  const strip = (pile: CombatCard[]) => pile.filter((p) => !p.companion);
  c.draw = strip(c.draw);
  c.hand = strip(c.hand);
  c.discard = strip(c.discard);
  floatText(document.getElementById('companion-box'), 'incapacitated!', 'ft-junk');
  // TODO (GDD v4 §4.3): also lose loot stored in the companion's own grid (mule/jar).
}

function hitPlayer(c: CombatState, attack: number) {
  const blocked = Math.min(c.playerBlock, attack);
  c.playerBlock -= blocked;
  const through = attack - blocked;
  G.hp = Math.max(0, G.hp - through);
  if (through > 0) {
    screenShake();
    floatText(document.getElementById('player-box'), `-${through}`, 'ft-dmg');
  } else {
    floatText(document.getElementById('player-box'), 'blocked!', 'ft-block');
  }
}

export function endTurn() {
  const c = G.combat!;
  if (c.over) return;

  // damage-over-time bites every poisoned/burning enemy as the turn turns over
  for (let i = 0; i < c.enemies.length; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0) continue;
    const dot = (e.statuses.burn ?? 0) + (e.statuses.poison ?? 0);
    if (dot > 0) {
      dealDamageTo(i, dot);
      if (e.statuses.burn) e.statuses.burn--;
      if (e.statuses.poison) e.statuses.poison--;
    }
  }
  if (checkWin()) { rerender(); return; }

  // each living enemy acts in order, at the Boy or the companion
  for (let i = 0; i < c.enemies.length; i++) {
    const e = c.enemies[i];
    if (e.hp <= 0) continue;
    const { move, attack } = intent(i);

    if (move.attack) {
      // bleeding enemies tear the wound open by moving
      const bleed = e.statuses.bleed ?? 0;
      if (bleed > 0) {
        dealDamageTo(i, bleed);
        e.statuses.bleed = bleed - 1;
      }
      if (e.hp <= 0) {
        // it bled out before it could swing
      } else if ((e.statuses.blind ?? 0) > 0) {
        e.statuses.blind!--;
        floatText(enemyEl(i), 'it strikes blindly — and misses!', 'ft-block');
      } else {
        const hits = move.hits ?? 1;
        const toCompanion = e.targetCompanion && !!c.companion?.alive;
        for (let h = 0; h < hits; h++) {
          if (toCompanion && c.companion?.alive) hitCompanion(c, attack);
          else hitPlayer(c, attack);
        }
      }
    }
    if (move.block) e.block += move.block;
    if (move.status) {
      c.playerStatuses[move.status] = (c.playerStatuses[move.status] ?? 0) + (move.sValue ?? 1);
      floatText(document.getElementById('player-box'), `${move.name}: ${move.status}!`, 'ft-status');
    }
    e.statuses.weak = 0;
    e.patternIdx++;

    if (G.hp <= 0) {
      if (onLose) onLose();
      else perish();
      rerender();
      return;
    }
  }
  if (checkWin()) { rerender(); return; } // a bleed tick may have finished the last one

  // new player turn
  rollTargets(c);
  c.playerBlock = 0;
  c.exhausted = false;
  const sleep = c.playerStatuses.sleep ?? 0;
  c.energy = Math.max(0, c.maxEnergy - sleep);
  if (sleep) {
    floatText(document.getElementById('energy-orb'), `drowsy: -${sleep} energy`, 'ft-junk');
    c.playerStatuses.sleep = 0;
  }
  c.turn++;
  // Sluggish cards retain, crowding out draws (GDD v3 §3)
  c.discard.push(...c.hand.filter((h) => !CARDS[h.defId].retain));
  c.hand = c.hand.filter((h) => CARDS[h.defId].retain);
  let draws = 5 - c.hand.length;
  const rooted = c.playerStatuses.rooted ?? 0;
  if (rooted) {
    draws -= rooted;
    floatText(document.getElementById('player-box'), 'rooted: fewer draws', 'ft-junk');
    c.playerStatuses.rooted = 0;
  }
  if (c.playerStatuses.corrosion) c.playerStatuses.corrosion--;
  drawCards(Math.max(0, draws));
  ensureFocusAlive();
  rerender();
}

// ---------- the pack, mid-combat: eat, throw, drop (the fluid part of §3) ----------

/**
 * Reconcile burden cards across all piles with the current carried weight —
 * called after anything is dropped or eaten mid-combat.
 */
export function syncBurdens() {
  const c = G.combat;
  if (!c || c.raid) return;
  const req = requiredBurdens();
  for (const tier of WEIGHT_TIERS) {
    const want = req[tier.cardId] ?? 0;
    const inPile = (pile: CombatCard[]) => pile.filter((p) => p.defId === tier.cardId).length;
    let have = inPile(c.draw) + inPile(c.hand) + inPile(c.discard);
    // shed burdens the moment the load lightens
    for (const pile of [c.draw, c.discard, c.hand]) {
      while (have > want) {
        const i = pile.findIndex((p) => p.defId === tier.cardId);
        if (i < 0) break;
        pile.splice(i, 1);
        have--;
      }
    }
    // (picking things up mid-combat isn't possible, but stay correct anyway)
    while (have < want) {
      c.draw.splice(rand(c.draw.length + 1), 0, { uid: 100000 + rand(1e6), defId: tier.cardId });
      have++;
    }
  }
}

/** eat/drink/throw a consumable as a free action in combat */
export function combatConsume(uid: number) {
  const c = G.combat!;
  if (c.over) return;
  const res = consume(uid, true);
  const box = document.getElementById('player-box');
  if (!res.ok) {
    floatText(box, res.msg, 'ft-junk');
    return;
  }
  if (res.gainEnergy) c.energy += res.gainEnergy;
  if (res.block) gainBlock(res.block);
  if (res.thrownPoison) {
    ensureFocusAlive();
    addEnemyStatus(c.focus, 'poison', res.thrownPoison);
    shake(enemyEl(c.focus));
  }
  if (res.transformedTo) {
    // the bone lands in your pack — and its card in your discard pile
    const def = ITEMS[res.transformedTo];
    const inst = G.items[G.items.length - 1];
    for (const cid of def.cards ?? []) {
      c.discard.push({ uid: 200000 + rand(1e6), defId: cid, sourceUid: inst?.uid });
    }
  }
  floatText(box, res.msg, 'ft-heal');
  syncBurdens();
  rerender();
}

/** abandon loot mid-fight to shed weight — gone for good */
export function combatDrop(uid: number) {
  const c = G.combat!;
  if (c.over) return;
  const inst = G.items.find((i) => i.uid === uid);
  if (!inst || inst.grid === 'stash') return;
  const kind = ITEMS[inst.itemId].kind;
  if (kind === 'gear' || kind === 'badge') return;
  destroyItem(uid);
  floatText(document.getElementById('player-box'), 'lighter already', 'ft-block');
  syncBurdens();
  rerender();
}
