import { DRAGON_LIST } from './dragons.js';
import { seededRng, weightedPick } from '../util.js';

// 30 campaign stages generated deterministically so they are the same every session.
export const CAMPAIGN_STAGES = [];

const BOSS_NAMES = ['Ember the Bold', 'Captain Tidewrack', 'Gale of the Peaks', 'The Iron Warden', 'Nyx, Queen of Shadows', 'The Eternal Flame'];
const AREA_NAMES = ['Sunny Shores', 'Whispering Woods', 'Thunder Ridge', 'Frostbite Pass', 'Molten Caverns', 'Shadow Marsh'];

const rng = seededRng(20240917);

for (let i = 0; i < 30; i++) {
  const stageNo = i + 1;
  const isBoss = stageNo % 5 === 0;
  const level = Math.max(1, Math.round(0.6 + i * 0.95 + (isBoss ? 1 : 0)));
  const maxUnlock = Math.min(10, 1 + Math.floor(i / 3));
  const pool = DRAGON_LIST.filter((d) => {
    if (d.rarity === 'legendary') return isBoss && stageNo >= 25;
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
  CAMPAIGN_STAGES.push({
    id: stageNo,
    name: isBoss ? `Boss: ${BOSS_NAMES[Math.floor(stageNo / 5) - 1]}` : `${AREA_NAMES[Math.floor(i / 5)]} ${(i % 5) + 1}`,
    area: AREA_NAMES[Math.floor(i / 5)],
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

export const LEAGUES = [
  { name: 'Bronze', min: 0 },
  { name: 'Silver', min: 200 },
  { name: 'Gold', min: 500 },
  { name: 'Platinum', min: 1000 },
  { name: 'Diamond', min: 2000 },
  { name: 'Dragon Master', min: 4000 },
];

export function leagueFor(trophies) {
  let cur = LEAGUES[0];
  for (const l of LEAGUES) if (trophies >= l.min) cur = l;
  return cur;
}
