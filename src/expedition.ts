import { DESTINATIONS, SIDEKICKS, MULE_COST, ITEMS } from './data';
import { G, generateExpedition, tick, isNight, pick, weightedPick, maybeCorrupt, extract, spawnItem, autoPlace, destroyItem, perish, save } from './state';
import { startCombat } from './combat';
import { rerender } from './router';

export interface LootEntry {
  itemId: string;
  state: 'pending' | 'taken' | 'left' | 'noroom';
}

export let currentOffer: { title: string; entries: LootEntry[] } | null = null;
export let noteText: string | null = null;
export let packOpen = false;

export function togglePack() {
  packOpen = !packOpen;
  rerender();
}

export function setNote(t: string | null) {
  noteText = t;
}

// ---------- embark / movement ----------

export function embark(destId: string, sidekickId: string | null, mule: boolean) {
  let cost = 0;
  if (sidekickId) cost += SIDEKICKS[sidekickId].cost;
  if (mule) cost += MULE_COST;
  if (G.resources.gold < cost) return;
  G.resources.gold -= cost;
  G.expedition = generateExpedition(destId, sidekickId, mule);
  currentOffer = null;
  noteText = null;
  packOpen = false;
  G.screen = 'map';
  save(); // persists nothing mid-run, but locks in the gold spend if they refresh
  pressOn();
}

export function currentNode() {
  const exp = G.expedition!;
  return exp.pos >= 0 ? exp.nodes[exp.pos] : null;
}

export function pressOn() {
  const exp = G.expedition!;
  if (exp.returning || exp.pos >= exp.nodes.length - 1 && exp.pos !== -1) return;
  exp.pos++;
  tick(1);
  noteText = null;
  const node = exp.nodes[exp.pos];
  if (!node.cleared && (node.type === 'combat' || node.type === 'elite')) {
    fightNode(node.type === 'elite');
  }
  rerender();
}

export function turnBack() {
  const exp = G.expedition!;
  exp.returning = true;
  moveBack();
}

export function moveBack() {
  const exp = G.expedition!;
  exp.pos--;
  tick(1);
  noteText = null;
  if (exp.pos < 0) {
    extract();
    rerender();
    return;
  }
  const node = exp.nodes[exp.pos];
  if (maybeCorrupt(node)) {
    noteText = isNight()
      ? 'Something followed you in the dark. The path you cleared has turned.'
      : 'The path you cleared has corrupted behind you.';
    fightNode(true, true);
  }
  rerender();
}

// ---------- node resolution ----------

function destDef() {
  return DESTINATIONS[G.expedition!.destId];
}

function fightNode(elite: boolean, corrupted = false) {
  const dest = destDef();
  const exp = G.expedition!;
  const node = exp.nodes[exp.pos];
  const enemyId = elite ? pick(dest.elites) : pick(isNight() ? dest.nightEnemies : dest.enemies);
  tick(1);
  startCombat(enemyId, {
    onWin: () => {
      node.cleared = true;
      G.screen = 'map';
      if (elite) {
        openOffer(corrupted ? 'It dropped something heavy.' : 'Its hoard is yours.', [dest.eliteReward]);
      } else {
        openOffer('Spoils of the fight.', [weightedPick(dest.lootTable).itemId]);
      }
    },
  });
}

export function gatherHere() {
  const exp = G.expedition!;
  const node = exp.nodes[exp.pos];
  tick(1);
  node.cleared = true;
  openOffer('You gather what you can.', [weightedPick(destDef().gatherTable).itemId]);
  rerender();
}

export function openTreasure() {
  const exp = G.expedition!;
  const node = exp.nodes[exp.pos];
  tick(1);
  node.cleared = true;
  const t = destDef().lootTable;
  openOffer('A cache, half-buried.', [weightedPick(t).itemId, weightedPick(t).itemId]);
  rerender();
}

export function skipNode() {
  const exp = G.expedition!;
  exp.nodes[exp.pos].cleared = true;
  noteText = 'You leave it be.';
  rerender();
}

const EVENTS = [
  {
    text: 'A forgotten shrine hums under the moss. You kneel for a moment.',
    apply: () => { G.hp = Math.min(G.maxHp, G.hp + 8); return 'Healed 8 HP.'; },
  },
  {
    text: 'A snare, hidden well. It bites your ankle before you cut free.',
    apply: () => { G.hp -= 6; return 'Lost 6 HP.'; },
  },
  {
    text: 'A hollow stump, and inside — someone’s stash, long abandoned.',
    apply: () => { openOffer('Finders keepers.', ['coin_bag']); return 'Found something.'; },
  },
];

export function investigate() {
  const exp = G.expedition!;
  const node = exp.nodes[exp.pos];
  tick(1);
  node.cleared = true;
  const ev = pick(EVENTS);
  const result = ev.apply();
  if (G.hp <= 0) {
    perish();
    rerender();
    return;
  }
  noteText = `${ev.text}  ${result}`;
  rerender();
}

// ---------- loot offers ----------

function openOffer(title: string, itemIds: string[]) {
  currentOffer = { title, entries: itemIds.map((itemId) => ({ itemId, state: 'pending' })) };
}

export function takeLoot(idx: number) {
  if (!currentOffer) return;
  const entry = currentOffer.entries[idx];
  const inst = spawnItem(entry.itemId);
  if (autoPlace(inst)) {
    entry.state = 'taken';
    G.expedition?.lootedUids.push(inst.uid);
  } else {
    destroyItem(inst.uid);
    entry.state = 'noroom';
    packOpen = true; // show the pack so they can drop something
  }
  maybeCloseOffer();
  rerender();
}

export function leaveLoot(idx: number) {
  if (!currentOffer) return;
  currentOffer.entries[idx].state = 'left';
  maybeCloseOffer();
  rerender();
}

export function retryLoot(idx: number) {
  if (!currentOffer) return;
  currentOffer.entries[idx].state = 'pending';
  takeLoot(idx);
}

function maybeCloseOffer() {
  if (currentOffer && currentOffer.entries.every((e) => e.state === 'taken' || e.state === 'left')) {
    currentOffer = null;
  }
}

/** drop a carried loot item mid-run (gear can't be abandoned) */
export function dropLoot(uid: number) {
  const inst = G.items.find((i) => i.uid === uid);
  if (!inst || inst.grid === 'stash') return;
  if (ITEMS[inst.itemId].kind !== 'loot') return;
  destroyItem(uid);
  rerender();
}
