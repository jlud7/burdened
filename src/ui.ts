import { CARDS, ITEMS, WEIGHT_TIERS } from './data';
import type { ItemDef } from './types';
import { G, gridSize, itemsOn, fits, findItem, dims, carriedWeight, weightCapacity, loadLabel, stageOf, displayName } from './state';
import { art } from './art';

// ---------- delegated actions ----------

type Handler = (arg: string, ev: Event) => void;
const actions = new Map<string, Handler>();

export function action(name: string, fn: Handler): string {
  actions.set(name, fn);
  return name;
}

export function bindRoot(root: HTMLElement) {
  root.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!el) return;
    actions.get(el.dataset.action!)?.(el.dataset.arg ?? '', e);
  });
  // grid placement ghost preview
  root.addEventListener('mouseover', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]');
    if (!cell || !previewUid) return;
    const [grid, xs, ys] = cell.dataset.cell!.split(':');
    previewAt(grid as 'pack' | 'mule', Number(xs), Number(ys));
  });
  root.addEventListener('mouseout', (e) => {
    if ((e.target as HTMLElement).closest('[data-cell]')) clearPreview();
  });
}

// ---------- placement preview ----------

let previewUid: number | null = null;
let lastCell: { grid: 'pack' | 'mule'; x: number; y: number } | null = null;

export function setPreviewUid(uid: number | null) {
  previewUid = uid;
  if (uid == null) lastCell = null;
}

/** re-run the ghost at the last hovered cell (after a rotate or rerender) */
export function refreshPreview() {
  if (lastCell) previewAt(lastCell.grid, lastCell.x, lastCell.y);
}

function previewAt(grid: 'pack' | 'mule', x: number, y: number) {
  clearPreview();
  const inst = previewUid != null ? findItem(previewUid) : undefined;
  if (!inst) return;
  lastCell = { grid, x, y };
  const d = dims(inst);
  const ok = fits(grid, inst, x, y);
  for (let dy = 0; dy < d.h; dy++) {
    for (let dx = 0; dx < d.w; dx++) {
      document
        .querySelector(`[data-cell="${grid}:${x + dx}:${y + dy}"]`)
        ?.classList.add(ok ? 'cell-ok' : 'cell-bad');
    }
  }
}

function clearPreview() {
  document.querySelectorAll('.cell-ok, .cell-bad').forEach((c) => c.classList.remove('cell-ok', 'cell-bad'));
}

// ---------- grid ----------

export function renderGrid(
  grid: 'pack' | 'mule',
  opts: { cellAction?: string; itemAction?: string; itemActionDroppableOnly?: boolean; selectedUid?: number | null } = {},
): string {
  const { w, h } = gridSize(grid);
  let cells = '';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const key = `${grid}:${x}:${y}`;
      const act = opts.cellAction ? `data-action="${opts.cellAction}" data-arg="${key}"` : '';
      cells += `<div class="cell" data-cell="${key}" ${act} style="grid-column:${x + 1};grid-row:${y + 1}"></div>`;
    }
  }
  let items = '';
  for (const inst of itemsOn(grid)) {
    const def = ITEMS[inst.itemId];
    const d = dims(inst);
    const droppableKind = def.kind !== 'gear' && def.kind !== 'badge';
    const clickable = opts.itemAction && (!opts.itemActionDroppableOnly || droppableKind);
    const act = clickable ? `data-action="${opts.itemAction}" data-arg="${inst.uid}"` : '';
    const stage = stageOf(inst);
    const tip = `${displayName(inst)} — ${stage ? stage.desc : def.desc} (⚖${def.weight})`;
    const cls = `grid-item ${def.kind}${opts.selectedUid === inst.uid ? ' selected' : ''}${clickable ? '' : ' static'}`;
    items += `<div class="${cls}" ${act} title="${tip}"
      style="grid-column:${inst.x + 1} / span ${d.w};grid-row:${inst.y + 1} / span ${d.h}">
      ${art(def.art)}<span class="wt-pip">${def.weight}</span></div>`;
  }
  return `<div class="grid grid-${grid}" style="--cols:${w};--rows:${h}">${cells}${items}</div>`;
}

/** compact size / weight / worth chips for an item, used in offers and pickers */
export function itemChips(def: ItemDef): string {
  const bits = [`${def.w}×${def.h}`, `⚖${def.weight}`];
  if (def.gold) bits.push(`◉${def.gold}`);
  if (def.wood) bits.push(`▤${def.wood}`);
  if (def.stone) bits.push(`▲${def.stone}`);
  if (def.essence) bits.push(`✦${def.essence}`);
  if (def.kind === 'crate') bits.push('<span class="junk-text">unidentified</span>');
  return `<span class="chips-mini">${bits.map((b) => `<span class="mini">${b}</span>`).join('')}</span>`;
}

// ---------- the weight bar (GDD v3 §3) ----------

export function weightBar(compact = false): string {
  const wt = carriedWeight();
  const cap = weightCapacity();
  const pct = Math.min(100, Math.round((wt / cap) * 100));
  const tier = loadLabel();
  const ticks = WEIGHT_TIERS.map(
    (t) => `<span class="wt-tick" style="left:${t.at * 100}%" title="${t.label} at ${t.at * 100}%"></span>`,
  ).join('');
  const tierCls = tier === 'Light' ? 'wt-light' : tier === 'Encumbered' ? 'wt-enc' : tier === 'Heavily Encumbered' ? 'wt-heavy' : 'wt-over';
  return `<div class="wt-wrap ${tierCls}${compact ? ' wt-compact' : ''}" title="Carried weight. Crossing a mark injects Burden cards into your deck — drop or eat things to pull them back out.">
    <div class="wt-bar"><div class="wt-fill" style="width:${pct}%"></div>${ticks}
      <span class="wt-label">⚖ ${wt}/${cap}${compact ? '' : ` — ${tier}`}</span></div>
  </div>`;
}

// ---------- statuses ----------

const STATUS_INFO: Record<string, { icon: string; tip: string }> = {
  burn: { icon: '🔥', tip: 'Burn: takes damage as it acts, then fades by 1.' },
  poison: { icon: '☠', tip: 'Poison: takes damage as it acts, then fades by 1.' },
  bleed: { icon: '🩸', tip: 'Bleed: takes damage when it attacks, then fades by 1.' },
  blind: { icon: '✸', tip: 'Blind: its next attack misses.' },
  weak: { icon: '↓', tip: 'Weakened: its next attack is reduced.' },
  sleep: { icon: '💤', tip: 'Drowsy: you start next turn with less energy.' },
  rooted: { icon: '🌿', tip: 'Rooted: you draw fewer cards next turn.' },
  corrosion: { icon: '🧪', tip: 'Corrosion: your Block gains are halved. Fades each turn.' },
};

export function statusChips(statuses: Partial<Record<string, number>>): string {
  const chips = Object.entries(statuses)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => {
      const info = STATUS_INFO[k] ?? { icon: k, tip: k };
      return `<span class="status-chip status-${k}" title="${info.tip}">${info.icon}${v}</span>`;
    })
    .join('');
  return chips ? `<div class="status-row">${chips}</div>` : '<div class="status-row"></div>';
}

// ---------- cards ----------

export function renderCard(defId: string, uid?: number, action?: string, descOverride?: string): string {
  const def = CARDS[defId];
  const act = action && uid != null ? `data-action="${action}" data-arg="${uid}" data-card-uid="${uid}"` : '';
  const cost = def.unplayable ? '✕' : String(def.cost);
  // per the concept cards: art window on top, gem cost overlapping it, ribbon name banner
  return `<div class="card card-${def.type}" ${act}>
    <div class="card-cost"><span>${cost}</span></div>
    <div class="card-art">${art(def.art)}</div>
    <div class="card-name">${def.name}</div>
    <div class="card-desc">${descOverride ?? def.desc}</div>
  </div>`;
}

export function renderDeckList(deck: { defId: string }[]): string {
  const counts = new Map<string, number>();
  for (const c of deck) counts.set(c.defId, (counts.get(c.defId) ?? 0) + 1);
  const rows = [...counts.entries()]
    .sort((a, b) => (CARDS[a[0]].unplayable ? 1 : 0) - (CARDS[b[0]].unplayable ? 1 : 0))
    .map(([id, n]) => {
      const def = CARDS[id];
      return `<div class="deck-row ${def.unplayable ? 'deck-junk' : ''}">
        <span class="deck-count">${n}×</span> <strong>${def.name}</strong> <span class="deck-desc">${def.desc}</span>
      </div>`;
    });
  return rows.join('') || '<div class="deck-row">Your deck is empty. Equip something.</div>';
}

export function resourceBar(): string {
  const r = G.resources;
  return `<span class="res res-gold">◉ ${r.gold}</span>
    <span class="res res-wood">▤ ${r.wood}</span>
    <span class="res res-stone">▲ ${r.stone}</span>
    <span class="res res-essence" title="Magic essence — the Kennel trains with it">✦ ${r.essence}</span>`;
}

export function hpBar(hp: number, max: number, block = 0): string {
  const pct = Math.max(0, Math.round((hp / max) * 100));
  const blockChip = block > 0 ? `<span class="block-chip">🛡 ${block}</span>` : '';
  return `<div class="hp-wrap"><div class="hp-bar"><div class="hp-fill" style="width:${pct}%"></div>
    <span class="hp-label">${hp}/${max}</span></div>${blockChip}</div>`;
}
