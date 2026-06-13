/**
 * First-run onboarding: a one-time intro modal and per-screen coach marks.
 * State lives in its own localStorage key (separate from the save) and is
 * cleared on a village reset so a fresh start re-teaches. Kept deliberately
 * light — a banner you dismiss once per screen, never nagging again.
 */
import { action } from './ui';
import { rerender } from './router';

const KEY = 'burdened-tips-v1';

function seenSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
}
function persist(s: Set<string>) {
  try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* private mode */ }
}
export function hasSeen(id: string): boolean { return seenSet().has(id); }
export function markSeen(id: string) { const s = seenSet(); s.add(id); persist(s); }
export function resetTips() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

interface Tip { id: string; title: string; body: string; }

const TIPS: Record<string, Tip> = {
  village: {
    id: 'tip-village', title: 'Your gear is your deck',
    body: 'Click an item in the Stash, then a slot in the Pack. Every weapon, shield and rune you carry adds its cards to your combat deck — no classes, just what you pack. Watch the card count under the grid.',
  },
  map: {
    id: 'tip-map', title: 'Greed has a weight',
    body: 'Every item has a weight (⚖). Push past the marks on the weight bar and dead-weight Burden cards flood your deck. Loot greedily — but get home before the load buries you mid-fight.',
  },
  combat: {
    id: 'tip-combat', title: 'Shed the burden',
    body: 'Greyed Burden cards are your loot choking the deck — you can’t play them. Hit “pack” to eat food or abandon treasure mid-fight; the instant you dip under the line, those cards leave your deck.',
  },
  night: {
    id: 'tip-night', title: 'The road home',
    body: 'Night has fallen. Pick your way back through the nodes you cleared — each can corrupt into an ambush behind you. A lit Torch keeps the dark at bay. Reach the village gate to bank your haul.',
  },
};

/** a dismissible coach mark for a screen, shown only on first encounter */
export function tipBanner(screen: keyof typeof TIPS): string {
  const tip = TIPS[screen];
  if (!tip || hasSeen(tip.id)) return '';
  return `<div class="coach">
    <div class="coach-text"><strong>${tip.title}</strong> ${tip.body}</div>
    <button class="btn btn-sm" data-action="tip-dismiss" data-arg="${tip.id}">got it</button>
  </div>`;
}

/** the one-time first-run intro modal */
export function introModal(): string {
  if (hasSeen('intro')) return '';
  return `<div class="intro-overlay">
    <div class="intro-card">
      <h1>BURDENED</h1>
      <p class="intro-tag">A deckbuilder where your own greed is the enemy.</p>
      <ul class="intro-points">
        <li><strong>Your gear is your deck.</strong> Pack items into a grid — they become your cards.</li>
        <li><strong>Treasure is heavy.</strong> Haul too much and Burden cards choke your hand in combat.</li>
        <li><strong>Get in, grab loot, get home.</strong> At nightfall the road back turns against you.</li>
      </ul>
      <button class="btn btn-big" data-action="tip-intro">Step out the door</button>
    </div>
  </div>`;
}

action('tip-dismiss', (arg) => { markSeen(arg); rerender(); });
action('tip-intro', () => { markSeen('intro'); rerender(); });
