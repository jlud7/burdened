import type { CombatCard, CombatState, EnemyMove } from './types';
import { CARDS, ENEMIES, ITEMS, NIGHT_MULT, WEIGHT_TIERS } from './data';
import {
  G, buildDeck, shuffle, rand, destroyItem, perish, isNight,
  carriedBadge, healPlayer, consume, requiredBurdens,
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

function initEnemy(c: CombatState, enemyId: string, night: boolean) {
  const def = ENEMIES[enemyId];
  const hp = Math.round(def.hp * (night ? NIGHT_MULT : 1));
  const firstAtk = def.pattern.find((m) => m.attack)?.attack ?? 0;
  c.enemyId = enemyId;
  c.enemyHp = hp;
  c.enemyMaxHp = hp;
  c.enemyBlock = 0;
  c.patternIdx = 0;
  c.enemyAtkBonus = night ? Math.round(firstAtk * (NIGHT_MULT - 1)) : 0;
  c.enemyStatuses = {};
}

export function startCombat(enemyId: string, opts: CombatOpts) {
  const night = !opts.raid && isNight();
  onWin = opts.onWin;
  onLose = opts.onLose ?? null;
  const c: CombatState = {
    enemyId,
    enemyHp: 0,
    enemyMaxHp: 0,
    enemyBlock: 0,
    patternIdx: 0,
    enemyAtkBonus: 0,
    enemyStatuses: {},
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
  initEnemy(c, enemyId, night);
  G.combat = c;
  drawCards(5);
  G.screen = 'combat';
}

export function intent(): { move: EnemyMove; attack: number } {
  const c = G.combat!;
  const def = ENEMIES[c.enemyId];
  const move = def.pattern[c.patternIdx % def.pattern.length];
  const attack = move.attack
    ? Math.max(0, move.attack + c.enemyAtkBonus - (c.enemyStatuses.weak ?? 0))
    : 0;
  return { move, attack };
}

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

function dealDamage(dmg: number) {
  const c = G.combat!;
  const blocked = Math.min(c.enemyBlock, dmg);
  c.enemyBlock -= blocked;
  const through = dmg - blocked;
  c.enemyHp = Math.max(0, c.enemyHp - through);
  const enemyEl = document.getElementById('enemy-box');
  shake(enemyEl, through >= 9);
  flash(enemyEl);
  floatText(enemyEl, through > 0 ? `-${through}` : 'blocked', through > 0 ? 'ft-dmg' : 'ft-block');
}

function addEnemyStatus(s: 'burn' | 'poison' | 'bleed' | 'blind' | 'weak', n: number) {
  const c = G.combat!;
  c.enemyStatuses[s] = (c.enemyStatuses[s] ?? 0) + n;
  floatText(document.getElementById('enemy-box'), `+${n} ${s}`, 'ft-status');
}

function checkWin(): boolean {
  const c = G.combat!;
  if (c.enemyHp > 0) return false;
  if (c.waves && c.waves.length) {
    const next = c.waves.shift()!;
    floatText(document.getElementById('enemy-box'), 'another wave!', 'ft-dmg');
    setTimeout(() => {
      // fresh enemy, fresh footing: hand recycles, energy and block reset
      initEnemy(c, next, false);
      c.playerStatuses = {};
      c.playerBlock = 0;
      c.energy = c.maxEnergy;
      c.exhausted = false;
      c.turn = 1;
      c.discard.push(...c.hand.filter((h) => !CARDS[h.defId].retain));
      c.hand = c.hand.filter((h) => CARDS[h.defId].retain);
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
        floatText(document.getElementById('enemy-box'), 'CRIT!', 'ft-crit');
      }
    }
    dealDamage(dmg);
  }
  if (def.block) gainBlock(def.block);
  if (def.heal) {
    const healed = healPlayer(def.heal);
    floatText(document.getElementById('player-box'), `+${healed} hp`, 'ft-heal');
  }
  if (def.gainEnergy) c.energy += def.gainEnergy;
  if (def.weaken) c.enemyStatuses.weak = (c.enemyStatuses.weak ?? 0) + def.weaken;
  if (def.burn) addEnemyStatus('burn', def.burn);
  if (def.poison) addEnemyStatus('poison', def.poison);
  if (def.bleed) addEnemyStatus('bleed', def.bleed);
  if (def.blind) addEnemyStatus('blind', def.blind);
  if (def.draw) drawCards(def.draw);

  if (def.breaksItem) {
    floatText(document.getElementById('player-box'), 'the torch is gone', 'ft-junk');
  }

  checkWin();
  rerender();
}

export function endTurn() {
  const c = G.combat!;
  if (c.over) return;

  // damage-over-time bites as the enemy stirs
  const dot = (c.enemyStatuses.burn ?? 0) + (c.enemyStatuses.poison ?? 0);
  if (dot > 0) {
    dealDamage(dot);
    if (c.enemyStatuses.burn) c.enemyStatuses.burn--;
    if (c.enemyStatuses.poison) c.enemyStatuses.poison--;
    if (checkWin()) { rerender(); return; }
  }

  // enemy acts
  const { move, attack } = intent();
  if (move.attack) {
    // bleeding enemies tear the wound open by moving
    const bleed = c.enemyStatuses.bleed ?? 0;
    if (bleed > 0) {
      dealDamage(bleed);
      c.enemyStatuses.bleed = bleed - 1;
      if (checkWin()) { rerender(); return; }
    }
    if ((c.enemyStatuses.blind ?? 0) > 0) {
      c.enemyStatuses.blind!--;
      floatText(document.getElementById('enemy-box'), 'it strikes blindly — and misses!', 'ft-block');
    } else {
      const hits = move.hits ?? 1;
      for (let h = 0; h < hits; h++) {
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
    }
  }
  if (move.block) c.enemyBlock += move.block;
  if (move.status) {
    c.playerStatuses[move.status] = (c.playerStatuses[move.status] ?? 0) + (move.sValue ?? 1);
    floatText(document.getElementById('player-box'), `${move.name}: ${move.status}!`, 'ft-status');
  }
  c.enemyStatuses.weak = 0;
  c.patternIdx++;

  if (G.hp <= 0) {
    if (onLose) onLose();
    else perish();
    rerender();
    return;
  }

  // new player turn
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
    addEnemyStatus('poison', res.thrownPoison);
    shake(document.getElementById('enemy-box'));
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
