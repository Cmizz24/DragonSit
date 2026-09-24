// Daily missions: three are picked per day from this pool using the day number as a seed.
import { seededRng } from '../util.js';

export const MISSION_POOL = [
  { id: 'm_collect', title: 'Coin Collector', desc: (t) => `Collect ${t.toLocaleString()} gold from habitats`, key: 'collect', target: (lvl) => 400 * lvl + 600, reward: (lvl) => ({ gems: 3, gold: 150 * lvl }) },
  { id: 'm_feed', title: 'Snack Time', desc: (t) => `Feed dragons ${t} times`, key: 'feed', target: () => 5, reward: (lvl) => ({ gems: 3, food: 60 * lvl }) },
  { id: 'm_hatch', title: 'Hatch Day', desc: (t) => `Hatch ${t} egg${t > 1 ? 's' : ''}`, key: 'hatch', target: () => 1, reward: (lvl) => ({ gems: 4, gold: 200 * lvl }) },
  { id: 'm_breed', title: 'Love is in the Air', desc: (t) => `Start breeding ${t} time${t > 1 ? 's' : ''}`, key: 'breed', target: () => 1, reward: (lvl) => ({ gems: 4, gold: 150 * lvl }) },
  { id: 'm_harvest', title: 'Green Thumb', desc: (t) => `Harvest ${t} crops`, key: 'harvest', target: () => 3, reward: (lvl) => ({ gems: 3, food: 80 * lvl }) },
  { id: 'm_arena', title: 'Arena Regular', desc: (t) => `Win ${t} arena battles`, key: 'arenaWin', target: () => 2, reward: (lvl) => ({ gems: 5, gold: 250 * lvl }) },
  { id: 'm_campaign', title: 'On the Road', desc: (t) => `Win ${t} campaign battles`, key: 'campaignWin', target: () => 2, reward: (lvl) => ({ gems: 4, gold: 250 * lvl }) },
  { id: 'm_tower', title: 'Tower Run', desc: (t) => `Clear ${t} tower floors`, key: 'towerFloor', target: () => 5, reward: (lvl) => ({ gems: 6, gold: 300 * lvl }) },
  { id: 'm_battles', title: 'Fight Club', desc: (t) => `Fight ${t} battles (any mode)`, key: 'battle', target: () => 4, reward: (lvl) => ({ gems: 4, food: 50 * lvl }) },
  { id: 'm_build', title: 'Builder', desc: (t) => `Place or upgrade ${t} building${t > 1 ? 's' : ''}`, key: 'build', target: () => 1, reward: (lvl) => ({ gems: 3, gold: 200 * lvl }) },
  { id: 'm_friend', title: 'Friendly Rivalry', desc: (t) => `Battle a friend's team ${t} time${t > 1 ? 's' : ''}`, key: 'friendBattle', target: () => 1, reward: (lvl) => ({ gems: 5, gold: 200 * lvl }) },
];

export function missionsForDay(dayNo, playerLevel) {
  const rng = seededRng(90000 + dayNo * 7);
  const pool = [...MISSION_POOL];
  const picked = [];
  while (picked.length < 3 && pool.length) {
    const idx = Math.floor(rng() * pool.length);
    const m = pool.splice(idx, 1)[0];
    const target = m.target(playerLevel);
    picked.push({ id: m.id, title: m.title, desc: m.desc(target), key: m.key, target, reward: m.reward(playerLevel) });
  }
  return picked;
}

export const DAILY_BONUS = { gems: 10, gold: 1000 };
