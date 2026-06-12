import { ITEMS, CARDS, SIDEKICKS, DESTINATIONS, BUILDINGS, MULE_COST } from '../data';
import { G, itemsOn, findItem, place, unequip, buildDeck, deckBreakdown, spawnItem, save, wipeSave } from '../state';
import { embark } from '../expedition';
import { action, renderGrid, renderDeckList, resourceBar, setPreviewUid } from '../ui';
import { art } from '../art';
import { rerender } from '../router';
import { floatText } from '../fx';

let selectedUid: number | null = null;
let destId = 'woods';
let sidekickId: string | null = null;
let mule = false;
let deckOpen = false;

action('v-select-stash', (arg) => {
  const uid = Number(arg);
  selectedUid = selectedUid === uid ? null : uid;
  setPreviewUid(selectedUid);
  rerender();
});

action('v-cell', (arg) => {
  if (selectedUid == null) return;
  const [grid, xs, ys] = arg.split(':');
  const inst = findItem(selectedUid);
  if (inst && place(inst, grid as 'pack', Number(xs), Number(ys))) {
    selectedUid = null;
    setPreviewUid(null);
    save();
  }
  rerender();
});

action('v-unequip', (arg) => {
  const inst = findItem(Number(arg));
  if (inst) unequip(inst);
  save();
  rerender();
});

action('v-dest', (arg) => { destId = arg; rerender(); });
action('v-side', (arg) => { sidekickId = sidekickId === arg ? null : arg || null; rerender(); });
action('v-mule', () => { mule = !mule; rerender(); });
action('v-deck', () => { deckOpen = !deckOpen; rerender(); });

action('v-build', (arg) => {
  const b = BUILDINGS[arg];
  const r = G.resources;
  if (G.buildings[arg] || r.gold < b.costGold || r.wood < b.costWood || r.stone < b.costStone) return;
  r.gold -= b.costGold;
  r.wood -= b.costWood;
  r.stone -= b.costStone;
  G.buildings[arg] = true;
  for (const id of b.unlocks ?? []) spawnItem(id);
  save();
  rerender();
});

action('v-wipe', () => {
  if (confirm('Abandon this village and start over?')) {
    wipeSave();
    rerender();
  }
});

action('v-embark', (_, ev) => {
  const deck = buildDeck();
  // note: mule curses / sidekick cards aren't in the preview deck (no expedition yet),
  // but the requirement is about the player's own gear
  const hasDamage = deck.some((c) => (CARDS[c.defId].damage ?? 0) > 0);
  if (!hasDamage) {
    floatText(ev.target as Element, 'You need a weapon!', 'ft-junk');
    return;
  }
  const cost = (sidekickId ? SIDEKICKS[sidekickId].cost : 0) + (mule ? MULE_COST : 0);
  if (G.resources.gold < cost) {
    floatText(ev.target as Element, 'Not enough gold', 'ft-junk');
    return;
  }
  selectedUid = null;
  setPreviewUid(null);
  embark(destId, sidekickId, mule);
  rerender();
});

export function renderVillage(root: HTMLElement) {
  const stash = itemsOn('stash');
  const bd = deckBreakdown();
  const sideCost = sidekickId ? SIDEKICKS[sidekickId].cost : 0;
  const totalCost = sideCost + (mule ? MULE_COST : 0);

  const stashHtml = stash.length
    ? stash
        .map((inst) => {
          const def = ITEMS[inst.itemId];
          const sel = selectedUid === inst.uid ? ' selected' : '';
          return `<button class="stash-item${sel}" data-action="v-select-stash" data-arg="${inst.uid}" title="${def.desc}">
            ${art(def.art)}<span class="stash-label">${def.name}<small>${def.w}×${def.h}</small></span></button>`;
        })
        .join('')
    : '<p class="hint">Stash is empty — everything is packed.</p>';

  const buildingsHtml = Object.values(BUILDINGS)
    .map((b) => {
      const built = !!G.buildings[b.id];
      const r = G.resources;
      const afford = r.gold >= b.costGold && r.wood >= b.costWood && r.stone >= b.costStone;
      const cost = [
        b.costGold ? `◉${b.costGold}` : '',
        b.costWood ? `▤${b.costWood}` : '',
        b.costStone ? `▲${b.costStone}` : '',
      ].filter(Boolean).join(' ');
      return `<div class="building${built ? ' built' : ''}">
        ${art(b.art, 'art-sm')}
        <div class="building-info"><strong>${b.name}</strong><small>${b.desc}</small></div>
        ${built ? '<span class="badge-built">built</span>'
          : `<button class="btn btn-sm" data-action="v-build" data-arg="${b.id}" ${afford ? '' : 'disabled'}>${cost}</button>`}
      </div>`;
    })
    .join('');

  const destHtml = Object.values(DESTINATIONS)
    .map((d) => `<button class="dest${destId === d.id ? ' selected' : ''}" data-action="v-dest" data-arg="${d.id}">
        ${art(d.art, 'art-sm')}<span><strong>${d.name}</strong><small>${d.desc}</small></span></button>`)
    .join('');

  const sideHtml = Object.values(SIDEKICKS)
    .map((s) => `<button class="chip${sidekickId === s.id ? ' selected' : ''}" data-action="v-side" data-arg="${s.id}"
        title="${s.desc}">${s.name} ◉${s.cost}</button>`)
    .join('');

  root.innerHTML = `
    <header class="topbar">
      <h1>BURDENED</h1>
      <div class="topbar-mid">${resourceBar()}</div>
      <div class="topbar-right"><span class="hint">runs: ${G.runsCompleted}</span>
        <button class="btn btn-ghost btn-sm" data-action="v-wipe">reset</button></div>
    </header>
    <main class="village-layout">
      <section class="panel">
        <h2>The Stash</h2>
        <p class="hint">${selectedUid != null ? 'Now click a spot in the pack.' : 'Click an item, then a spot in the pack. Click packed items to unequip.'}</p>
        <div class="stash">${stashHtml}</div>
      </section>
      <section class="panel panel-pack">
        <h2>The Pack <span class="hint">— your gear IS your deck</span></h2>
        ${renderGrid('pack', { cellAction: 'v-cell', itemAction: 'v-unequip', selectedUid })}
        <div class="deck-summary">
          <span>${bd.total} cards — <strong>${bd.playable} playable</strong>${bd.junk ? `, <span class="junk-text">${bd.junk} junk</span>` : ''}</span>
          <button class="btn btn-sm" data-action="v-deck">${deckOpen ? 'hide deck' : 'view deck'}</button>
        </div>
        ${deckOpen ? `<div class="deck-list">${renderDeckList(buildDeck())}</div>` : ''}
      </section>
      <section class="panel">
        <h2>The Village</h2>
        <div class="buildings">${buildingsHtml}</div>
        <h2>Set Out</h2>
        <div class="dests">${destHtml}</div>
        <div class="hire">
          <small class="hint">Hire a sidekick (1/3 of your deck):</small>
          <div class="chips">${sideHtml}</div>
          <button class="chip${mule ? ' selected' : ''}" data-action="v-mule"
            title="A 3×3 side-pack for extra loot. Adds 2 unplayable 'Cower in Fear' cards.">Pack Mule ◉${MULE_COST} <small>+3×3 pack, +2 curses</small></button>
        </div>
        <button class="btn btn-big" data-action="v-embark">Set out at dawn ${totalCost ? `(◉${totalCost})` : ''}</button>
      </section>
    </main>`;
}
