import { now, uid } from './util.js';
import { BUILDINGS } from './data/buildings.js';
import { DRAGONS } from './data/dragons.js';

export const SAVE_KEY = 'dragonsit.save';
export const SAVE_VERSION = 2;

export function makeBuilding(defId, x, y, isle = 0) {
  const def = BUILDINGS[defId];
  const b = { id: uid('b'), def: defId, type: def.type, x, y, isle, size: def.size, level: 1 };
  if (def.type === 'habitat') {
    b.element = def.element;
    b.gold = 0;
    b.dragons = [];
  }
  if (def.type === 'farm') b.growing = null;
  if (def.type === 'mine') b.gems = 0;
  return b;
}

export function makeDragon(speciesId, habitatId = null) {
  const sp = DRAGONS[speciesId];
  return { id: uid('d'), species: speciesId, name: sp.name.replace(' Dragon', ''), level: 1, stars: 0, habitat: habitatId, bornAt: now() };
}

export function newPlayerId() {
  return Math.random().toString(36).slice(2, 6).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function defaultState() {
  const t = now();
  const s = {
    version: SAVE_VERSION,
    createdAt: t,
    lastTick: t,
    lastSaved: 0,
    player: { id: newPlayerId(), name: 'Dragon Keeper', level: 1, xp: 0, gold: 1500, gems: 30, food: 120 },
    isles: [{ id: 0, zones: [0] }],
    currentIsle: 0,
    buildings: [],
    dragons: [],
    eggs: [],
    breeding: null,
    discovered: [],
    quests: { claimed: [] },
    achievements: { claimed: {} },
    missions: { day: '', progress: {}, claimed: [], bonusClaimed: false },
    tower: { best: 0, weekBest: 0, weekKey: '', run: null, weeklyClaimed: '' },
    battle: { campaignCleared: 0, heroicCleared: 0, heroic: false, arenaWins: 0, arenaLosses: 0, trophies: 0, nextArenaAt: 0, streak: 0, lastTeam: [] },
    friends: [],
    gifts: { redeemed: [] },
    stats: { collected: 0, hatched: 0, grown: 0, bred: 0, bought: [], battles: 0, fed: 0, wins: 0, friendWins: 0, giftsRedeemed: 0, missionsDone: 0, heroicWins: 0, towerFloors: 0 },
    daily: { nextAt: 0, streak: 0 },
    settings: { sound: true, tutorialDone: false, welcomed: false, cloudUrl: '' },
  };
  const hab = makeBuilding('habitat_fire', 9, 7);
  s.buildings.push(hab);
  s.buildings.push(makeBuilding('farm', 6, 9));
  s.buildings.push(makeBuilding('hatchery', 12, 11));
  s.buildings.push(makeBuilding('deco_tree', 7, 12));
  s.buildings.push(makeBuilding('deco_flowers', 8, 12));
  const d = makeDragon('flame', hab.id);
  s.dragons.push(d);
  hab.dragons.push(d.id);
  s.discovered.push('flame');
  return s;
}

// Fill in any fields missing from older saves so the rest of the code can assume they exist.
export function migrate(s) {
  const d = defaultState();
  // v1 -> v2: a single island became a list of isles.
  if (!s.isles) s.isles = [{ id: 0, zones: (s.island && s.island.zones) || [0] }];
  delete s.island;
  const merge = (target, src) => {
    for (const k of Object.keys(src)) {
      if (src[k] === undefined) continue;
      if (target[k] === undefined) target[k] = src[k];
      else if (typeof src[k] === 'object' && src[k] && !Array.isArray(src[k]) && typeof target[k] === 'object' && target[k] && !Array.isArray(target[k])) merge(target[k], src[k]);
    }
  };
  merge(s, { ...d, buildings: undefined, dragons: undefined, discovered: undefined, eggs: undefined, isles: undefined, friends: undefined });
  s.buildings = s.buildings || [];
  s.dragons = s.dragons || [];
  s.eggs = s.eggs || [];
  s.discovered = s.discovered || [];
  s.friends = s.friends || [];
  if (!s.player.id) s.player.id = newPlayerId();
  // Drop references to species/buildings that no longer exist.
  s.buildings = s.buildings.filter((b) => BUILDINGS[b.def]);
  s.dragons = s.dragons.filter((dr) => DRAGONS[dr.species]);
  s.eggs = s.eggs.filter((e) => DRAGONS[e.species]);
  for (const b of s.buildings) {
    if (b.isle === undefined) b.isle = 0;
    if (b.type === 'habitat') b.dragons = (b.dragons || []).filter((id) => s.dragons.some((dr) => dr.id === id));
    if (b.type === 'mine' && b.gems === undefined) b.gems = 0;
  }
  for (const dr of s.dragons) {
    if (dr.stars === undefined) dr.stars = 0;
    if (dr.habitat && !s.buildings.some((b) => b.id === dr.habitat)) dr.habitat = null;
    if (!s.discovered.includes(dr.species)) s.discovered.push(dr.species);
  }
  if (!s.isles.some((i) => i.id === s.currentIsle)) s.currentIsle = 0;
  s.version = SAVE_VERSION;
  return s;
}

export function loadState() {
  try {
    const rawSave = localStorage.getItem(SAVE_KEY);
    if (!rawSave) return { state: defaultState(), fresh: true };
    const parsed = JSON.parse(rawSave);
    return { state: migrate(parsed), fresh: false };
  } catch (err) {
    console.warn('Could not load save, starting fresh', err);
    return { state: defaultState(), fresh: true };
  }
}

export function saveState(state) {
  try {
    state.lastSaved = now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('Save failed', err);
    return false;
  }
}

export function exportSave(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function importSave(text) {
  const json = decodeURIComponent(escape(atob(text.trim())));
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || !parsed.player) throw new Error('Not a DragonSit save');
  return migrate(parsed);
}

export function wipeSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    /* ignore */
  }
}
