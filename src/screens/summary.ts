import { G } from '../state';
import { action, resourceBar } from '../ui';
import { art } from '../art';
import { rerender } from '../router';

action('s-home', () => {
  G.screen = 'village';
  G.lastRun = null;
  rerender();
});

export function renderSummary(root: HTMLElement) {
  const run = G.lastRun;
  document.body.className = '';
  if (!run) {
    G.screen = 'village';
    rerender();
    return;
  }
  const gains = [
    run.gold ? `◉ ${run.gold} gold` : '',
    run.wood ? `▤ ${run.wood} wood` : '',
    run.stone ? `▲ ${run.stone} stone` : '',
    run.essence ? `✦ ${run.essence} essence` : '',
  ].filter(Boolean);

  const lootList = (run.loot ?? []).map((l) => `${l.n}× ${l.name}`).join(', ');

  let raidHtml = '';
  if (run.raid) {
    raidHtml = run.raid.won
      ? `<div class="raid-result raid-won"><strong>⚑ Your haul was followed home — and the village held.</strong>
         <p>The raiders broke at the gate. Salvage: ◉ ${run.raid.gold ?? 0} gold, ✦ ${run.raid.essence ?? 0} essence.</p></div>`
      : `<div class="raid-result raid-lost"><strong>⚑ Your haul was followed home — and the village paid.</strong>
         <p>${run.raid.ruined ? `The <strong>${run.raid.ruined}</strong> burned. Repair it with resources — nothing is ever lost for good.` : 'They found nothing worth burning.'}</p></div>`;
  }

  const body = run.survived
    ? `<h1>You made it home${run.nights ? ' — through the dark' : ''}.</h1>
       ${art('summary_home', 'art-xl')}
       ${lootList ? `<p class="hint">Out of the pack, onto the table: ${lootList}.</p>` : ''}
       ${run.crates ? `<p class="hint">${run.crates} unopened crate${run.crates > 1 ? 's' : ''} wait${run.crates > 1 ? '' : 's'} in the stash for the Blacksmith.</p>` : ''}
       <p>${gains.length ? `The village takes stock: <strong>${gains.join(', ')}</strong>.` : 'You came back with empty pockets, but you came back.'}</p>`
    : `<h1>You didn't make it back.</h1>
       ${art('summary_lost', 'art-xl')}
       ${lootList ? `<p class="hint">Lost on the road: ${lootList}.</p>` : ''}
       <p>Everything you carried is gone. The village endures, and your gear finds its way home.</p>`;

  root.innerHTML = `
    <main class="summary-main">
      <div class="panel summary-panel">
        ${body}
        ${raidHtml}
        <div class="summary-res">${resourceBar()}</div>
        <button class="btn btn-big" data-action="s-home">Return to the village</button>
      </div>
    </main>`;
}
