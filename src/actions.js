// All game-state mutations live here. Each returns { ok, error?, ...data } so the UI can report.
import { now, gemsToSkip } from './util.js';
import { BUILDINGS, FOOD_OPTIONS, ZONES, ISLES, zoneAt, zoneCost, ISLAND_SIZE } from './data/buildings.js';
import { DRAGONS } from './data/dragons.js';
import { QUESTS } from './data/quests.js';
import { CAMPAIGN_STAGES, heroicStage, towerFloor } from './data/campaign.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { missionsForDay, DAILY_BONUS } from './data/missions.js';
import { dayKey, dayNumber, weekKey } from './data/events.js';
import { makeBuilding, makeDragon } from './state.js';
import * as eco from './economy.js';
import { pickOffspring, breedDuration, BREED_MIN_LEVEL } from './breeding.js';
import { decodeCard, parseGiftCode, giftCode, GIFT_REWARD } from './social.js';
import { unitsFromDragons } from './battle.js';

export const ARENA_COOLDOWN = 3 * 60 * 1000;
export const DAILY_INTERVAL = 20 * 60 * 60 * 1000;
export const TOWER_HEAL = 0.15;

const fail = (error) => ({ ok: false, error });
const rarityOf = (id) => (DRAGONS[id] ? DRAGONS[id].rarity : 'common');

export function tick(state, t = now()) {
  const dtMin = Math.max(0, t - state.lastTick) / 60000;
  state.lastTick = t;
  let earned = 0;
  for (const b of state.buildings) {
    if (b.type === 'habitat') {
      const cap = eco.habitatGoldCap(b);
      const before = b.gold;
      b.gold = Math.min(cap, b.gold + eco.habitatRate(state, b) * dtMin);
      earned += b.gold - before;
    } else if (b.type === 'mine') {
      b.gems = Math.min(mineCap(b), b.gems + (eco.mineGemsPerHour(b) * dtMin) / 60);
    }
  }
  ensureMissions(state, t);
  ensureTowerWeek(state, t);
  return { earned };
}

// ---------- isles / zones ----------

export function isleState(state, isleId = state.currentIsle) {
  return state.isles.find((i) => i.id === isleId) || null;
}

export function cellUnlocked(state, x, y, isle = state.currentIsle) {
  if (x < 0 || y < 0 || x >= ISLAND_SIZE || y >= ISLAND_SIZE) return false;
  const is = isleState(state, isle);
  return !!is && is.zones.includes(zoneAt(x, y));
}

export function occupancy(state, ignoreId = null, isle = state.currentIsle) {
  const map = new Map();
  for (const b of state.buildings) {
    if (b.id === ignoreId || (b.isle || 0) !== isle) continue;
    for (let dx = 0; dx < b.size; dx++) for (let dy = 0; dy < b.size; dy++) map.set(`${b.x + dx},${b.y + dy}`, b);
  }
  return map;
}

export function canPlace(state, size, x, y, ignoreId = null, isle = state.currentIsle) {
  const occ = occupancy(state, ignoreId, isle);
  for (let dx = 0; dx < size; dx++) {
    for (let dy = 0; dy < size; dy++) {
      if (!cellUnlocked(state, x + dx, y + dy, isle)) return false;
      if (occ.has(`${x + dx},${y + dy}`)) return false;
    }
  }
  return true;
}

export function buildingAt(state, x, y, isle = state.currentIsle) {
  return occupancy(state, null, isle).get(`${x},${y}`) || null;
}

export function nextZone(state, isleId = state.currentIsle) {
  const is = isleState(state, isleId);
  if (!is) return null;
  const z = ZONES.find((zz) => !is.zones.includes(zz.id));
  return z ? { ...z, price: zoneCost(isleId, z) } : null;
}

export function buyZone(state, useGems, isleId = state.currentIsle) {
  const next = nextZone(state, isleId);
  if (!next) return fail('This isle is fully expanded');
  if (useGems) {
    if (state.player.gems < next.price.gems) return fail('Not enough gems');
    state.player.gems -= next.price.gems;
  } else {
    if (state.player.gold < next.price.gold) return fail('Not enough gold');
    state.player.gold -= next.price.gold;
  }
  isleState(state, isleId).zones.push(next.id);
  const xpEvents = addXp(state, 100 * next.id * ISLES[isleId].zoneMult);
  return { ok: true, zone: next, xpEvents };
}

export function nextIsle(state) {
  return ISLES.find((i) => !state.isles.some((o) => o.id === i.id)) || null;
}

export function buyIsle(state) {
  const next = nextIsle(state);
  if (!next) return fail('You own every isle');
  if (state.player.level < next.unlock) return fail(`Unlocks at level ${next.unlock}`);
  if (!eco.canAfford(state, next.cost)) return fail('Not enough gold');
  pay(state, next.cost);
  state.isles.push({ id: next.id, zones: [0] });
  state.currentIsle = next.id;
  const xpEvents = addXp(state, 2000 * next.id);
  return { ok: true, isle: next, xpEvents };
}

export function setIsle(state, id) {
  if (!isleState(state, id)) return fail('You do not own that isle');
  state.currentIsle = id;
  return { ok: true };
}

// ---------- buildings ----------

export function countBuildings(state, defId) {
  return state.buildings.filter((b) => b.def === defId).length;
}

export function buildAvailability(state, defId) {
  const def = BUILDINGS[defId];
  if (state.player.level < def.unlock) return { ok: false, error: `Unlocks at level ${def.unlock}` };
  if (def.max && countBuildings(state, defId) >= def.max) return { ok: false, error: def.max === 1 ? 'Already built' : `Maximum of ${def.max} built` };
  if (def.requires && countBuildings(state, def.requires) === 0) return { ok: false, error: `Requires ${BUILDINGS[def.requires].name}` };
  if (!eco.canAfford(state, def.cost)) return { ok: false, error: 'Not enough ' + (def.cost.gems ? 'gems' : 'gold') };
  return { ok: true };
}

export function placeBuilding(state, defId, x, y, isle = state.currentIsle) {
  const def = BUILDINGS[defId];
  const avail = buildAvailability(state, defId);
  if (!avail.ok) return avail;
  if (!canPlace(state, def.size, x, y, null, isle)) return fail('Cannot build there');
  pay(state, def.cost);
  const b = makeBuilding(defId, x, y, isle);
  state.buildings.push(b);
  bump(state, 'build');
  const xpEvents = addXp(state, def.xp);
  return { ok: true, building: b, xpEvents };
}

export function moveBuilding(state, b, x, y) {
  if (!canPlace(state, b.size, x, y, b.id, b.isle || 0)) return fail('Cannot move there');
  b.x = x;
  b.y = y;
  return { ok: true };
}

export function sellBuilding(state, b) {
  const def = BUILDINGS[b.def];
  if (def.type === 'hatchery') return fail('You cannot sell the Hatchery');
  if (def.type === 'habitat' && b.dragons.length > 0) return fail('Move the dragons out first');
  if (def.type === 'temple') return fail('Temples cannot be sold');
  const value = eco.sellValueBuilding(b);
  state.player.gold += value;
  state.buildings = state.buildings.filter((x) => x.id !== b.id);
  return { ok: true, value };
}

export function upgradeBuilding(state, b) {
  const cost = eco.upgradeCost(b);
  if (cost == null) return fail('Already at max level');
  if (state.player.gold < cost) return fail('Not enough gold');
  state.player.gold -= cost;
  b.level++;
  bump(state, 'build');
  const xpEvents = addXp(state, Math.round(BUILDINGS[b.def].xp * b.level));
  return { ok: true, xpEvents };
}

export function collectHabitat(state, b) {
  const amount = Math.floor(b.gold);
  if (amount <= 0) return { ok: true, amount: 0 };
  b.gold -= amount;
  state.player.gold += amount;
  state.stats.collected += amount;
  bump(state, 'collect', amount);
  return { ok: true, amount };
}

export function collectAll(state) {
  let total = 0;
  let gems = 0;
  for (const b of state.buildings) {
    if (b.type === 'habitat') total += collectHabitat(state, b).amount;
    if (b.type === 'mine') gems += collectMine(state, b).amount;
  }
  return { ok: true, amount: total, gems };
}

export function mineCap(b) {
  return 4 + b.level * 2;
}

export function collectMine(state, b) {
  const amount = Math.floor(b.gems);
  if (amount <= 0) return { ok: true, amount: 0 };
  b.gems -= amount;
  state.player.gems += amount;
  return { ok: true, amount };
}

// ---------- currency / xp ----------

export function pay(state, cost) {
  if (!cost) return;
  if (cost.gold) state.player.gold -= cost.gold;
  if (cost.gems) state.player.gems -= cost.gems;
  if (cost.food) state.player.food -= cost.food;
}

export function grantReward(state, reward) {
  if (!reward) return [];
  if (reward.gold) state.player.gold += reward.gold;
  if (reward.gems) state.player.gems += reward.gems;
  if (reward.food) state.player.food += reward.food;
  return reward.xp ? addXp(state, reward.xp) : [];
}

export function addXp(state, amount) {
  const events = [];
  if (!amount) return events;
  state.player.xp += amount;
  while (state.player.xp >= eco.xpForLevel(state.player.level)) {
    state.player.xp -= eco.xpForLevel(state.player.level);
    state.player.level++;
    const gems = eco.levelUpGems(state.player.level);
    state.player.gems += gems;
    events.push({ type: 'levelup', level: state.player.level, gems });
  }
  return events;
}

// ---------- dragons ----------

export function hatchery(state) {
  return state.buildings.find((b) => b.type === 'hatchery') || null;
}

export function freeEggSlots(state) {
  const h = hatchery(state);
  if (!h) return 0;
  return eco.hatcherySlots(h) - state.eggs.length;
}

export function buyDragon(state, speciesId) {
  const sp = DRAGONS[speciesId];
  const price = eco.dragonPrice(sp);
  if (!price) return fail('This dragon can only be bred');
  if (state.player.level < sp.unlock) return fail(`Unlocks at level ${sp.unlock}`);
  if (!eco.canAfford(state, price)) return fail('Not enough ' + (price.gems ? 'gems' : 'gold'));
  if (freeEggSlots(state) <= 0) return fail('Hatchery is full');
  pay(state, price);
  const egg = { id: `e_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, species: speciesId, startedAt: now(), doneAt: now() + sp.hatchTime, source: 'shop' };
  state.eggs.push(egg);
  if (!state.stats.bought.includes(speciesId)) state.stats.bought.push(speciesId);
  return { ok: true, egg };
}

export function habitatsFor(state, speciesId) {
  const sp = DRAGONS[speciesId];
  return state.buildings.filter((b) => b.type === 'habitat' && sp.elements.includes(b.element));
}

export function habitatsWithRoom(state, speciesId) {
  return habitatsFor(state, speciesId).filter((b) => b.dragons.length < eco.habitatCapacity(b));
}

export function hatchEgg(state, eggId, habitatId) {
  const egg = state.eggs.find((e) => e.id === eggId);
  if (!egg) return fail('Egg not found');
  if (now() < egg.doneAt) return fail('Still incubating');
  const hab = state.buildings.find((b) => b.id === habitatId);
  if (!hab || hab.type !== 'habitat') return fail('Pick a habitat');
  const sp = DRAGONS[egg.species];
  if (!sp.elements.includes(hab.element)) return fail('Wrong habitat element');
  if (hab.dragons.length >= eco.habitatCapacity(hab)) return fail('Habitat is full');
  const d = makeDragon(egg.species, hab.id);
  state.dragons.push(d);
  hab.dragons.push(d.id);
  state.eggs = state.eggs.filter((e) => e.id !== eggId);
  state.stats.hatched++;
  bump(state, 'hatch');
  const isNew = !state.discovered.includes(egg.species);
  if (isNew) state.discovered.push(egg.species);
  const xpEvents = addXp(state, sp.xp);
  return { ok: true, dragon: d, isNew, xpEvents };
}

export function moveDragon(state, dragon, habitatId) {
  const hab = state.buildings.find((b) => b.id === habitatId);
  if (!hab || hab.type !== 'habitat') return fail('Pick a habitat');
  if (!DRAGONS[dragon.species].elements.includes(hab.element)) return fail('Wrong habitat element');
  if (hab.dragons.length >= eco.habitatCapacity(hab)) return fail('Habitat is full');
  if (dragon.habitat === hab.id) return fail('Already lives there');
  const old = state.buildings.find((b) => b.id === dragon.habitat);
  if (old) old.dragons = old.dragons.filter((id) => id !== dragon.id);
  hab.dragons.push(dragon.id);
  dragon.habitat = hab.id;
  return { ok: true };
}

export function feedDragon(state, dragon) {
  const cap = eco.levelCap(state);
  if (dragon.level >= cap) return fail(cap >= 40 ? 'Max level reached' : `Build a Temple to raise the level cap (${cap})`);
  const cost = eco.foodForLevel(dragon.level);
  if (state.player.food < cost) return fail('Not enough food');
  state.player.food -= cost;
  dragon.level++;
  state.stats.fed++;
  bump(state, 'feed');
  const xpEvents = addXp(state, 4 + dragon.level * 2);
  return { ok: true, level: dragon.level, xpEvents };
}

export function empowerDragon(state, dragon) {
  if (dragon.level < eco.EMPOWER_MIN_LEVEL) return fail(`Reach level ${eco.EMPOWER_MIN_LEVEL} first`);
  if ((dragon.stars || 0) >= eco.MAX_STARS) return fail('Already at 5 stars');
  const cost = eco.empowerCost(dragon);
  if (state.player.gold < cost) return fail('Not enough gold');
  state.player.gold -= cost;
  dragon.stars = (dragon.stars || 0) + 1;
  const xpEvents = addXp(state, 500 * dragon.stars);
  return { ok: true, stars: dragon.stars, xpEvents };
}

export function sellDragon(state, dragon) {
  if (state.dragons.length <= 1) return fail('You cannot sell your last dragon');
  if (state.breeding && (state.breeding.a === dragon.id || state.breeding.b === dragon.id)) return fail('This dragon is breeding');
  if (state.tower.run && state.tower.run.team.includes(dragon.id)) return fail('This dragon is in a tower run');
  const value = eco.sellValueDragon(dragon);
  const hab = state.buildings.find((b) => b.id === dragon.habitat);
  if (hab) hab.dragons = hab.dragons.filter((id) => id !== dragon.id);
  state.dragons = state.dragons.filter((d) => d.id !== dragon.id);
  state.player.gold += value;
  return { ok: true, value };
}

export function renameDragon(state, dragon, name) {
  const clean = String(name || '').trim().slice(0, 16);
  if (!clean) return fail('Name cannot be empty');
  dragon.name = clean;
  return { ok: true };
}

export function renamePlayer(state, name) {
  const clean = String(name || '').trim().slice(0, 16);
  if (!clean) return fail('Name cannot be empty');
  state.player.name = clean;
  return { ok: true };
}

// ---------- farms ----------

export function farmOptions(farm) {
  return FOOD_OPTIONS.filter((f) => f.unlock <= farm.level);
}

export function startGrow(state, farm, foodId) {
  if (farm.growing) return fail('Already growing');
  const opt = FOOD_OPTIONS.find((f) => f.id === foodId);
  if (!opt || opt.unlock > farm.level) return fail('Upgrade the farm first');
  if (state.player.gold < opt.cost) return fail('Not enough gold');
  state.player.gold -= opt.cost;
  farm.growing = { food: foodId, startedAt: now(), doneAt: now() + opt.time * 1000 };
  return { ok: true };
}

export function collectFarm(state, farm) {
  if (!farm.growing) return fail('Nothing growing');
  if (now() < farm.growing.doneAt) return fail('Still growing');
  const opt = FOOD_OPTIONS.find((f) => f.id === farm.growing.food);
  state.player.food += opt.food;
  farm.growing = null;
  state.stats.grown++;
  bump(state, 'harvest');
  const xpEvents = addXp(state, Math.round(opt.food / 10));
  return { ok: true, food: opt.food, xpEvents };
}

// ---------- breeding ----------

export function breedingMountain(state) {
  return state.buildings.find((b) => b.type === 'breeding') || null;
}

export function canBreedDragon(state, dragon) {
  if (dragon.level < BREED_MIN_LEVEL) return { ok: false, error: `Needs level ${BREED_MIN_LEVEL}` };
  return { ok: true };
}

export function startBreeding(state, a, b) {
  if (!breedingMountain(state)) return fail('Build the Breeding Mountain first');
  if (state.breeding) return fail('Already breeding');
  if (!a || !b || a.id === b.id) return fail('Pick two different dragons');
  for (const d of [a, b]) {
    const c = canBreedDragon(state, d);
    if (!c.ok) return fail(`${d.name}: ${c.error}`);
  }
  const speciesId = pickOffspring(a.species, b.species);
  const dur = breedDuration(speciesId);
  state.breeding = { a: a.id, b: b.id, species: speciesId, startedAt: now(), doneAt: now() + dur };
  state.stats.bred++;
  bump(state, 'breed');
  return { ok: true, species: speciesId, doneAt: state.breeding.doneAt };
}

export function collectBreeding(state) {
  const br = state.breeding;
  if (!br) return fail('Nothing breeding');
  if (now() < br.doneAt) return fail('Still breeding');
  if (freeEggSlots(state) <= 0) return fail('Hatchery is full');
  const sp = DRAGONS[br.species];
  const egg = { id: `e_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, species: br.species, startedAt: now(), doneAt: now() + sp.hatchTime, source: 'breeding' };
  state.eggs.push(egg);
  state.breeding = null;
  return { ok: true, egg };
}

// ---------- gems: speed ups ----------

export function speedUpCost(target) {
  return gemsToSkip(target.doneAt - now());
}

export function speedUp(state, target) {
  const cost = speedUpCost(target);
  if (cost <= 0) return { ok: true, cost: 0 };
  if (state.player.gems < cost) return fail('Not enough gems');
  state.player.gems -= cost;
  target.doneAt = now();
  return { ok: true, cost };
}

// ---------- quests / daily chest ----------

export function questList(state) {
  return QUESTS.map((q) => {
    const [progress, target] = q.check(state);
    const claimed = state.quests.claimed.includes(q.id);
    return { ...q, progress: Math.min(progress, target), target, complete: progress >= target, claimed };
  });
}

export function claimQuest(state, questId) {
  const q = questList(state).find((x) => x.id === questId);
  if (!q) return fail('Unknown quest');
  if (q.claimed) return fail('Already claimed');
  if (!q.complete) return fail('Not complete yet');
  state.quests.claimed.push(questId);
  const xpEvents = grantReward(state, q.reward);
  return { ok: true, reward: q.reward, xpEvents };
}

export function claimableQuests(state) {
  return questList(state).filter((q) => q.complete && !q.claimed).length;
}

export function dailyReward(state) {
  const day = Math.min(state.daily.streak, 6);
  return { gold: 300 + day * 200 + state.player.level * 50, gems: 3 + day, food: 50 + day * 30 };
}

export function claimDaily(state) {
  if (now() < state.daily.nextAt) return fail('Come back later');
  const reward = dailyReward(state);
  grantReward(state, reward);
  state.daily.streak = now() - state.daily.nextAt < DAILY_INTERVAL * 2 ? state.daily.streak + 1 : 1;
  state.daily.nextAt = now() + DAILY_INTERVAL;
  return { ok: true, reward };
}

// ---------- daily missions ----------

export function ensureMissions(state, t = now()) {
  const key = dayKey(t);
  if (state.missions.day !== key) {
    state.missions = { day: key, level: state.player.level, progress: {}, claimed: [], bonusClaimed: false };
  }
  if (!state.missions.level) state.missions.level = state.player.level;
}

export function bump(state, key, n = 1) {
  ensureMissions(state);
  state.missions.progress[key] = (state.missions.progress[key] || 0) + n;
}

export function missionList(state) {
  ensureMissions(state);
  return missionsForDay(dayNumber(), state.missions.level).map((m) => {
    const progress = Math.min(m.target, state.missions.progress[m.key] || 0);
    return { ...m, progress, complete: progress >= m.target, claimed: state.missions.claimed.includes(m.id) };
  });
}

export function claimMission(state, id) {
  const m = missionList(state).find((x) => x.id === id);
  if (!m) return fail('Unknown mission');
  if (m.claimed) return fail('Already claimed');
  if (!m.complete) return fail('Not complete yet');
  state.missions.claimed.push(id);
  state.stats.missionsDone++;
  const xpEvents = grantReward(state, { ...m.reward, xp: 50 * state.player.level });
  return { ok: true, reward: m.reward, xpEvents };
}

export function missionBonusReady(state) {
  const list = missionList(state);
  return list.length > 0 && list.every((m) => m.claimed) && !state.missions.bonusClaimed;
}

export function claimMissionBonus(state) {
  if (!missionBonusReady(state)) return fail('Finish all missions first');
  state.missions.bonusClaimed = true;
  const xpEvents = grantReward(state, DAILY_BONUS);
  return { ok: true, reward: DAILY_BONUS, xpEvents };
}

export function claimableMissions(state) {
  return missionList(state).filter((m) => m.complete && !m.claimed).length + (missionBonusReady(state) ? 1 : 0);
}

// ---------- achievements ----------

export function achievementList(state) {
  return ACHIEVEMENTS.map((a) => {
    const value = a.value(state, rarityOf);
    const claimed = state.achievements.claimed[a.id] || 0;
    const nextTier = claimed < a.tiers.length ? a.tiers[claimed] : null;
    return { ...a, value, claimedTiers: claimed, nextTier, nextReward: nextTier != null ? a.reward[claimed] : 0, complete: nextTier != null && value >= nextTier, done: nextTier == null };
  });
}

export function claimAchievement(state, id) {
  const a = achievementList(state).find((x) => x.id === id);
  if (!a) return fail('Unknown achievement');
  if (a.done) return fail('All tiers claimed');
  if (!a.complete) return fail('Not there yet');
  state.achievements.claimed[id] = a.claimedTiers + 1;
  const reward = { gems: a.nextReward, xp: a.nextReward * 20 };
  const xpEvents = grantReward(state, reward);
  return { ok: true, reward, xpEvents };
}

export function claimableAchievements(state) {
  return achievementList(state).filter((a) => a.complete).length;
}

// ---------- Dragon Tower ----------

export function ensureTowerWeek(state, t = now()) {
  const k = weekKey(t);
  if (state.tower.weekKey !== k) {
    state.tower.weekKey = k;
    state.tower.weekBest = 0;
    state.tower.weeklyClaimed = '';
  }
}

export function towerStart(state, teamIds) {
  if (state.tower.run) return fail('A tower run is already in progress');
  const ids = teamIds.filter((id) => state.dragons.some((d) => d.id === id)).slice(0, 3);
  if (ids.length === 0) return fail('Pick at least one dragon');
  state.tower.run = { floor: 1, team: ids, hp: {}, startedAt: now() };
  return { ok: true };
}

export function towerUnits(state) {
  const run = state.tower.run;
  if (!run) return [];
  const dragons = run.team.map((id) => state.dragons.find((d) => d.id === id)).filter(Boolean);
  const units = unitsFromDragons(dragons);
  for (const u of units) if (run.hp[u.id] !== undefined) u.hp = Math.max(0, Math.min(u.maxHp, run.hp[u.id]));
  return units;
}

export function towerCurrent(state) {
  return state.tower.run ? towerFloor(state.tower.run.floor) : null;
}

export function towerAfterFloor(state, units, won) {
  const run = state.tower.run;
  if (!run) return fail('No run');
  const floor = towerFloor(run.floor);
  state.stats.battles++;
  bump(state, 'battle');
  if (!won) {
    const reward = { gold: Math.round(floor.reward.gold * 0.15), xp: Math.round(floor.reward.xp * 0.3) };
    const xpEvents = grantReward(state, reward);
    state.tower.run = null;
    return { ok: true, won: false, reward, xpEvents, ended: true, floor: run.floor };
  }
  state.stats.wins++;
  state.stats.towerFloors++;
  bump(state, 'towerFloor');
  state.tower.best = Math.max(state.tower.best, run.floor);
  state.tower.weekBest = Math.max(state.tower.weekBest, run.floor);
  const xpEvents = grantReward(state, floor.reward);
  for (const u of units) {
    if (u.hp > 0) u.hp = Math.min(u.maxHp, Math.round(u.hp + u.maxHp * TOWER_HEAL));
    run.hp[u.id] = u.hp;
  }
  run.floor++;
  return { ok: true, won: true, reward: floor.reward, xpEvents, ended: false, floor: run.floor - 1, nextFloor: run.floor };
}

export function towerRetreat(state) {
  const run = state.tower.run;
  if (!run) return fail('No run');
  state.tower.run = null;
  return { ok: true, floor: run.floor - 1 };
}

export function towerWeeklyReward(state) {
  const f = state.tower.weekBest;
  return { gems: 5 + Math.floor(f / 2), gold: f * 1500, food: f * 60 };
}

export function claimTowerWeekly(state) {
  ensureTowerWeek(state);
  if (state.tower.weekBest < 5) return fail('Reach floor 5 this week first');
  if (state.tower.weeklyClaimed === state.tower.weekKey) return fail('Already claimed this week');
  state.tower.weeklyClaimed = state.tower.weekKey;
  const reward = towerWeeklyReward(state);
  const xpEvents = grantReward(state, reward);
  return { ok: true, reward, xpEvents };
}

// ---------- friends & gifts ----------

export function upsertFriend(state, card) {
  if (card.id === state.player.id) return fail('That is your own card');
  const existing = state.friends.find((f) => f.id === card.id);
  if (existing) {
    Object.assign(existing, card, { wins: existing.wins || 0, losses: existing.losses || 0, addedAt: existing.addedAt });
    return { ok: true, friend: existing, isNew: false };
  }
  if (state.friends.length >= 50) return fail('Friend list is full (50)');
  const friend = { ...card, wins: 0, losses: 0, addedAt: now() };
  state.friends.push(friend);
  return { ok: true, friend, isNew: true };
}

export function addFriendCard(state, text) {
  let card;
  try {
    card = decodeCard(text);
  } catch (err) {
    return fail('That is not a valid trainer card');
  }
  return upsertFriend(state, card);
}

export function removeFriend(state, id) {
  state.friends = state.friends.filter((f) => f.id !== id);
  return { ok: true };
}

export function myGiftCode(state) {
  return giftCode(state.player.id);
}

export function redeemGift(state, code) {
  const g = parseGiftCode(code);
  if (!g) return fail('That gift code is not valid');
  if (g.fromId === state.player.id) return fail('You cannot redeem your own gift');
  if (!state.friends.some((f) => f.id === g.fromId)) return fail('Add this friend\'s trainer card first');
  const today = dayNumber();
  if (g.day > today + 1 || g.day < today - 1) return fail('That gift code has expired');
  const key = `${g.fromId}:${g.day}`;
  if (state.gifts.redeemed.includes(key)) return fail('You already opened this gift');
  state.gifts.redeemed.push(key);
  if (state.gifts.redeemed.length > 300) state.gifts.redeemed = state.gifts.redeemed.slice(-300);
  state.stats.giftsRedeemed++;
  const xpEvents = grantReward(state, GIFT_REWARD);
  return { ok: true, reward: GIFT_REWARD, from: g.fromId, xpEvents };
}

// ---------- battles ----------

export function campaignStageFor(state, stageId, heroic) {
  const base = CAMPAIGN_STAGES.find((s) => s.id === stageId);
  if (!base) return null;
  return heroic ? heroicStage(base) : base;
}

export function battleReady(state) {
  if (state.dragons.length === 0) return fail('You need a dragon first');
  return { ok: true };
}

export function applyBattleResult(state, meta, won) {
  state.stats.battles++;
  bump(state, 'battle');
  if (won) state.stats.wins++;
  let reward = { gold: 0, xp: 0, gems: 0, food: 0 };
  if (meta.mode === 'campaign') {
    const stage = campaignStageFor(state, meta.stageId, meta.heroic);
    const progressKey = meta.heroic ? 'heroicCleared' : 'campaignCleared';
    const firstClear = meta.stageId === state.battle[progressKey] + 1;
    if (won) {
      bump(state, 'campaignWin');
      if (meta.heroic) state.stats.heroicWins++;
      if (firstClear) {
        reward = { ...stage.reward };
        state.battle[progressKey] = meta.stageId;
      } else {
        reward = { gold: Math.round(stage.reward.gold * 0.3), xp: Math.round(stage.reward.xp * 0.3), gems: 0, food: 0 };
      }
    } else {
      reward = { gold: Math.round(stage.reward.gold * 0.05), xp: Math.round(stage.reward.xp * 0.2), gems: 0, food: 0 };
    }
  } else if (meta.mode === 'friend') {
    const friend = state.friends.find((f) => f.id === meta.friendId);
    bump(state, 'friendBattle');
    if (won) {
      state.stats.friendWins++;
      if (friend) friend.wins = (friend.wins || 0) + 1;
      reward = { gold: Math.round(120 + meta.level * 35), xp: 15 + meta.level * 5, gems: 0, food: Math.round(20 + meta.level * 4) };
    } else {
      if (friend) friend.losses = (friend.losses || 0) + 1;
      reward = { gold: Math.round(15 + meta.level * 5), xp: 5 + meta.level, gems: 0, food: 0 };
    }
  } else {
    if (won) {
      state.battle.arenaWins++;
      state.battle.streak++;
      bump(state, 'arenaWin');
      state.battle.trophies += 20 + Math.min(20, state.battle.streak * 2);
      const streakBonus = 1 + Math.min(1, state.battle.streak * 0.1);
      reward = { gold: Math.round((150 + meta.level * 45) * streakBonus), xp: 20 + meta.level * 6, gems: state.battle.arenaWins % 5 === 0 ? 3 : 0, food: Math.round(20 + meta.level * 5) };
    } else {
      state.battle.arenaLosses++;
      state.battle.streak = 0;
      state.battle.trophies = Math.max(0, state.battle.trophies - 10);
      reward = { gold: Math.round(20 + meta.level * 8), xp: 10 + meta.level * 2, gems: 0, food: 0 };
    }
    state.battle.nextArenaAt = now() + ARENA_COOLDOWN;
  }
  const xpEvents = grantReward(state, reward);
  return { reward, xpEvents };
}
