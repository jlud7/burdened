import { DESTINATIONS, ITEMS } from '../data';
import { G, timePhase, dayLength, corruptionChance, carryingLitTorch, deckBreakdown } from '../state';
import {
  currentOffer, noteText, packOpen, togglePack,
  pressOn, turnBack, moveBack, gatherHere, openTreasure, skipNode, investigate,
  takeLoot, leaveLoot, retryLoot, dropLoot,
} from '../expedition';
import { action, renderGrid, hpBar } from '../ui';
import { art } from '../art';

action('m-press-on', () => pressOn());
action('m-turn-back', () => turnBack());
action('m-move-back', () => moveBack());
action('m-gather', () => gatherHere());
action('m-treasure', () => openTreasure());
action('m-skip', () => skipNode());
action('m-investigate', () => investigate());
action('m-pack', () => togglePack());
action('m-take', (arg) => takeLoot(Number(arg)));
action('m-leave', (arg) => leaveLoot(Number(arg)));
action('m-retry', (arg) => retryLoot(Number(arg)));
action('m-drop', (arg) => dropLoot(Number(arg)));

const NODE_GLYPH: Record<string, string> = {
  combat: '⚔', elite: '☠', gather: '⛏', event: '?', treasure: '◆',
};

export function timePill(): string {
  const exp = G.expedition;
  if (!exp) return '';
  const phase = timePhase();
  const icon = phase === 'day' ? '☀' : phase === 'dusk' ? '☾' : '☽';
  return `<span class="time-pill time-${phase}">${icon} ${phase.toUpperCase()} · ${exp.ticks}/${dayLength()}</span>`;
}

export function renderMap(root: HTMLElement) {
  const exp = G.expedition!;
  const dest = DESTINATIONS[exp.destId];
  const phase = timePhase();
  document.body.className = `phase-${phase}`;

  // node track: village on the left, destination depth to the right
  let track = `<div class="node node-village${exp.pos === -1 ? ' here' : ''}" title="Hub Village">⌂</div>`;
  exp.nodes.forEach((n, i) => {
    const here = exp.pos === i;
    const cls = ['node'];
    if (here) cls.push('here');
    if (n.cleared) cls.push('cleared');
    if (n.corrupted) cls.push('corrupted');
    track += `<div class="track-line${i <= exp.pos ? ' walked' : ''}"></div>
      <div class="${cls.join(' ')}" title="${n.type}">${n.corrupted ? '☠' : NODE_GLYPH[n.type]}</div>`;
  });

  const node = exp.pos >= 0 ? exp.nodes[exp.pos] : null;
  const bd = deckBreakdown();
  const atEnd = exp.pos === exp.nodes.length - 1;

  // ---- main interaction panel ----
  let panel = '';
  if (currentOffer) {
    const entries = currentOffer.entries
      .map((e, i) => {
        const def = ITEMS[e.itemId];
        if (e.state === 'taken') return `<div class="offer-entry done">${art(def.art, 'art-sm')} ${def.name} — <em>packed</em></div>`;
        if (e.state === 'left') return `<div class="offer-entry done">${art(def.art, 'art-sm')} ${def.name} — <em>left behind</em></div>`;
        if (e.state === 'noroom')
          return `<div class="offer-entry"><span class="junk-text">No room in your pack!</span> Drop something below, then
            <button class="btn btn-sm" data-action="m-retry" data-arg="${i}">try again</button>
            <button class="btn btn-ghost btn-sm" data-action="m-leave" data-arg="${i}">leave it</button></div>`;
        return `<div class="offer-entry">${art(def.art, 'art-sm')}
          <span><strong>${def.name}</strong><small> ${def.desc}</small></span>
          <button class="btn btn-sm" data-action="m-take" data-arg="${i}">Take</button>
          <button class="btn btn-ghost btn-sm" data-action="m-leave" data-arg="${i}">Leave</button></div>`;
      })
      .join('');
    panel = `<div class="offer"><h3>${currentOffer.title}</h3>${entries}
      <p class="hint">Loot adds Junk cards to your deck while carried.</p></div>`;
  } else if (node && !node.cleared) {
    if (node.type === 'gather') {
      panel = `<div class="encounter">${art('dest_' + (exp.destId === 'woods' ? 'woods' : 'dungeon'), 'art-lg')}
        <p>Good pickings here, if you spend the time.</p>
        <button class="btn" data-action="m-gather">Gather <small>(+1 tick)</small></button>
        <button class="btn btn-ghost" data-action="m-skip">Move along</button></div>`;
    } else if (node.type === 'treasure') {
      panel = `<div class="encounter">${art('item_chest', 'art-lg')}
        <p>Something glints beneath the brush.</p>
        <button class="btn" data-action="m-treasure">Open it <small>(+1 tick)</small></button>
        <button class="btn btn-ghost" data-action="m-skip">Leave it</button></div>`;
    } else if (node.type === 'event') {
      panel = `<div class="encounter"><span class="event-mark">?</span>
        <p>Something off the path catches your eye.</p>
        <button class="btn" data-action="m-investigate">Investigate <small>(+1 tick)</small></button>
        <button class="btn btn-ghost" data-action="m-skip">Keep walking</button></div>`;
    }
  } else {
    // cleared (or village edge): travel choices
    const corruptPct = Math.round(corruptionChance() * 100);
    const buttons: string[] = [];
    if (!exp.returning && !atEnd) buttons.push(`<button class="btn" data-action="m-press-on">Press on →</button>`);
    if (!exp.returning && exp.pos >= 0)
      buttons.push(`<button class="btn btn-warn" data-action="m-turn-back">Turn back ← <small>${corruptPct}% corruption/node</small></button>`);
    if (exp.returning)
      buttons.push(`<button class="btn btn-warn" data-action="m-move-back">${exp.pos === 0 ? 'Reach the village gate ←' : 'Continue home ←'} <small>${corruptPct}% corruption</small></button>`);
    panel = `<div class="encounter">
      ${noteText ? `<p class="note">${noteText}</p>` : `<p class="hint">${exp.returning ? 'The way home is never as safe as it was.' : atEnd ? 'This is as deep as the path goes.' : 'The path continues.'}</p>`}
      <div class="travel-btns">${buttons.join('')}</div></div>`;
  }

  const torch = carryingLitTorch();

  root.innerHTML = `
    <header class="topbar">
      <h1>${dest.name}</h1>
      <div class="topbar-mid">${timePill()}
        ${torch ? '<span class="torch-pill" title="Your torch lights the road home: less corruption.">🔥 torch lit</span>' : ''}
      </div>
      <div class="topbar-right">
        <span class="deck-pill" title="cards in your deck">🂠 ${bd.total}${bd.junk ? ` <span class="junk-text">(${bd.junk} junk)</span>` : ''}</span>
        <button class="btn btn-sm" data-action="m-pack">${packOpen ? 'close pack' : 'pack'}</button>
      </div>
    </header>
    <div class="hp-row">${hpBar(G.hp, G.maxHp)}</div>
    <div class="track">${track}</div>
    <main class="map-main">
      ${panel}
      ${packOpen ? `<div class="pack-panel"><h3>Your pack <span class="hint">— click loot to drop it</span></h3>
        ${renderGrid('pack', { itemAction: 'm-drop', itemActionLootOnly: true })}
        ${exp.mule ? `<h3>Mule's pack</h3>${renderGrid('mule', { itemAction: 'm-drop', itemActionLootOnly: true })}` : ''}
      </div>` : ''}
    </main>`;
}
