import { DRAGON_LIST } from './dragons.js';
import { seededRng, weightedPick } from '../util.js';

// 60 campaign stages generated deterministically so they are the same every session.
export const CAMPAIGN_STAGES = [];
export const STAGE_COUNT = 60;
export const HEROIC_LEVEL_BONUS = 10;
export const HEROIC_REWARD_MULT = 3;

const BOSS_NAMES = ['Ember the Bold', 'Captain Tidewrack', 'Gale of the Peaks', 'The Iron Warden', 'Nyx, Queen of Shadows', 'The Eternal Flame',
  'Warden of the Deep', 'Sir Thornback', 'The Hollow King', 'Aurora Prime', 'The Clockmaker', 'The First Keeper'];
const AREA_NAMES = ['Sunny Shores', 'Whispering Woods', 'Thunder Ridge', 'Frostbite Pass', 'Molten Caverns', 'Shadow Marsh',
  'Coral Depths', 'Bramble Keep', 'Hollow Peaks', 'Aurora Fields', 'Clockwork Spire', 'Legend\'s Rest'];

const rng = seededRng(20240917);

for (let i = 0; i < STAGE_COUNT; i++) {
  const stageNo = i + 1;
  const isBoss = stageNo % 5 === 0;
  const base = i < 30 ? 0.6 + i * 0.95 : 29 + (i - 30) * 0.55;
  const level = Math.max(1, Math.round(base + (isBoss ? 1 : 0)));
  const maxUnlock = Math.min(10, 1 + Math.floor(i / 3));
  const pool = DRAGON_LIST.filter((d) => {
    if (d.rarity === 'mythic') return isBoss && stageNo >= 50;
    if (d.rarity === 'legendary') return (isBoss && stageNo >= 25) || stageNo >= 45;
    if (d.rarity === 'epic') return (isBoss && stageNo >= 15) || stageNo >= 26;
    if (d.rarity === 'rare') return stageNo >= 3 && d.unlock <= maxUnlock + 1;
    return d.unlock <= maxUnlock;
  });
  const weights = pool.map((d) => ({ item: d.id, weight: d.rarity === 'common' ? 10 : d.rarity === 'rare' ? 6 : d.rarity === 'epic' ? 3 : 2 }));
  const team = [];
  const teamSize = stageNo <= 2 ? 2 : 3;
  for (let k = 0; k < teamSize; k++) {
    let id = weightedPick(weights, rng);
    let guard = 0;
    while (team.some((t) => t.species === id) && guard++ < 10) id = weightedPick(weights, rng);
    team.push({ species: id, level: Math.max(1, level + (isBoss && k === 2 ? 1 : stageNo <= 2 ? 0 : Math.round((rng() - 0.5) * 2))) });
  }
  const area = AREA_NAMES[Math.floor(i / 5)];
  CAMPAIGN_STAGES.push({
    id: stageNo,
    name: isBoss ? `Boss: ${BOSS_NAMES[Math.floor(stageNo / 5) - 1]}` : `${area} ${(i % 5) + 1}`,
    area,
    boss: isBoss,
    team,
    reward: {
      gold: Math.round((120 + i * 90 + (isBoss ? 400 + i * 40 : 0)) * (1 + i * 0.06)),
      xp: Math.round(30 + i * 25 + (isBoss ? 100 : 0)),
      gems: isBoss ? 5 + Math.floor(i / 5) * 2 : 0,
      food: isBoss ? 100 + i * 20 : 0,
    },
  });
}

// Heroic versions: same teams, +10 levels, triple rewards.
export function heroicStage(stage) {
  return {
    ...stage,
    heroic: true,
    name: `Heroic ${stage.name}`,
    team: stage.team.map((t) => ({ ...t, level: t.level + HEROIC_LEVEL_BONUS })),
    reward: { gold: stage.reward.gold * HEROIC_REWARD_MULT, xp: stage.reward.xp * HEROIC_REWARD_MULT, gems: stage.reward.gems * 2 + (stage.boss ? 10 : 2), food: stage.reward.food * 2 },
  };
}

export const LEAGUES = [
  { name: 'Bronze', min: 0 },
  { name: 'Silver', min: 200 },
  { name: 'Gold', min: 500 },
  { name: 'Platinum', min: 1000 },
  { name: 'Diamond', min: 2000 },
  { name: 'Dragon Master', min: 4000 },
  { name: 'Mythic', min: 8000 },
];

export function leagueFor(trophies) {
  let cur = LEAGUES[0];
  for (const l of LEAGUES) if (trophies >= l.min) cur = l;
  return cur;
}

// ---------- Dragon Tower: endless floors, deterministic per floor ----------
const TOWER_NAMES = ['Gatekeeper', 'Sentinel', 'Warden', 'Champion', 'Overlord', 'Titan', 'Ancient', 'Eternal'];

export function towerFloor(n) {
  const frng = seededRng(7000 + n * 131);
  const boss = n % 10 === 0;
  const level = Math.max(1, Math.round(n * 1.0 + (boss ? 2 : 0)));
  const pool = DRAGON_LIST.filter((d) => {
    if (d.rarity === 'mythic') return n >= 60 || (boss && n >= 40);
    if (d.rarity === 'legendary') return n >= 35 || (boss && n >= 20);
    if (d.rarity === 'epic') return n >= 20 || (boss && n >= 10);
    if (d.rarity === 'rare') return n >= 5;
    return true;
  });
  const weights = pool.map((d) => ({ item: d.id, weight: d.rarity === 'common' ? 10 : d.rarity === 'rare' ? 6 : d.rarity === 'epic' ? 3 : 2 }));
  const team = [];
  const size = n <= 2 ? 2 : 3;
  for (let k = 0; k < size; k++) {
    let id = weightedPick(weights, frng);
    let guard = 0;
    while (team.some((t) => t.species === id) && guard++ < 10) id = weightedPick(weights, frng);
    team.push({ species: id, level: Math.max(1, level + Math.round((frng() - 0.5) * 2)) });
  }
  return {
    floor: n,
    boss,
    name: boss ? `Floor ${n}: ${TOWER_NAMES[Math.min(TOWER_NAMES.length - 1, Math.floor(n / 10) - 1)]}` : `Floor ${n}`,
    team,
    reward: {
      gold: Math.round(150 + n * 110 + n * n * 3),
      xp: Math.round(25 + n * 15),
      gems: n % 5 === 0 ? 3 + Math.floor(n / 5) : 0,
      food: n % 3 === 0 ? 50 + n * 15 : 0,
    },
  };
}
