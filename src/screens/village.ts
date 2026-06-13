import { ITEMS, SIDEKICKS, DESTINATIONS, BUILDINGS, MULE_COST, KENNEL_UPGRADE_ESSENCE } from '../data';
import {
  G, itemsOn, findItem, place, unequip, rotate, repack, buildDeck, deckBreakdown,
  spawnItem, save, wipeSave, carriedBadge, openCrate, sellItem, isBuilt,
  repairCost, repairBuilding, hasDog,
} from '../state';
import { embark } from '../expedition';
import { action, renderGrid, renderDeckList, resourceBar, setPreviewUid, refreshPreview, weightBar } from '../ui';
import { art } from '../art';
import { rerender } from '../router';
import { floatText } from '../fx';
import { introModal, tipBanner, resetTips } from '../tutorial';

let selectedUid: number | null = null;
let destId = 'woods';
let sidekickId: string | null = null;
let mule = false;
let deckOpen = false;
let pendingSellUid: number | null = null;
let crateNote: string | null = null;

function select(uid: number | null) {
  selectedUid = uid;
  setPreviewUid(uid);
}

action('v-select-stash', (arg) => {
  const uid = Number(arg);
  select(selectedUid === uid ? null : uid);
  pendingSellUid = null;
  rerender();
});

action('v-cell', (arg) => {
  if (selectedUid == null) return;
  const [grid, xs, ys] = arg.split(':');
  const inst = findItem(selectedUid);
  if (inst && place(inst, grid as 'pack', Number(xs), Number(ys))) {
    select(null);
    save();
  } else if (inst && ITEMS[inst.itemId].kind === 'badge' && carriedBadge() && carriedBadge()!.uid !== inst.uid) {
    floatText(document.querySelector('.grid-pack'), 'one badge per run', 'ft-junk');
  }
  rerender();
});

// first click picks a packed item up (so it can be moved or rotated); second click stashes it
action('v-item', (arg) => {
  const uid = Number(arg);
  if (selectedUid === uid) {
    const inst = findItem(uid);
    if (inst) unequip(inst);
    select(null);
    save();
  } else {
    select(uid);
  }
  rerender();
});

action('v-rotate', (_, ev) => rotateSelection(ev.target as Element));

action('v-stash-it', () => {
  const inst = selectedUid != null ? findItem(selectedUid) : undefined;
  if (inst && inst.grid !== 'stash') {
    unequip(inst);
    save();
  }
  select(null);
  rerender();
});

action('v-tidy', () => {
  if (repack()) save();
  rerender();
});

function rotateSelection(feedbackEl?: Element | null) {
  const inst = selectedUid != null ? findItem(selectedUid) : undefined;
  if (!inst) return;
  const def = ITEMS[inst.itemId];
  if (def.w === def.h) return;
  if (!rotate(inst)) {
    floatText(feedbackEl ?? document.querySelector('.grid-item.selected'), 'no room to turn it here', 'ft-junk');
    return;
  }
  if (inst.grid !== 'stash') save();
  rerender();
  refreshPreview();
}

document.addEventListener('keydown', (e) => {
  if (G.screen !== 'village') return;
  if (e.key === 'r' || e.key === 'R') rotateSelection();
  if (e.key === 'Escape') {
    if (pendingSellUid != null) pendingSellUid = null;
    else if (selectedUid != null) select(null);
    rerender();
  }
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

action('v-repair', (arg) => {
  if (!repairBuilding(arg)) {
    floatText(document.querySelector(`[data-arg="${arg}"]`), 'not enough resources', 'ft-junk');
  }
  rerender();
});

action('v-buy', (arg) => {
  const b = BUILDINGS[arg];
  if (!b?.shop || !isBuilt(arg) || G.resources.gold < b.shop.price) return;
  G.resources.gold -= b.shop.price;
  spawnItem(b.shop.itemId);
  save();
  rerender();
});

action('v-train', () => {
  if (!isBuilt('kennel') || G.kennelLevel >= 2 || G.resources.essence < KENNEL_UPGRADE_ESSENCE) return;
  G.resources.essence -= KENNEL_UPGRADE_ESSENCE;
  G.kennelLevel = 2;
  save();
  rerender();
});

action('v-open-crate', (arg) => {
  const res = openCrate(Number(arg));
  if (res) crateNote = `${res.crateName}: ${res.msg}`;
  rerender();
});

action('v-sell', (arg) => {
  const uid = Number(arg);
  if (pendingSellUid !== uid) {
    pendingSellUid = uid;
    rerender();
    return;
  }
  pendingSellUid = null;
  sellItem(uid);
  rerender();
});

action('v-wipe', () => {
  if (confirm('Abandon this village and start over?')) {
    wipeSave();
    resetTips(); // a fresh start re-teaches
    rerender();
  }
});

action('v-embark', (_, ev) => {
  const cost = (sidekickId ? SIDEKICKS[sidekickId].cost : 0) + (mule ? MULE_COST : 0);
  if (G.resources.gold < cost) {
    floatText(ev.target as Element, 'Not enough gold', 'ft-junk');
    return;
  }
  select(null);
  pendingSellUid = null;
  crateNote = null;
  embark(destId, sidekickId, mule);
  rerender();
});

export function renderVillage(root: HTMLElement) {
  const stash = itemsOn('stash').filter((i) => ITEMS[i.itemId].kind !== 'crate');
  const crates = itemsOn('stash').filter((i) => ITEMS[i.itemId].kind === 'crate');
  const bd = deckBreakdown();
  const sideCost = sidekickId ? SIDEKICKS[sidekickId].cost : 0;
  const totalCost = sideCost + (mule ? MULE_COST : 0);
  const selected = selectedUid != null ? findItem(selectedUid) : undefined;

  const stashHtml = stash.length
    ? stash
        .map((inst) => {
          const def = ITEMS[inst.itemId];
          const sel = selectedUid === inst.uid ? ' selected' : '';
          const selling = pendingSellUid === inst.uid;
          const sellBtn = def.value
            ? `<span class="sell-wrap"><button class="btn btn-sm ${selling ? 'btn-warn' : 'btn-ghost'}" data-action="v-sell" data-arg="${inst.uid}"
                title="Sell the ${def.name} for ${def.value} gold">${selling ? `sure? ◉${def.value}` : `◉${def.value}`}</button></span>`
            : '';
          return `<div class="stash-row"><button class="stash-item${sel}" data-action="v-select-stash" data-arg="${inst.uid}" title="${def.desc}">
            ${art(def.art)}<span class="stash-label">${def.name}<small>${def.w}×${def.h} · ⚖${def.weight}${def.kind === 'badge' ? ' · badge' : ''}</small></span></button>${sellBtn}</div>`;
        })
        .join('')
    : '<p class="hint">Stash is empty — everything is packed.</p>';

  const cratesHtml = crates.length
    ? `<h2>Loot Crates</h2>
       ${crateNote ? `<p class="note crate-note">${crateNote}</p>` : ''}
       <div class="stash">${crates
         .map((inst) => {
           const def = ITEMS[inst.itemId];
           return `<div class="stash-row"><span class="stash-item static">${art(def.art)}<span class="stash-label">${def.name}<small>unidentified</small></span></span>
             ${isBuilt('blacksmith')
               ? `<button class="btn btn-sm" data-action="v-open-crate" data-arg="${inst.uid}">open</button>`
               : '<small class="hint">needs the Blacksmith</small>'}</div>`;
         })
         .join('')}</div>`
    : '';

  const badge = carriedBadge();
  let hint: string;
  if (selected) {
    const def = ITEMS[selected.itemId];
    if (def.kind === 'badge' && badge && badge.uid !== selected.uid) {
      hint = `Only one badge per run — stash the ${ITEMS[badge.itemId].name} first.`;
    } else if (selected.grid === 'stash') {
      hint = 'Now click a spot in the pack. R rotates.';
    } else {
      hint = 'Click a new spot to move it, or click it again to stash it. R rotates.';
    }
  } else {
    hint = 'Click an item, then a spot in the pack. Click packed items to pick them up.';
  }

  let toolbar = '';
  if (selected) {
    const def = ITEMS[selected.itemId];
    toolbar = `<div class="pack-toolbar">
      <span class="hint">${def.name}${selected.rot ? ' (turned)' : ''}</span>
      ${def.w !== def.h ? `<button class="btn btn-sm" data-action="v-rotate">⟳ rotate <small>R</small></button>` : ''}
      ${selected.grid !== 'stash' ? `<button class="btn btn-sm btn-ghost" data-action="v-stash-it">⤓ to stash</button>` : ''}
    </div>`;
  }

  const buildingsHtml = Object.values(BUILDINGS)
    .map((b) => {
      const built = !!G.buildings[b.id];
      const ruined = G.ruined.includes(b.id);
      const r = G.resources;
      const afford = r.gold >= b.costGold && r.wood >= b.costWood && r.stone >= b.costStone;
      const cost = [
        b.costGold ? `◉${b.costGold}` : '',
        b.costWood ? `▤${b.costWood}` : '',
        b.costStone ? `▲${b.costStone}` : '',
      ].filter(Boolean).join(' ');
      let tail: string;
      if (ruined) {
        const c = repairCost(b.id);
        const rcost = [c.gold ? `◉${c.gold}` : '', c.wood ? `▤${c.wood}` : '', c.stone ? `▲${c.stone}` : ''].filter(Boolean).join(' ');
        tail = `<span class="badge-ruined">ruined</span><button class="btn btn-sm btn-warn" data-action="v-repair" data-arg="${b.id}">repair ${rcost}</button>`;
      } else if (built) {
        const extras: string[] = ['<span class="badge-built">built</span>'];
        if (b.shop) extras.push(`<button class="btn btn-sm" data-action="v-buy" data-arg="${b.id}" ${r.gold >= b.shop.price ? '' : 'disabled'}
          title="Buy a ${ITEMS[b.shop.itemId].name}">+${ITEMS[b.shop.itemId].name.split(' ')[0]} ◉${b.shop.price}</button>`);
        if (b.dog && G.kennelLevel < 2) extras.push(`<button class="btn btn-sm" data-action="v-train" ${r.essence >= KENNEL_UPGRADE_ESSENCE ? '' : 'disabled'}
          title="Train the dog: Bite becomes Savage Bite (5 dmg + Bleed)">train ✦${KENNEL_UPGRADE_ESSENCE}</button>`);
        if (b.dog && G.kennelLevel >= 2) extras.push('<span class="badge-built" title="Savage Bite unlocked">trained</span>');
        tail = extras.join('');
      } else {
        tail = `<button class="btn btn-sm" data-action="v-build" data-arg="${b.id}" ${afford ? '' : 'disabled'}>${cost}</button>`;
      }
      return `<div class="building${built && !ruined ? ' built' : ''}${ruined ? ' ruined' : ''}">
        ${art(b.art, 'art-sm')}
        <div class="building-info"><strong>${b.name}</strong><small>${b.desc}</small></div>
        ${tail}
      </div>`;
    })
    .join('');

  const destHtml = Object.values(DESTINATIONS)
    .map((d) => `<button class="dest${destId === d.id ? ' selected' : ''}" data-action="v-dest" data-arg="${d.id}">
        ${art(d.art, 'art-sm')}<span><strong>${d.name}</strong><small>${d.desc}</small></span></button>`)
    .join('');

  const sideHtml = Object.values(SIDEKICKS)
    .filter((s) => !(s.id === 'hound' && hasDog())) // the kennel dog replaces the hired hound
    .map((s) => `<button class="chip${sidekickId === s.id ? ' selected' : ''}" data-action="v-side" data-arg="${s.id}"
        title="${s.desc}">${s.name} ◉${s.cost}</button>`)
    .join('');

  root.innerHTML = `
    ${introModal()}
    <header class="topbar">
      <h1>BURDENED</h1>
      <div class="topbar-mid">${resourceBar()}</div>
      <div class="topbar-right"><span class="hint">runs: ${G.runsCompleted}</span>
        <button class="btn btn-ghost btn-sm" data-action="v-wipe">reset</button></div>
    </header>
    ${tipBanner('village')}
    <main class="village-layout">
      <section class="panel">
        <h2>The Stash</h2>
        <p class="hint">${hint}</p>
        <div class="stash">${stashHtml}</div>
        ${cratesHtml}
      </section>
      <section class="panel panel-pack">
        <h2>The Pack <span class="hint">— your gear IS your deck</span>
          <button class="btn btn-sm btn-ghost tidy-btn" data-action="v-tidy" title="Rearrange the pack to close the gaps">tidy</button></h2>
        ${renderGrid('pack', { cellAction: 'v-cell', itemAction: 'v-item', selectedUid })}
        ${toolbar}
        ${weightBar()}
        <div class="deck-summary">
          <span>${bd.total} cards — <strong>${bd.playable} playable</strong>${bd.burdens ? `, <span class="junk-text">${bd.burdens} dead weight</span>` : ''}</span>
          <button class="btn btn-sm" data-action="v-deck">${deckOpen ? 'hide deck' : 'view deck'}</button>
        </div>
        <p class="hint">${badge ? `Badge: <strong>${ITEMS[badge.itemId].name}</strong>.` : 'No badge worn — your Bash stays plain.'}
          ${hasDog() ? ` The dog comes along (${G.kennelLevel >= 2 ? 'Savage Bite' : 'Bite'} ×2, Fetch).` : ''}</p>
        ${deckOpen ? `<div class="deck-list">${renderDeckList(buildDeck())}</div>` : ''}
      </section>
      <section class="panel">
        <h2>The Village</h2>
        <div class="buildings">${buildingsHtml}</div>
        <h2>Set Out</h2>
        <div class="dests">${destHtml}</div>
        <div class="hire">
          <small class="hint">Hire a sidekick:</small>
          <div class="chips">${sideHtml}</div>
          <button class="chip${mule ? ' selected' : ''}" data-action="v-mule"
            title="A 3×3 side-pack and +40 weight capacity. Adds 2 unplayable 'Cower in Fear' cards.">Pack Mule ◉${MULE_COST} <small>+3×3 pack, +40⚖, +2 curses</small></button>
          ${mule ? '<small class="hint">The mule meets you at the gate — its pack fills as you loot.</small>' : ''}
        </div>
        <button class="btn btn-big" data-action="v-embark">Set out at dawn ${totalCost ? `(◉${totalCost})` : ''}</button>
      </section>
    </main>`;
}
