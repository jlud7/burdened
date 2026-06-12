import type { CombatCard } from './types';
import { CARDS, ENEMIES, NIGHT_MULT } from './data';
import { G, buildDeck, shuffle, destroyItem, perish, isNight } from './state';
import { rerender } from './router';
import { floatText, shake, flash, screenShake } from './fx';

let onWin: () => void = () => {};

export function startCombat(enemyId: string, opts: { onWin: () => void; elite?: boolean }) {
  const def = ENEMIES[enemyId];
  const night = isNight();
  const hp = Math.round(def.hp * (night ? NIGHT_MULT : 1));
  const atkBonus = night ? Math.round(def.pattern[0].value * (NIGHT_MULT - 1)) : 0;
  onWin = opts.onWin;
  G.combat = {
    enemyId,
    enemyHp: hp,
    enemyMaxHp: hp,
    enemyBlock: 0,
    enemyWeak: 0,
    patternIdx: 0,
    enemyAtkBonus: atkBonus,
    draw: shuffle(buildDeck()),
    hand: [],
    discard: [],
    energy: 3,
    maxEnergy: 3,
    playerBlock: 0,
    turn: 1,
    over: false,
  };
  drawCards(5);
  G.screen = 'combat';
}

export function intent() {
  const c = G.combat!;
  const def = ENEMIES[c.enemyId];
  const move = def.pattern[c.patternIdx % def.pattern.length];
  if (move.kind === 'attack') {
    return { kind: 'attack' as const, value: Math.max(0, move.value + c.enemyAtkBonus - c.enemyWeak) };
  }
  return { kind: 'block' as const, value: move.value };
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
    c.hand.push(c.draw.pop()!);
  }
}

export function playCard(uid: number) {
  const c = G.combat!;
  if (c.over) return;
  const idx = c.hand.findIndex((h) => h.uid === uid);
  if (idx < 0) return;
  const card = c.hand[idx];
  const def = CARDS[card.defId];
  const cardEl = document.querySelector(`[data-card-uid="${uid}"]`);

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

  let exhausted = false;
  if (def.breaksItem && card.sourceUid != null) {
    // the torch burns up: the item is gone, along with every card it granted
    destroyItem(card.sourceUid);
    const strip = (pile: CombatCard[]) => pile.filter((p) => p.sourceUid !== card.sourceUid);
    c.draw = strip(c.draw);
    c.discard = strip(c.discard);
    c.hand = strip(c.hand);
    exhausted = true;
  }
  if (!exhausted) c.discard.push(card);

  if (def.damage) {
    const dmg = def.damage;
    const blocked = Math.min(c.enemyBlock, dmg);
    c.enemyBlock -= blocked;
    const through = dmg - blocked;
    c.enemyHp = Math.max(0, c.enemyHp - through);
    const enemyEl = document.getElementById('enemy-box');
    shake(enemyEl, through >= 9);
    flash(enemyEl);
    floatText(enemyEl, through > 0 ? `-${through}` : 'blocked', through > 0 ? 'ft-dmg' : 'ft-block');
  }
  if (def.block) {
    c.playerBlock += def.block;
    floatText(document.getElementById('player-box'), `+${def.block} block`, 'ft-block');
  }
  if (def.heal) {
    G.hp = Math.min(G.maxHp, G.hp + def.heal);
    floatText(document.getElementById('player-box'), `+${def.heal} hp`, 'ft-heal');
  }
  if (def.weaken) c.enemyWeak += def.weaken;
  if (def.draw) drawCards(def.draw);

  if (def.breaksItem) {
    floatText(document.getElementById('player-box'), 'the torch is gone', 'ft-junk');
  }

  if (c.enemyHp <= 0) {
    c.over = true;
    setTimeout(() => {
      G.combat = null;
      onWin();
      rerender();
    }, 700);
  }
  rerender();
}

export function endTurn() {
  const c = G.combat!;
  if (c.over) return;

  // enemy acts
  const move = intent();
  if (move.kind === 'attack') {
    const blocked = Math.min(c.playerBlock, move.value);
    const through = move.value - blocked;
    G.hp = Math.max(0, G.hp - through);
    if (through > 0) {
      screenShake();
      floatText(document.getElementById('player-box'), `-${through}`, 'ft-dmg');
    } else {
      floatText(document.getElementById('player-box'), 'blocked!', 'ft-block');
    }
  } else {
    c.enemyBlock += move.value;
  }
  c.enemyWeak = 0;
  c.patternIdx++;

  if (G.hp <= 0) {
    perish();
    rerender();
    return;
  }

  // new player turn
  c.playerBlock = 0;
  c.energy = c.maxEnergy;
  c.turn++;
  c.discard.push(...c.hand);
  c.hand = [];
  drawCards(5);
  rerender();
}
