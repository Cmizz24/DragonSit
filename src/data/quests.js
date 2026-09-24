// Quests double as the tutorial: each has a check(state) returning [progress, target].

export const QUESTS = [
  { id: 'q_collect', title: 'First Coins', desc: 'Collect gold from a habitat.', reward: { gold: 100, xp: 20 }, check: (s) => [s.stats.collected > 0 ? 1 : 0, 1] },
  { id: 'q_earth', title: 'Room to Grow', desc: 'Build an Earth Habitat.', reward: { gold: 150, xp: 30 }, check: (s) => [count(s, 'habitat_earth'), 1] },
  { id: 'q_terra', title: 'New Friend', desc: 'Buy a Terra Dragon from the shop.', reward: { gold: 200, gems: 3, xp: 30 }, check: (s) => [s.stats.bought.includes('terra') ? 1 : 0, 1] },
  { id: 'q_hatch', title: 'Crack!', desc: 'Hatch an egg in the Hatchery.', reward: { gold: 200, food: 50, xp: 30 }, check: (s) => [s.stats.hatched, 1] },
  { id: 'q_farm', title: 'Dinner Time', desc: 'Grow food on your farm.', reward: { gold: 150, xp: 20 }, check: (s) => [s.stats.grown, 1] },
  { id: 'q_feed', title: 'Growing Up', desc: 'Feed a dragon to level 3.', reward: { gold: 300, gems: 2, xp: 40 }, check: (s) => [Math.max(0, ...s.dragons.map((d) => d.level)) >= 3 ? 1 : 0, 1] },
  { id: 'q_breeding', title: 'Love Mountain', desc: 'Build the Breeding Mountain.', reward: { gold: 300, xp: 50 }, check: (s) => [count(s, 'breeding'), 1] },
  { id: 'q_breed', title: 'Matchmaker', desc: 'Breed two dragons.', reward: { gold: 400, gems: 5, xp: 60 }, check: (s) => [s.stats.bred, 1] },
  { id: 'q_battle', title: 'Into the Arena', desc: 'Win your first campaign battle.', reward: { gold: 500, gems: 3, xp: 60 }, check: (s) => [s.battle.campaignCleared, 1] },
  { id: 'q_hybrid', title: 'Hybrid Vigour', desc: 'Own a Rare dragon.', reward: { gold: 800, gems: 5, xp: 100 }, check: (s) => [s.dragons.some((d) => rarityOf(d.species) === 'rare') ? 1 : 0, 1] },
  { id: 'q_three', title: 'Full House', desc: 'Own 5 dragons.', reward: { gold: 600, xp: 80 }, check: (s) => [s.dragons.length, 5] },
  { id: 'q_deco', title: 'Home Sweet Home', desc: 'Place 3 decorations.', reward: { gold: 300, gems: 2, xp: 40 }, check: (s) => [s.buildings.filter((b) => b.def.startsWith('deco_')).length, 3] },
  { id: 'q_level5', title: 'Rising Star', desc: 'Reach player level 5.', reward: { gold: 1500, gems: 10, xp: 0 }, check: (s) => [s.player.level, 5] },
  { id: 'q_stage5', title: 'Campaign Veteran', desc: 'Clear 5 campaign stages.', reward: { gold: 2000, gems: 8, xp: 200 }, check: (s) => [s.battle.campaignCleared, 5] },
  { id: 'q_water', title: 'Making Waves', desc: 'Build a Water Habitat.', reward: { gold: 800, xp: 80 }, check: (s) => [count(s, 'habitat_water'), 1] },
  { id: 'q_upgrade', title: 'Bigger and Better', desc: 'Upgrade any habitat.', reward: { gold: 1500, gems: 4, xp: 120 }, check: (s) => [s.buildings.some((b) => b.type === 'habitat' && b.level >= 2) ? 1 : 0, 1] },
  { id: 'q_book10', title: 'Collector', desc: 'Discover 10 dragon species.', reward: { gold: 3000, gems: 10, xp: 300 }, check: (s) => [s.discovered.length, 10] },
  { id: 'q_arena', title: 'Gladiator', desc: 'Win 5 arena battles.', reward: { gold: 2500, gems: 8, xp: 250 }, check: (s) => [s.battle.arenaWins, 5] },
  { id: 'q_level10', title: 'Dragon Keeper', desc: 'Reach player level 10.', reward: { gold: 10000, gems: 25, xp: 0 }, check: (s) => [s.player.level, 10] },
  { id: 'q_expand', title: 'New Horizons', desc: 'Expand your island.', reward: { gold: 4000, gems: 10, xp: 400 }, check: (s) => [s.isles[0].zones.length - 1, 1] },
  { id: 'q_epic', title: 'Something Epic', desc: 'Own an Epic dragon.', reward: { gold: 15000, gems: 30, xp: 1000 }, check: (s) => [s.dragons.some((d) => rarityOf(d.species) === 'epic') ? 1 : 0, 1] },
  { id: 'q_stage15', title: 'Campaign Hero', desc: 'Clear 15 campaign stages.', reward: { gold: 20000, gems: 30, xp: 2000 }, check: (s) => [s.battle.campaignCleared, 15] },
  { id: 'q_level15', title: 'Master Breeder', desc: 'Reach player level 15.', reward: { gold: 40000, gems: 50, xp: 0 }, check: (s) => [s.player.level, 15] },
  { id: 'q_book25', title: 'Archivist', desc: 'Discover 25 dragon species.', reward: { gold: 50000, gems: 60, xp: 3000 }, check: (s) => [s.discovered.length, 25] },
  { id: 'q_legend', title: 'Living Legend', desc: 'Own a Legendary dragon.', reward: { gold: 200000, gems: 150, xp: 10000 }, check: (s) => [s.dragons.some((d) => rarityOf(d.species) === 'legendary') ? 1 : 0, 1] },
  { id: 'q_stage30', title: 'Champion of the Isles', desc: 'Clear 30 campaign stages.', reward: { gold: 500000, gems: 300, xp: 20000 }, check: (s) => [s.battle.campaignCleared, 30] },
  { id: 'q_tower10', title: 'Stairway', desc: 'Reach floor 10 of the Dragon Tower.', reward: { gold: 20000, gems: 20, xp: 1500 }, check: (s) => [s.tower.best, 10] },
  { id: 'q_friend', title: 'Better Together', desc: 'Add a friend with their trainer card.', reward: { gold: 5000, gems: 15, xp: 500 }, check: (s) => [s.friends.length, 1] },
  { id: 'q_missions', title: 'Daily Routine', desc: 'Complete 3 daily missions.', reward: { gold: 8000, gems: 10, xp: 800 }, check: (s) => [s.stats.missionsDone, 3] },
  { id: 'q_mine', title: 'Dig Deep', desc: 'Build a Crystal Mine.', reward: { gold: 30000, gems: 20, xp: 2000 }, check: (s) => [count(s, 'mine'), 1] },
  { id: 'q_sky', title: 'Head in the Clouds', desc: 'Unlock the Sky Isle.', reward: { gold: 100000, gems: 60, xp: 8000 }, check: (s) => [s.isles.length, 2] },
  { id: 'q_star', title: 'Shooting Star', desc: 'Empower a dragon with a star.', reward: { gold: 50000, gems: 30, xp: 5000 }, check: (s) => [s.dragons.some((d) => (d.stars || 0) > 0) ? 1 : 0, 1] },
  { id: 'q_heroic5', title: 'Heroic Deeds', desc: 'Clear 5 heroic campaign stages.', reward: { gold: 300000, gems: 100, xp: 20000 }, check: (s) => [s.battle.heroicCleared, 5] },
  { id: 'q_tower30', title: 'Sky High', desc: 'Reach floor 30 of the Dragon Tower.', reward: { gold: 200000, gems: 80, xp: 15000 }, check: (s) => [s.tower.best, 30] },
  { id: 'q_stage60', title: 'End of the Road', desc: 'Clear all 60 campaign stages.', reward: { gold: 2000000, gems: 500, xp: 80000 }, check: (s) => [s.battle.campaignCleared, 60] },
  { id: 'q_ember', title: 'Into the Fire', desc: 'Unlock the Ember Isle.', reward: { gold: 500000, gems: 150, xp: 30000 }, check: (s) => [s.isles.length, 3] },
  { id: 'q_mythic', title: 'Myth Made Real', desc: 'Own a Mythic dragon.', reward: { gold: 3000000, gems: 600, xp: 100000 }, check: (s) => [s.dragons.some((d) => rarityOf(d.species) === 'mythic') ? 1 : 0, 1] },
];

let rarityLookup = null;
export function setRarityLookup(fn) {
  rarityLookup = fn;
}
function rarityOf(id) {
  return rarityLookup ? rarityLookup(id) : 'common';
}
function count(s, defId) {
  return s.buildings.filter((b) => b.def === defId).length;
}
