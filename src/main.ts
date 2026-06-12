import './styles.css';
import { G, load } from './state';
import { setRender } from './router';
import { bindRoot } from './ui';
import { renderVillage } from './screens/village';
import { renderMap } from './screens/map';
import { renderCombat } from './screens/combatScreen';
import { renderSummary } from './screens/summary';

const root = document.getElementById('app')!;

function render() {
  if (G.screen !== 'map' && G.screen !== 'combat') document.body.className = '';
  switch (G.screen) {
    case 'village': renderVillage(root); break;
    case 'map': renderMap(root); break;
    case 'combat': renderCombat(root); break;
    case 'summary': renderSummary(root); break;
  }
}

setRender(render);
bindRoot(document.body);
load();
render();
