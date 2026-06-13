import { DESTINATIONS, ITEMS } from '../data';
import {
  G, timePhase, corruptionChance, carryingLitTorch, deckBreakdown, buildDeck,
  findItem, nodeById, reachable, nodeKnown, stageOf, displayName, isBuilt,
} from '../state';
import {
  currentOffer, noteText, packOpen, togglePack,
  moveTo, turnBack, stepHome, gatherHere, openTreasure, skipNode,
  investigate, currentEvent, chooseEvent,
  campRest, campTendList, campfireTending, tendable, campTend,
  takeLoot, leaveLoot, retryLoot, dropLoot, mapConsume, dropAndRetry,
  pendingDropUid, requestDrop, cancelDrop, nodeResolved,
} from '../expedition';
import { action, renderGrid, hpBar, itemChips, renderDeckList, weightBar } from '../ui';
import { art } from '../art';
import { rerender } from '../router';
import type { MapNode } from '../types';

let deckOpen = false;
let confirmTurnBack = false;

action('m-go', (arg) => { confirmTurnBack = false; moveTo(Number(arg)); });
action('m-home', () => stepHome());
action('m-turn-back', () => {
  if (!confirmTurnBack) {
    confirmTurnBack = true;
    rerender();
    return;
  }
  confirmTurnBack = false;
  turnBack();
});
action('m-gather', () => gatherHere());
action('m-treasure', () => openTreasure());
action('m-skip', () => skipNode());
action('m-investigate', () => investigate());
action('m-event-choice', (arg) => chooseEvent(Number(arg)));
action('m-camp-rest', () => campRest());
action('m-camp-tend', () => campTendList());
action('m-tend', (arg) => campTend(Number(arg)));
action('m-pack', () => togglePack());
action('m-deck', () => { deckOpen = !deckOpen; rerender(); });
action('m-take', (arg) => takeLoot(Number(arg)));
action('m-leave', (arg) => leaveLoot(Number(arg)));
action('m-retry', (arg) => retryLoot(Number(arg)));
action('m-item', (arg) => requestDrop(Number(arg)));
action('m-drop-yes', (arg) => dropLoot(Number(arg)));
action('m-eat', (arg) => mapConsume(Number(arg)));
action('m-drop-no', () => cancelDrop());
action('m-drop-for', (arg) => {
  const [idx, uid] = arg.split(':');
  dropAndRetry(Number(idx), Number(uid));
});

document.addEventListener('keydown', (e) => {
  if (G.screen !== 'map' || e.key !== 'Escape') return;
  if (pendingDropUid != null) cancelDrop();
  else if (packOpen) togglePack();
  else if (deckOpen) { deckOpen = false; rerender(); }
});

const NODE_GLYPH: Record<string, string> = {
  combat: '⚔', elite: '☠', gather: '⛏', event: '?', treasure: '◆', campfire: '🔥',
};
const NODE_NAME: Record<string, string> = {
  combat: 'a fight', elite: 'an elite', gather: 'forage', event: 'something strange', treasure: 'a cache', campfire: 'a campfire',
};

export function timePill(): string {
  const exp = G.expedition;
  if (!exp) return '';
  const phase = timePhase();
  const icon = phase === 'day' ? '☀' : phase === 'dusk' ? '☾' : '☽';
  const tip =
    phase === 'night'
      ? 'Night. Cleared nodes can corrupt behind you; everything hits harder.'
      : phase === 'dusk'
        ? 'Dusk. This is as deep as the path goes — night falls when you turn for home.'
        : 'Day. Night falls the moment you turn back.';
  return `<span class="time-pill time-${phase}" title="${tip}">${icon} ${phase.toUpperCase()}</span>`;
}

// ---------- the branching node map (GDD v3 §4) ----------

const NX = 96; // column spacing
const NY = 66; // row spacing
const X0 = 86; // first column offset (village sits left of it)
const NODE = 46;

function nodePos(n: MapNode, rowsPerCol: number[], midY: number) {
  const rows = rowsPerCol[n.col];
  return { x: X0 + n.col * NX, y: midY + (n.row - (rows - 1) / 2) * NY };
}

function renderTrack(): string {
  const exp = G.expedition!;
  const rowsPerCol: number[] = [];
  for (const n of exp.nodes) rowsPerCol[n.col] = Math.max(rowsPerCol[n.col] ?? 0, n.row + 1);
  const maxRows = Math.max(...rowsPerCol);
  const H = Math.max(maxRows * NY + 26, 150);
  const W = X0 + exp.cols * NX + 10;
  const midY = H / 2;
  const pos = (n: MapNode) => nodePos(n, rowsPerCol, midY);
  const cx = (p: { x: number; y: number }) => p.x + NODE / 2;
  const cy = (p: { x: number; y: number }) => p.y + NODE / 2;

  const village = { x: 14, y: midY - NODE / 2 };
  const canTravel = nodeResolved() && !currentOffer && !G.combat;
  const reach = canTravel ? new Set(reachable().map((n) => n.id)) : new Set<number>();

  // edges
  let lines = '';
  const lineCls = (open: boolean) => `map-line${open ? ' line-open' : ''}`;
  for (const n of exp.nodes.filter((n) => n.col === 0)) {
    const p = pos(n);
    lines += `<line class="${lineCls(exp.pos === -1 && reach.has(n.id))}" x1="${village.x + NODE / 2}" y1="${midY}" x2="${cx(p)}" y2="${cy(p)}"/>`;
  }
  for (const n of exp.nodes) {
    const p = pos(n);
    for (const nid of n.next) {
      const q = pos(nodeById(nid));
      const open = exp.returning
        ? exp.pos === nid && reach.has(n.id)
        : exp.pos === n.id && reach.has(nid);
      lines += `<line class="${lineCls(open)}" x1="${cx(p)}" y1="${cy(p)}" x2="${cx(q)}" y2="${cy(q)}"/>`;
    }
  }

  // the village gate
  const homeOpen = exp.returning && canTravel && exp.pos >= 0 && nodeById(exp.pos).col === 0;
  let nodesHtml = `<div class="node node-village${exp.pos === -1 ? ' here' : ''}${homeOpen ? ' reachable' : ''}"
    style="left:${village.x}px;top:${village.y}px" ${homeOpen ? 'data-action="m-home"' : ''}
    title="${homeOpen ? 'The village gate — extract!' : 'Hub Village'}">⌂</div>`;

  for (const n of exp.nodes) {
    const p = pos(n);
    const known = nodeKnown(n);
    const cls = ['node'];
    if (exp.pos === n.id) cls.push('here');
    if (n.cleared) cls.push('cleared');
    if (n.corrupted) cls.push('corrupted');
    if (reach.has(n.id)) cls.push('reachable');
    if (!known) cls.push('fogged');
    const glyph = n.corrupted ? '☠' : known ? NODE_GLYPH[n.type] : '?';
    const tip = n.corrupted ? 'corrupted' : known ? NODE_NAME[n.type] : 'unknown — the watchtower would tell you';
    nodesHtml += `<div class="${cls.join(' ')}" style="left:${p.x}px;top:${p.y}px"
      ${reach.has(n.id) ? `data-action="m-go" data-arg="${n.id}"` : ''} title="${tip}">${glyph}</div>`;
  }

  return `<div class="mapwrap" style="width:${W}px;height:${H}px">
    <svg width="${W}" height="${H}">${lines}</svg>${nodesHtml}</div>`;
}

/** the entry-specific discard picker, shown when loot doesn't fit even after repacking */
function noRoomHtml(idx: number, itemId: string): string {
  const def = ITEMS[itemId];
  const droppables = G.items
    .filter((i) => i.grid !== 'stash' && ITEMS[i.itemId].kind !== 'gear' && ITEMS[i.itemId].kind !== 'badge')
    .map((inst) => {
      const d = ITEMS[inst.itemId];
      return `<button class="droppable" data-action="m-drop-for" data-arg="${idx}:${inst.uid}" title="Drop the ${d.name} and take the ${def.name}">
        ${art(d.art, 'art-sm')}<span>${displayName(inst)}</span>${itemChips(d)}</button>`;
    })
    .join('');
  return `<div class="offer-entry noroom">
    <div class="noroom-head"><span class="junk-text">No room for the ${def.name} (${def.w}×${def.h}) — even after repacking.</span>
      <button class="btn btn-sm" data-action="m-retry" data-arg="${idx}">try again</button>
      <button class="btn btn-ghost btn-sm" data-action="m-leave" data-arg="${idx}">leave it</button></div>
    ${droppables
      ? `<small class="hint">Drop something to make room — it takes the loot automatically:</small><div class="droppables">${droppables}</div>`
      : '<small class="hint">All you carry is gear, and gear doesn’t get left on the road. It stays behind.</small>'}
  </div>`;
}

function offerPanel(): string {
  const entries = currentOffer!.entries
    .map((e, i) => {
      const def = ITEMS[e.itemId];
      if (e.state === 'taken')
        return `<div class="offer-entry done">${art(def.art, 'art-sm')} ${def.name} — <em>${e.repacked ? 'packed, after some shuffling' : 'packed'}</em></div>`;
      if (e.state === 'left') return `<div class="offer-entry done">${art(def.art, 'art-sm')} ${def.name} — <em>left behind</em></div>`;
      if (e.state === 'noroom') return noRoomHtml(i, e.itemId);
      return `<div class="offer-entry">${art(def.art, 'art-sm')}
        <span><strong>${def.name}</strong>${itemChips(def)}<small> ${def.desc}</small></span>
        <button class="btn btn-sm" data-action="m-take" data-arg="${i}">Take</button>
        <button class="btn btn-ghost btn-sm" data-action="m-leave" data-arg="${i}">Leave</button></div>`;
    })
    .join('');
  return `<div class="offer"><h3>${currentOffer!.title}</h3>${entries}
    <p class="hint">Weight is the price: cross a threshold and Burden cards crowd your deck.</p></div>`;
}

function nodePanel(): string {
  const exp = G.expedition!;
  const node = exp.pos >= 0 ? nodeById(exp.pos) : null;

  if (currentOffer) return offerPanel();

  if (node && !nodeResolved()) {
    if (node.type === 'gather') {
      return `<div class="encounter">${art('dest_' + exp.destId, 'art-lg')}
        <p>Good pickings here, if you spend the time.</p>
        <button class="btn" data-action="m-gather">Gather</button>
        <button class="btn btn-ghost" data-action="m-skip">Move along</button></div>`;
    }
    if (node.type === 'treasure') {
      return `<div class="encounter">${art('item_chest', 'art-lg')}
        <p>Something glints beneath the brush.</p>
        <button class="btn" data-action="m-treasure">Open it</button>
        <button class="btn btn-ghost" data-action="m-skip">Leave it</button></div>`;
    }
    if (node.type === 'event') {
      if (currentEvent) {
        const choices = currentEvent.choices
          .map((c, i) => {
            const ok = !c.enabled || c.enabled();
            return `<button class="btn${ok ? '' : ' btn-ghost'}" data-action="m-event-choice" data-arg="${i}" ${ok ? '' : 'disabled'}>
              ${c.label}${c.hint ? ` <small>(${c.hint})</small>` : ''}</button>`;
          })
          .join('');
        return `<div class="encounter"><span class="event-mark">?</span>
          <p class="note">${currentEvent.text}</p>
          <div class="travel-btns">${choices}</div></div>`;
      }
      return `<div class="encounter"><span class="event-mark">?</span>
        <p>Something off the path catches your eye.</p>
        <button class="btn" data-action="m-investigate">Investigate</button>
        <button class="btn btn-ghost" data-action="m-skip">Keep walking</button></div>`;
    }
    if (node.type === 'campfire') {
      if (campfireTending) {
        const list = tendable()
          .map((inst) => {
            const def = ITEMS[inst.itemId];
            const what = def.cookable && !inst.cooked ? 'cook it' : 'make it fresh again';
            return `<button class="droppable" data-action="m-tend" data-arg="${inst.uid}" title="${what}">
              ${art(def.art, 'art-sm')}<span>${displayName(inst)}</span><small class="hint">${what}</small></button>`;
          })
          .join('');
        return `<div class="encounter">${art('scene_campfire', 'art-lg')}
          <p>What needs tending?</p>
          <div class="droppables">${list || '<small class="hint">Nothing worth the fire.</small>'}</div>
          <button class="btn btn-ghost" data-action="m-skip">Never mind</button></div>`;
      }
      return `<div class="encounter">${art('scene_campfire', 'art-lg')}
        <p>A safe ring of stones. The fire catches quickly.</p>
        <button class="btn" data-action="m-camp-rest">Rest <small>(heal 12)</small></button>
        ${tendable().length ? `<button class="btn" data-action="m-camp-tend">Tend provisions <small>(cook / refresh)</small></button>` : ''}
        <button class="btn btn-ghost" data-action="m-skip">Move along</button></div>`;
    }
  }

  // resolved (or village edge): travel guidance
  const corruptPct = Math.round(corruptionChance() * 100);
  const buttons: string[] = [];
  if (!exp.returning && exp.pos >= 0) {
    buttons.push(confirmTurnBack
      ? `<button class="btn btn-warn confirm" data-action="m-turn-back">Turn back for good? <small>night falls — the road only goes home</small></button>`
      : `<button class="btn btn-warn" data-action="m-turn-back">Turn back ← <small>night falls</small></button>`);
  }
  if (exp.returning && exp.pos >= 0 && nodeById(exp.pos).col === 0) {
    buttons.push(`<button class="btn btn-big-step" data-action="m-home">Reach the village gate ⌂</button>`);
  }
  const hint = exp.returning
    ? `Pick your way home — each step risks corruption (${corruptPct}%/node).`
    : exp.pos === -1
      ? 'Dawn. Pick your first step on the map above.'
      : 'Pick a lit node on the map to press on.';
  return `<div class="encounter">
    ${noteText ? `<p class="note">${noteText}</p>` : `<p class="hint">${hint}</p>`}
    ${buttons.length ? `<div class="travel-btns">${buttons.join('')}</div>` : ''}</div>`;
}

export function renderMap(root: HTMLElement) {
  const exp = G.expedition!;
  const dest = DESTINATIONS[exp.destId];
  const phase = timePhase();
  document.body.className = `phase-${phase}`;

  const bd = deckBreakdown();

  // ---- pack panel: drop (two-step) or eat ----
  let packHtml = '';
  if (packOpen) {
    const pending = pendingDropUid != null ? findItem(pendingDropUid) : undefined;
    let confirmStrip = '';
    if (pending) {
      const def = ITEMS[pending.itemId];
      const stage = stageOf(pending);
      const edible = def.kind === 'consumable' && !stage?.throwPoison;
      confirmStrip = `<div class="drop-confirm">${art(def.art, 'art-sm')}
        <span><strong>${displayName(pending)}</strong>${itemChips(def)}</span>
        ${edible ? `<button class="btn btn-sm" data-action="m-eat" data-arg="${pending.uid}">eat it</button>` : ''}
        <button class="btn btn-warn btn-sm" data-action="m-drop-yes" data-arg="${pending.uid}">drop it</button>
        <button class="btn btn-ghost btn-sm" data-action="m-drop-no">keep it</button></div>`;
    }
    packHtml = `<div class="pack-panel"><h3>Your pack <span class="hint">— click loot or food to drop/eat it (gear stays with you)</span></h3>
      ${weightBar()}
      ${confirmStrip}
      ${renderGrid('pack', { itemAction: 'm-item', itemActionDroppableOnly: true, selectedUid: pendingDropUid })}
      ${exp.mule ? `<h3>Mule's pack</h3>${renderGrid('mule', { itemAction: 'm-item', itemActionDroppableOnly: true, selectedUid: pendingDropUid })}` : ''}
    </div>`;
  }

  const torch = carryingLitTorch();

  root.innerHTML = `
    <header class="topbar">
      <h1>${dest.name}</h1>
      <div class="topbar-mid">${timePill()}
        ${torch ? '<span class="torch-pill" title="Your torch lights the road home: less corruption.">🔥 torch lit</span>' : ''}
        ${isBuilt('watchtower') ? '<span class="torch-pill" title="The watchtower’s scouts identified every node.">🗼 scouted</span>' : ''}
      </div>
      <div class="topbar-right">
        <button class="deck-pill" data-action="m-deck" title="Your deck right now — click to ${deckOpen ? 'hide' : 'view'} it">🂠 ${bd.total}${bd.burdens ? ` <span class="junk-text">(${bd.burdens} dead)</span>` : ''}</button>
        <button class="btn btn-sm" data-action="m-pack">${packOpen ? 'close pack' : 'pack'}</button>
      </div>
    </header>
    <div class="hp-row">${hpBar(G.hp, G.maxHp)}${weightBar(true)}</div>
    <div class="track-scroll">${renderTrack()}</div>
    <main class="map-main">
      ${nodePanel()}
      ${deckOpen ? `<div class="deck-list pile-list map-deck"><h3>Your deck</h3>${renderDeckList(buildDeck())}</div>` : ''}
      ${packHtml}
    </main>`;
}
