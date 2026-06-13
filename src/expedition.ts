import { DESTINATIONS, SIDEKICKS, MULE_COST, ITEMS, ENEMIES } from './data';
import {
  G, generateExpedition, isNight, pick, weightedPick, maybeCorrupt, extract,
  spawnItem, autoPlace, destroyItem, perish, save, nodeById, reachable,
  consume, healPlayer, ageConsumables, carried,
} from './state';
import type { MapNode } from './types';
import { startCombat } from './combat';
import { startRaid } from './raid';
import { rerender } from './router';

export interface LootEntry {
  itemId: string;
  state: 'pending' | 'taken' | 'left' | 'noroom';
  /** the pack had to be rearranged to fit it */
  repacked?: boolean;
}

export let currentOffer: { title: string; entries: LootEntry[] } | null = null;
export let noteText: string | null = null;
export let packOpen = false;

export function togglePack() {
  packOpen = !packOpen;
  if (!packOpen) pendingDropUid = null;
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
  pendingDropUid = null;
  currentEvent = null;
  campfireTending = false;
  G.screen = 'map';
  save(); // persists nothing mid-run, but locks in the gold spend if they refresh
  rerender();
}

export function currentNode(): MapNode | null {
  const exp = G.expedition!;
  return exp.pos >= 0 ? nodeById(exp.pos) : null;
}

/** the current node no longer demands anything — travel is open */
export function nodeResolved(): boolean {
  const node = currentNode();
  return !node || node.cleared || node.corrupted;
}

/** step to a connected node (out by day, back by night) */
export function moveTo(nodeId: number) {
  const exp = G.expedition!;
  if (!nodeResolved() || currentOffer) return;
  if (!reachable().some((n) => n.id === nodeId)) return;
  exp.pos = nodeId;
  noteText = null;
  currentEvent = null;
  campfireTending = false;
  const node = nodeById(nodeId);

  if (exp.returning && node.cleared) {
    if (maybeCorrupt(node)) {
      noteText = 'Something followed you in the dark. The path you cleared has turned.';
      fightNode({ corrupted: true });
    } else {
      noteText = 'You slip back through in the dark. Nothing stirs — this time.';
    }
  } else if (!node.cleared && (node.type === 'combat' || node.type === 'elite')) {
    fightNode({ elite: node.type === 'elite' });
  }
  rerender();
}

/** flip day to night the moment there's nothing deeper to walk toward */
function maybeNightfall() {
  const exp = G.expedition!;
  if (exp.returning) return;
  const node = currentNode();
  if (node && node.col === exp.cols - 1 && node.cleared) {
    exp.returning = true;
    noteText = 'This is as deep as the path goes. Night falls — time to carry it all home.';
  }
}

export function turnBack() {
  const exp = G.expedition!;
  exp.returning = true;
  noteText = 'You turn for home, and the light dies behind you. Night falls.';
  rerender();
}

/** the last step: from a first-column node into the village */
export function stepHome() {
  const exp = G.expedition!;
  const node = currentNode();
  if (!exp.returning || !node || node.col !== 0 || !nodeResolved()) return;
  const heat = extract();
  if (heat != null) startRaid(heat);
  rerender();
}

// ---------- node resolution ----------

function destDef() {
  return DESTINATIONS[G.expedition!.destId];
}

function fightNode(opts: { elite?: boolean; corrupted?: boolean } = {}) {
  const dest = destDef();
  const exp = G.expedition!;
  const node = currentNode()!;
  let enemyId: string;
  if (opts.elite) {
    enemyId = node.col === exp.cols - 1 && dest.finaleBoss ? dest.finaleBoss : pick(dest.elites);
  } else if (opts.corrupted || isNight()) {
    enemyId = pick(dest.nightEnemies);
  } else {
    enemyId = pick(dest.enemies);
  }
  startCombat(enemyId, {
    elite: opts.elite,
    onWin: () => {
      node.cleared = true;
      G.screen = 'map';
      ageConsumables(); // food ages by battles fought
      const enemy = ENEMIES[enemyId];
      const drops: string[] = [];
      let title: string;
      if (opts.elite) {
        exp.heat += dest.finaleBoss === enemyId ? 2 : 1;
        drops.push(dest.eliteReward);
        title = 'Its hoard is yours — if you can carry it.';
      } else if (opts.corrupted) {
        drops.push('essence_vial');
        title = 'The corruption disperses, leaving something behind.';
      } else {
        drops.push(weightedPick(dest.lootTable).itemId);
        title = 'Spoils of the fight.';
      }
      if (enemy.drop && Math.random() < enemy.drop.chance) drops.push(enemy.drop.itemId);
      if (enemy.essence && !opts.corrupted) drops.push('essence_vial');
      openOffer(title, drops);
      maybeNightfall();
    },
  });
}

export function gatherHere() {
  const node = currentNode()!;
  node.cleared = true;
  openOffer('You gather what you can.', [weightedPick(destDef().gatherTable).itemId]);
  maybeNightfall();
  rerender();
}

export function openTreasure() {
  const node = currentNode()!;
  node.cleared = true;
  const t = destDef().lootTable;
  openOffer('A cache, half-buried.', [weightedPick(t).itemId, weightedPick(t).itemId]);
  maybeNightfall();
  rerender();
}

export function skipNode() {
  currentNode()!.cleared = true;
  noteText = 'You leave it be.';
  currentEvent = null;
  campfireTending = false;
  maybeNightfall();
  rerender();
}

// ---------- "?" events: scenarios with choices (GDD v3 §4) ----------

export interface EventChoice {
  label: string;
  hint?: string;
  enabled?: () => boolean;
  run: () => string;
}
export interface EventDef {
  text: string;
  choices: EventChoice[];
}

const runestones = ['fire_runestone', 'frost_runestone', 'dark_runestone'];

const EVENTS: EventDef[] = [
  {
    text: 'A beggar huddles by the path, eyeing your pack. "Spare a bite, and I\'ll spare a secret."',
    choices: [
      {
        label: 'Give an Apple',
        hint: 'he trades you a runestone',
        enabled: () => carried().some((i) => i.itemId === 'apple'),
        run: () => {
          const apple = carried().find((i) => i.itemId === 'apple')!;
          destroyItem(apple.uid);
          openOffer('He presses a cold stone into your hand.', [pick(runestones)]);
          return 'He devours the apple, core and all.';
        },
      },
      { label: 'Ignore him', run: () => 'He watches you go, saying nothing.' },
    ],
  },
  {
    text: 'A forgotten shrine hums under the moss. Coins glint in the offering bowl.',
    choices: [
      { label: 'Kneel a moment', hint: 'heal 8', run: () => `Warmth spreads through you. Healed ${healPlayer(8)} HP.` },
      {
        label: 'Pry out the offerings',
        hint: 'take the coins',
        run: () => {
          openOffer('The shrine goes quiet.', ['coin_bag']);
          return 'You feel watched all the same.';
        },
      },
    ],
  },
  {
    text: 'A snare, hidden well. It bites your ankle before you cut free.',
    choices: [
      {
        label: 'Cut yourself loose',
        run: () => {
          G.hp -= 6;
          return 'Lost 6 HP. The rope was new — someone hunts these woods.';
        },
      },
    ],
  },
  {
    text: 'A hollow stump, and inside — someone\'s stash, long abandoned.',
    choices: [
      {
        label: 'Take it',
        run: () => {
          openOffer('Finders keepers.', ['coin_bag']);
          return 'Whoever hid it isn\'t coming back.';
        },
      },
      { label: 'Leave it be', run: () => 'Maybe they\'ll return for it. Maybe.' },
    ],
  },
  {
    text: 'A peddler hurries the other way, half his wares abandoned. "Take it off my hands — ten gold, no questions."',
    choices: [
      {
        label: 'Pay 10 gold',
        hint: 'an unopened Ornate Box',
        enabled: () => G.resources.gold >= 10,
        run: () => {
          G.resources.gold -= 10;
          openOffer('He doesn\'t look back.', ['ornate_box']);
          return 'No questions, then. It\'s heavy.';
        },
      },
      { label: 'Wave him on', run: () => 'Whatever he\'s running from, you\'re walking toward it.' },
    ],
  },
];

export let currentEvent: EventDef | null = null;

export function investigate() {
  currentEvent = pick(EVENTS);
  rerender();
}

export function chooseEvent(idx: number) {
  if (!currentEvent) return;
  const choice = currentEvent.choices[idx];
  if (!choice || (choice.enabled && !choice.enabled())) return;
  const node = currentNode()!;
  node.cleared = true;
  const result = choice.run();
  currentEvent = null;
  if (G.hp <= 0) {
    perish();
    rerender();
    return;
  }
  noteText = result;
  maybeNightfall();
  rerender();
}

// ---------- campfire: rest, or tend provisions (GDD v3 §4) ----------

export let campfireTending = false;

export function campRest() {
  const node = currentNode()!;
  node.cleared = true;
  const healed = healPlayer(12);
  noteText = `You sleep an hour by the embers. Healed ${healed} HP.`;
  maybeNightfall();
  rerender();
}

export function campTendList() {
  campfireTending = true;
  rerender();
}

/** items the campfire can improve: raw meat to cook, aging food to refresh */
export function tendable() {
  return carried().filter((i) => {
    const def = ITEMS[i.itemId];
    return (def.cookable && !i.cooked) || (def.stages && (i.age ?? 0) > 0);
  });
}

export function campTend(uid: number) {
  const inst = carried().find((i) => i.uid === uid);
  if (!inst) return;
  const def = ITEMS[inst.itemId];
  const node = currentNode()!;
  if (def.cookable && !inst.cooked) {
    inst.cooked = true;
    noteText = `The ${def.name.toLowerCase()} sizzles over the fire. Cooked!`;
  } else if (def.stages) {
    inst.age = 0;
    noteText = `You trim and wrap the ${def.name.toLowerCase()}. Fresh as the day you found it.`;
  } else {
    return;
  }
  node.cleared = true;
  campfireTending = false;
  maybeNightfall();
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
  const placed = autoPlace(inst);
  if (placed) {
    entry.state = 'taken';
    entry.repacked = placed === 'repacked';
    G.expedition?.lootedUids.push(inst.uid);
  } else {
    destroyItem(inst.uid);
    entry.state = 'noroom'; // the offer shows a discard picker for this entry
    packOpen = true;
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

/** drop a carried item mid-run (gear and badges can't be abandoned) */
export function dropLoot(uid: number) {
  const inst = G.items.find((i) => i.uid === uid);
  if (!inst || inst.grid === 'stash') return;
  const kind = ITEMS[inst.itemId].kind;
  if (kind === 'gear' || kind === 'badge') return;
  destroyItem(uid);
  if (pendingDropUid === uid) pendingDropUid = null;
  rerender();
}

/** eat/drink something from the pack while on the road */
export function mapConsume(uid: number) {
  const res = consume(uid, false);
  noteText = res.msg;
  if (pendingDropUid === uid) pendingDropUid = null;
  rerender();
}

/** drop something to make room, then immediately retry the blocked offer entry */
export function dropAndRetry(entryIdx: number, uid: number) {
  const inst = G.items.find((i) => i.uid === uid);
  if (!inst || inst.grid === 'stash') return;
  const kind = ITEMS[inst.itemId].kind;
  if (kind === 'gear' || kind === 'badge') return;
  destroyItem(uid);
  if (pendingDropUid === uid) pendingDropUid = null;
  retryLoot(entryIdx);
}

// two-step confirm for dropping loot straight from the pack panel (misclick insurance)
export let pendingDropUid: number | null = null;

export function requestDrop(uid: number) {
  pendingDropUid = pendingDropUid === uid ? null : uid;
  rerender();
}

export function cancelDrop() {
  pendingDropUid = null;
  rerender();
}
