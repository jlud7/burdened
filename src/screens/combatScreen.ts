import { ENEMIES, SIDEKICKS, DESTINATIONS, ITEMS, CARDS } from '../data';
import { G, findItem } from '../state';
import { playCard, endTurn, intent } from '../combat';
import { action, renderCard, hpBar, renderDeckList } from '../ui';
import { art } from '../art';
import { rerender } from '../router';
import { timePill } from './map';
import type { CombatCard } from '../types';

let pileOpen: 'draw' | 'discard' | null = null;

action('c-play', (arg) => playCard(Number(arg)));
action('c-end-turn', () => endTurn());
action('c-pile', (arg) => {
  pileOpen = pileOpen === arg ? null : (arg as 'draw' | 'discard');
  rerender();
});

document.addEventListener('keydown', (e) => {
  const c = G.combat;
  if (G.screen !== 'combat' || !c) return;
  if (e.key === 'Escape' && pileOpen) {
    pileOpen = null;
    rerender();
    return;
  }
  if (c.over) return;
  if (e.key >= '1' && e.key <= '9') {
    const card = c.hand[Number(e.key) - 1];
    if (card) playCard(card.uid);
  } else if (e.key === 'e' || e.key === 'E') {
    endTurn();
  }
});

/** junk cards name the loot that spawned them — the burden made legible */
function junkDesc(card: CombatCard): string | undefined {
  if (CARDS[card.defId].type !== 'junk' || card.sourceUid == null) return undefined;
  const inst = findItem(card.sourceUid);
  return inst ? `Your ${ITEMS[inst.itemId].name}, hogging the pack. Worth something back home.` : undefined;
}

export function renderCombat(root: HTMLElement) {
  const c = G.combat!;
  const enemy = ENEMIES[c.enemyId];
  const exp = G.expedition;
  const dest = exp ? DESTINATIONS[exp.destId] : null;
  const move = intent();
  const side = exp?.sidekickId ? SIDEKICKS[exp.sidekickId] : null;

  const intentHtml =
    move.kind === 'attack'
      ? `<div class="intent intent-attack" title="It intends to attack.">⚔ ${move.value}</div>`
      : `<div class="intent intent-block" title="It intends to defend.">🛡 ${move.value}</div>`;

  const handHtml = c.hand.map((card) => renderCard(card.defId, card.uid, 'c-play', junkDesc(card))).join('');

  root.innerHTML = `
    <header class="topbar">
      <h1>${dest?.name ?? 'Combat'}</h1>
      <div class="topbar-mid">${timePill()}</div>
      <div class="topbar-right"><span class="hint">turn ${c.turn}</span></div>
    </header>
    <main class="combat-main">
      <div class="battlefield">
        <div class="combatant" id="player-box">
          ${art('hero', 'art-xl')}
          ${side ? `<div class="side-mini" title="${side.name}">${art(side.art, 'art-sm')}</div>` : ''}
          ${exp?.mule ? `<div class="side-mini mule-mini" title="Pack Mule (cowering)">${art('mule', 'art-sm')}</div>` : ''}
          <div class="combatant-label">You</div>
          ${hpBar(G.hp, G.maxHp, c.playerBlock)}
        </div>
        <div class="vs">${c.over ? '✦' : 'vs'}</div>
        <div class="combatant ${c.over ? 'enemy-dead' : ''}" id="enemy-box">
          ${intentHtml}
          ${art(enemy.art, 'art-xl')}
          <div class="combatant-label">${enemy.name}</div>
          ${hpBar(c.enemyHp, c.enemyMaxHp, c.enemyBlock)}
        </div>
      </div>
      ${c.over ? '<div class="victory">Victory!</div>' : ''}
      <div class="hand-row">
        <div class="energy" id="energy-orb" title="Energy — cards cost this to play">${c.energy}/${c.maxEnergy}</div>
        <div class="hand">${handHtml || '<span class="hint">No cards in hand.</span>'}</div>
        <div class="hand-side">
          <button class="pile-btn" data-action="c-pile" data-arg="draw" title="Draw pile">⬒ ${c.draw.length}</button>
          <button class="pile-btn" data-action="c-pile" data-arg="discard" title="Discard pile">⬓ ${c.discard.length}</button>
          <button class="btn" data-action="c-end-turn" ${c.over ? 'disabled' : ''}>End Turn</button>
          <span class="kbd-hint">1–9 play · E end turn</span>
        </div>
      </div>
      ${pileOpen ? `<div class="deck-list pile-list"><h3>${pileOpen} pile</h3>${renderDeckList(pileOpen === 'draw' ? c.draw : c.discard)}</div>` : ''}
    </main>`;
}
