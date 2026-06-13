import { BUILDINGS, RAID_POOL, RAID_BOSS } from './data';
import { G, pick, save } from './state';
import { startCombat } from './combat';

/** wave metadata for the combat screen's raid banner */
export let raidMeta: { totalWaves: number; heat: number } | null = null;

/**
 * The haul dragged something home (GDD v3 §8): waves of raiders at the gate.
 * The deck swaps burdens and hirelings for Town Cards from standing buildings.
 * Losing ruins a building — never the save.
 */
export function startRaid(heat: number) {
  const waveCount = heat >= 4 ? 3 : 2;
  const ids: string[] = [];
  for (let i = 0; i < waveCount - 1; i++) ids.push(pick(RAID_POOL));
  ids.push(heat >= 4 ? RAID_BOSS : pick(RAID_POOL));
  raidMeta = { totalWaves: ids.length, heat };
  const first = ids.shift()!;
  startCombat(first, {
    raid: true,
    waves: ids,
    onWin: () => raidWon(heat),
    onLose: () => raidLost(),
  });
}

function raidWon(heat: number) {
  const gold = 10 * heat;
  const essence = heat;
  G.resources.gold += gold;
  G.resources.essence += essence;
  if (G.lastRun) G.lastRun.raid = { won: true, gold, essence };
  raidMeta = null;
  G.hp = G.maxHp;
  G.screen = 'summary';
  save();
}

function raidLost() {
  const standing = Object.keys(G.buildings).filter((id) => G.buildings[id] && !G.ruined.includes(id));
  let ruined: string | undefined;
  if (standing.length) {
    const id = pick(standing);
    G.ruined.push(id);
    ruined = BUILDINGS[id].name;
  }
  if (G.lastRun) G.lastRun.raid = { won: false, ruined };
  raidMeta = null;
  G.combat = null;
  G.hp = G.maxHp;
  G.screen = 'summary';
  save();
}
