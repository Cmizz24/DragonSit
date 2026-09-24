// All game-state mutations live here. Each returns { ok, error?, ...data } so the UI can report.
import { now, gemsToSkip } from './util.js';
import { BUILDINGS, FOOD_OPTIONS, ZONES, zoneAt, ISLAND_SIZE } from './data/buildings.js';
import { DRAGONS } from './data/dragons.js';
import { QUESTS } from './data/quests.js';
import { CAMPAIGN_STAGES } from './data/campaign.js';
import { makeBuilding, makeDragon } from './state.js';
import * as eco from './economy.js';
import { pickOffspring, breedDuration, BREED_MIN_LEVEL } from './breeding.js';

export const ARENA_COOLDOWN = 3 * 60 * 1000;
export const DAILY_INTERVAL = 20 * 60 * 60 * 1000;

const fail = (error) => ({ ok: false, error });

export function tick(state, t = now()) {
  const dtMin = Math.max(0, t - state.lastTick) / 60000;
  state.lastTick = t;
  let earned = 0;
  for (const b of state.buildings) {
    if (b.type !== 'habitat') continue;
    const cap = eco.habitatGoldCap(b);
    const before = b.gold;
    b.gold = Math.min(cap, b.gold + eco.habitatRate(state, b) * dtMin);
    earned += b.gold - before;
  }
  return { earned };
}

// ---------- island / buildings ----------

export function occupancy(state, ignoreId = null) {
  const map = new Map();
  for (const b of state.buildings) {
    if (b.id === ignoreId) continue;
    for (let dx = 0; dx < b.size; dx++) for (let dy = 0; dy < b.size; dy++) map.set(`${b.x + dx},${b.y + dy}`, b);
  }
  return map;
}

export function cellUnlocked(state, x, y) {
  if (x < 0 || y < 0 || x >= ISLAND_SIZE || y >= ISLAND_SIZE) return false;
  return state.island.zones.includes(zoneAt(x, y));
}

export function canPlace(state, size, x, y, ignoreId = null) {
  const occ = occupancy(state, ignoreId);
  for (let dx = 0; dx < size; dx++) {
    for (let dy = 0; dy < size; dy++) {
      if (!cellUnlocked(state, x + dx, y + dy)) return false;
      if (occ.has(`${x + dx},${y + dy}`)) return false;
    }
  }
  return true;
}

export function buildingAt(state, x, y) {
  return occupancy(state).get(`${x},${y}`) || null;
}

export function countBuildings(state, defId) {
  return state.buildings.filter((b) => b.def === defId).length;
}

export function buildAvailability(state, defId) {
  const def = BUILDINGS[defId];
  if (state.player.level < def.unlock) return { ok: false, error: `Unlocks at level ${def.unlock}` };
  if (def.max && countBuildings(state, defId) >= def.max) return { ok: false, error: 'Already built' };
  if (def.requires && countBuildings(state, def.requires) === 0) return { ok: false, error: `Requires ${BUILDINGS[def.requires].name}` };
  if (!eco.canAfford(state, def.cost)) return { ok: false, error: 'Not enough ' + (def.cost.gems ? 'gems' : 'gold') };
  return { ok: true };
}

export function placeBuilding(state, defId, x, y) {
  const def = BUILDINGS[defId];
  const avail = buildAvailability(state, defId);
  if (!avail.ok) return avail;
  if (!canPlace(state, def.size, x, y)) return fail('Cannot build there');
  pay(state, def.cost);
  const b = makeBuilding(defId, x, y);
  state.buildings.push(b);
  const xpEvents = addXp(state, def.xp);
  return { ok: true, building: b, xpEvents };
}

export function moveBuilding(state, b, x, y) {
  if (!canPlace(state, b.size, x, y, b.id)) return fail('Cannot move there');
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
  const xpEvents = addXp(state, Math.round(BUILDINGS[b.def].xp * b.level));
  return { ok: true, xpEvents };
}

export function collectHabitat(state, b) {
  const amount = Math.floor(b.gold);
  if (amount <= 0) return { ok: true, amount: 0 };
  b.gold -= amount;
  state.player.gold += amount;
  state.stats.collected += amount;
  return { ok: true, amount };
}

export function collectAll(state) {
  let total = 0;
  for (const b of state.buildings) if (b.type === 'habitat') total += collectHabitat(state, b).amount;
  return { ok: true, amount: total };
}

export function buyZone(state, useGems) {
  const next = ZONES.find((z) => !state.island.zones.includes(z.id));
  if (!next) return fail('Island fully expanded');
  if (useGems) {
    if (state.player.gems < next.gems) return fail('Not enough gems');
    state.player.gems -= next.gems;
  } else {
    if (state.player.gold < next.cost.gold) return fail('Not enough gold');
    state.player.gold -= next.cost.gold;
  }
  state.island.zones.push(next.id);
  const xpEvents = addXp(state, 100 * next.id);
  return { ok: true, zone: next, xpEvents };
}

export function nextZone(state) {
  return ZONES.find((z) => !state.island.zones.includes(z.id)) || null;
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
  if (!sp.cost) return fail('This dragon can only be bred');
  if (state.player.level < sp.unlock) return fail(`Unlocks at level ${sp.unlock}`);
  if (!eco.canAfford(state, sp.cost)) return fail('Not enough ' + (sp.cost.gems ? 'gems' : 'gold'));
  if (freeEggSlots(state) <= 0) return fail('Hatchery is full');
  pay(state, sp.cost);
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
  if (dragon.level >= cap) return fail(cap >= 30 ? 'Max level reached' : `Build a Temple to raise the level cap (${cap})`);
  const cost = eco.foodForLevel(dragon.level);
  if (state.player.food < cost) return fail('Not enough food');
  state.player.food -= cost;
  dragon.level++;
  state.stats.fed++;
  const xpEvents = addXp(state, 4 + dragon.level * 2);
  return { ok: true, level: dragon.level, xpEvents };
}

export function sellDragon(state, dragon) {
  if (state.dragons.length <= 1) return fail('You cannot sell your last dragon');
  if (state.breeding && (state.breeding.a === dragon.id || state.breeding.b === dragon.id)) return fail('This dragon is breeding');
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

// ---------- quests / daily ----------

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

// ---------- battles ----------

export function campaignStage(state) {
  return CAMPAIGN_STAGES[Math.min(state.battle.campaignCleared, CAMPAIGN_STAGES.length - 1)];
}

export function battleReady(state) {
  if (state.dragons.length === 0) return fail('You need a dragon first');
  return { ok: true };
}

export function applyBattleResult(state, meta, won) {
  state.stats.battles++;
  let reward = { gold: 0, xp: 0, gems: 0, food: 0 };
  if (meta.mode === 'campaign') {
    const stage = CAMPAIGN_STAGES.find((s) => s.id === meta.stageId);
    const firstClear = meta.stageId === state.battle.campaignCleared + 1;
    if (won) {
      if (firstClear) {
        reward = { ...stage.reward };
        state.battle.campaignCleared = meta.stageId;
      } else {
        reward = { gold: Math.round(stage.reward.gold * 0.3), xp: Math.round(stage.reward.xp * 0.3), gems: 0, food: 0 };
      }
    } else {
      reward = { gold: Math.round(stage.reward.gold * 0.05), xp: Math.round(stage.reward.xp * 0.2), gems: 0, food: 0 };
    }
  } else {
    if (won) {
      state.battle.arenaWins++;
      state.battle.streak++;
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
