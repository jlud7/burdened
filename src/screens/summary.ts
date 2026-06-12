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
  ].filter(Boolean);

  const lootList = (run.loot ?? []).map((l) => `${l.n}× ${l.name}`).join(', ');

  const body = run.survived
    ? `<h1>You made it home${run.nights ? ' — barely, in the dark' : ''}.</h1>
       ${art('summary_home', 'art-xl')}
       ${lootList ? `<p class="hint">Out of the pack, onto the table: ${lootList}.</p>` : ''}
       <p>${gains.length ? `The village takes stock: <strong>${gains.join(', ')}</strong>.` : 'You came back with empty pockets, but you came back.'}</p>`
    : `<h1>You didn't make it back.</h1>
       ${art('summary_lost', 'art-xl')}
       ${lootList ? `<p class="hint">Lost on the road: ${lootList}.</p>` : ''}
       <p>Everything you carried is gone. The village endures, and your gear finds its way home.</p>`;

  root.innerHTML = `
    <main class="summary-main">
      <div class="panel summary-panel">
        ${body}
        <div class="summary-res">${resourceBar()}</div>
        <button class="btn btn-big" data-action="s-home">Return to the village</button>
      </div>
    </main>`;
}
