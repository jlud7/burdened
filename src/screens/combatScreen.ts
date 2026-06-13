import { ENEMIES, SIDEKICKS, DESTINATIONS, ITEMS, CARDS } from '../data';
import { G, hasDog, stageOf, displayName, carriedWeight, weightCapacity } from '../state';
import { playCard, endTurn, intent, combatConsume, combatDrop } from '../combat';
import { raidMeta } from '../raid';
import { action, renderCard, hpBar, renderDeckList, statusChips, weightBar, itemChips } from '../ui';
import { art } from '../art';
import { rerender } from '../router';
import { timePill } from './map';
import { tipBanner } from '../tutorial';
import type { CombatCard } from '../types';

let pileOpen: 'draw' | 'discard' | null = null;
let packOpenC = false;
let pendingUidC: number | null = null;

action('c-play', (arg) => playCard(Number(arg)));
action('c-end-turn', () => endTurn());
action('c-pile', (arg) => {
  pileOpen = pileOpen === arg ? null : (arg as 'draw' | 'discard');
  rerender();
});
action('c-pack', () => {
  packOpenC = !packOpenC;
  pendingUidC = null;
  rerender();
});
action('c-item', (arg) => {
  const uid = Number(arg);
  pendingUidC = pendingUidC === uid ? null : uid;
  rerender();
});
action('c-eat', (arg) => { pendingUidC = null; combatConsume(Number(arg)); });
action('c-throw', (arg) => { pendingUidC = null; combatConsume(Number(arg)); });
action('c-drop', (arg) => { pendingUidC = null; combatDrop(Number(arg)); });
action('c-cancel', () => { pendingUidC = null; rerender(); });

document.addEventListener('keydown', (e) => {
  const c = G.combat;
  if (G.screen !== 'combat' || !c) return;
  if (e.key === 'Escape') {
    if (pendingUidC != null) { pendingUidC = null; rerender(); return; }
    if (packOpenC) { packOpenC = false; rerender(); return; }
    if (pileOpen) { pileOpen = null; rerender(); return; }
  }
  if (c.over) return;
  if (e.key >= '1' && e.key <= '9') {
    const card = c.hand[Number(e.key) - 1];
    if (card) playCard(card.uid);
  } else if (e.key === 'e' || e.key === 'E') {
    endTurn();
  }
});

/** burden cards explain themselves in terms of the pack */
function burdenDesc(card: CombatCard): string | undefined {
  const def = CARDS[card.defId];
  if (def.type !== 'burden') return undefined;
  return `${def.desc} (⚖ ${carriedWeight()}/${weightCapacity()} — lighten the pack to shed this.)`;
}

/** in-combat pack strip: eat, throw, or abandon things to shed weight NOW */
function combatPack(): string {
  const carriedItems = G.items.filter((i) => i.grid !== 'stash');
  const rows = carriedItems
    .map((inst) => {
      const def = ITEMS[inst.itemId];
      const stage = stageOf(inst);
      const fixed = def.kind === 'gear' || def.kind === 'badge';
      if (pendingUidC === inst.uid && !fixed) {
        const throwable = !!stage?.throwPoison;
        const edible = def.kind === 'consumable' && !throwable;
        return `<div class="cpack-item cpack-confirm">
          ${art(def.art, 'art-sm')}<span>${displayName(inst)}</span>
          ${edible ? `<button class="btn btn-sm" data-action="c-eat" data-arg="${inst.uid}">eat</button>` : ''}
          ${throwable ? `<button class="btn btn-sm" data-action="c-throw" data-arg="${inst.uid}">throw!</button>` : ''}
          <button class="btn btn-warn btn-sm" data-action="c-drop" data-arg="${inst.uid}">drop</button>
          <button class="btn btn-ghost btn-sm" data-action="c-cancel">×</button></div>`;
      }
      return `<button class="cpack-item${fixed ? ' static' : ''}" ${fixed ? '' : `data-action="c-item" data-arg="${inst.uid}"`}
        title="${displayName(inst)} — ${stage ? stage.desc : def.desc}">
        ${art(def.art, 'art-sm')}<span>${displayName(inst)}</span>${itemChips(def)}</button>`;
    })
    .join('');
  return `<div class="pack-panel cpack">
    <h3>The pack, mid-fight <span class="hint">— free actions: eat, throw, or abandon</span></h3>
    ${weightBar()}
    <div class="cpack-list">${rows || '<small class="hint">You carry nothing.</small>'}</div>
  </div>`;
}

export function renderCombat(root: HTMLElement) {
  const c = G.combat!;
  const enemy = ENEMIES[c.enemyId];
  const exp = G.expedition;
  const dest = exp ? DESTINATIONS[exp.destId] : null;
  const { move, attack } = intent();
  const side = exp?.sidekickId ? SIDEKICKS[exp.sidekickId] : null;

  const blind = (c.enemyStatuses.blind ?? 0) > 0;
  const intentHtml = move.attack
    ? `<div class="intent intent-attack" title="${move.name}${move.hits ? `, ${move.hits} hits` : ''}${blind ? ' — blinded, it will miss' : ''}">
        ⚔ ${blind ? '<s>' : ''}${attack}${(move.hits ?? 1) > 1 ? `×${move.hits}` : ''}${blind ? '</s>' : ''} <small>${move.name}</small></div>`
    : move.block
      ? `<div class="intent intent-block" title="${move.name}">🛡 ${move.block} <small>${move.name}</small></div>`
      : `<div class="intent intent-debuff" title="${move.name} — it's readying something foul">✷ <small>${move.name}</small></div>`;

  // fanned hand, per the concept battle layout: tilted, overlapping, arced
  const n = c.hand.length;
  const handHtml = c.hand
    .map((card, i) => {
      const off = i - (n - 1) / 2;
      return `<div class="fan" style="--tilt:${(off * 2.4).toFixed(1)}deg;--lift:${(off * off * 1.6).toFixed(1)}px">
        ${renderCard(card.defId, card.uid, 'c-play', burdenDesc(card))}</div>`;
    })
    .join('');

  const raidBanner = c.raid && raidMeta
    ? `<div class="raid-banner">⚑ VILLAGE RAID — wave ${raidMeta.totalWaves - (c.waves?.length ?? 0)}/${raidMeta.totalWaves}</div>`
    : '';

  const bg = c.raid ? 'scene_raid' : dest?.art ?? 'dest_woods';

  root.innerHTML = `
    <header class="topbar">
      <h1>${c.raid ? 'The Village Gate' : dest?.name ?? 'Combat'}</h1>
      <div class="topbar-mid">${c.raid ? '' : timePill()}</div>
      <div class="topbar-right">
        ${c.raid ? '' : `<button class="btn btn-sm" data-action="c-pack">${packOpenC ? 'close pack' : 'pack'}</button>`}
        <span class="hint">turn ${c.turn}</span>
      </div>
    </header>
    ${raidBanner}
    ${tipBanner('combat')}
    <main class="combat-main">
      <div class="battlefield">
        <img class="battle-bg" src="art/${bg}.png" alt="" onerror="this.remove()"/>
        <div class="combatant" id="player-box">
          ${hpBar(G.hp, G.maxHp, c.playerBlock)}
          ${statusChips(c.playerStatuses)}
          <div class="duo">
            ${exp?.mule ? `<span class="mule-back" title="Pack Mule (cowering)">${art('mule', 'art-md')}</span>` : ''}
            ${art('hero', 'art-xl')}
            ${hasDog() ? `<span class="companion" title="Your dog">${art('side_hound', 'art-md')}</span>` : ''}
            ${side ? `<span class="companion" title="${side.name}">${art(side.art, 'art-md')}</span>` : ''}
          </div>
          <div class="combatant-label">You${hasDog() ? ' &amp; the dog' : ''}${side ? ` &amp; ${side.name}` : ''}</div>
        </div>
        <div class="combatant ${c.over ? 'enemy-dead' : ''}" id="enemy-box">
          ${intentHtml}
          ${hpBar(c.enemyHp, c.enemyMaxHp, c.enemyBlock)}
          ${statusChips(c.enemyStatuses)}
          ${art(enemy.art, 'art-xl')}
          <div class="combatant-label">${enemy.name}</div>
        </div>
      </div>
      ${c.over ? `<div class="victory">${c.raid ? 'The village holds!' : 'Victory!'}</div>` : ''}
      ${c.exhausted ? '<div class="exhausted-banner">Completely exhausted — you cannot play cards this turn.</div>' : ''}
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
      ${packOpenC && !c.raid ? combatPack() : ''}
      ${pileOpen ? `<div class="deck-list pile-list"><h3>${pileOpen} pile</h3>${renderDeckList(pileOpen === 'draw' ? c.draw : c.discard)}</div>` : ''}
    </main>`;
}
