import { ENEMIES, SIDEKICKS, DESTINATIONS } from '../data';
import { G } from '../state';
import { playCard, endTurn, intent } from '../combat';
import { action, renderCard, hpBar, renderDeckList } from '../ui';
import { art } from '../art';
import { rerender } from '../router';
import { timePill } from './map';

let pileOpen: 'draw' | 'discard' | null = null;

action('c-play', (arg) => playCard(Number(arg)));
action('c-end-turn', () => endTurn());
action('c-pile', (arg) => {
  pileOpen = pileOpen === arg ? null : (arg as 'draw' | 'discard');
  rerender();
});

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

  const handHtml = c.hand.map((card) => renderCard(card.defId, card.uid, 'c-play')).join('');

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
        </div>
      </div>
      ${pileOpen ? `<div class="deck-list pile-list"><h3>${pileOpen} pile</h3>${renderDeckList(pileOpen === 'draw' ? c.draw : c.discard)}</div>` : ''}
    </main>`;
}
