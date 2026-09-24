// Pure formulas: no state mutation here.
import { DRAGONS, RARITY, ELEMENT_BIAS } from './data/dragons.js';
import { BUILDINGS } from './data/buildings.js';
import { currentEvent } from './data/events.js';

export const MAX_STARS = 5;
export const EMPOWER_MIN_LEVEL = 20;

export function xpForLevel(level) {
  return Math.round(55 * Math.pow(level, 2));
}

export function levelUpGems(level) {
  return 2 + Math.floor(level / 3);
}

export function dragonStats(speciesId, level, stars = 0) {
  const sp = DRAGONS[speciesId];
  const r = RARITY[sp.rarity];
  let hp = r.hp, atk = r.atk, def = r.def, spd = r.spd;
  for (const e of sp.elements) {
    const b = ELEMENT_BIAS[e] || {};
    hp *= 1 + (b.hp || 0);
    atk *= 1 + (b.atk || 0);
    def *= 1 + (b.def || 0);
    spd *= 1 + (b.spd || 0);
  }
  const mult = (1 + 0.16 * (level - 1)) * (1 + 0.08 * (stars || 0));
  return {
    hp: Math.round(hp * mult),
    atk: Math.round(atk * mult),
    def: Math.round(def * mult),
    spd: Math.round(spd * (1 + 0.05 * (level - 1))),
  };
}

// Gold per minute for a single dragon.
export function dragonGoldRate(dragon) {
  return Math.round(DRAGONS[dragon.species].goldRate * dragon.level * (1 + 0.1 * (dragon.stars || 0)));
}

export function habitatRate(state, b) {
  let rate = 0;
  for (const id of b.dragons) {
    const d = state.dragons.find((x) => x.id === id);
    if (d) rate += dragonGoldRate(d);
  }
  const ev = currentEvent();
  if (ev.element === b.element) rate *= ev.goldMult;
  return rate;
}

// Shop price after the weekly event discount.
export function dragonPrice(sp) {
  if (!sp.cost) return null;
  const ev = currentEvent();
  if (!sp.elements.includes(ev.element)) return sp.cost;
  const c = {};
  if (sp.cost.gold) c.gold = Math.round(sp.cost.gold * (1 - ev.shopDiscount));
  if (sp.cost.gems) c.gems = Math.max(1, Math.round(sp.cost.gems * (1 - ev.shopDiscount)));
  return c;
}

export function empowerCost(dragon) {
  return 50000 * Math.pow(2, dragon.stars || 0);
}

export function mineGemsPerHour(b) {
  return 1 / BUILDINGS[b.def].gemHours[b.level - 1];
}

export function habitatCapacity(b) {
  return BUILDINGS[b.def].capacity[b.level - 1];
}

export function habitatGoldCap(b) {
  return BUILDINGS[b.def].goldCap[b.level - 1];
}

export function hatcherySlots(b) {
  return BUILDINGS[b.def].slots[b.level - 1];
}

export function foodForLevel(level) {
  return Math.round(6 * level * level + 10 * level);
}

export function levelCap(state) {
  let cap = 10;
  for (const b of state.buildings) {
    if (b.type === 'temple') cap = Math.max(cap, BUILDINGS[b.def].levelCap);
  }
  return cap;
}

export function dragonStage(level) {
  if (level < 4) return 'baby';
  if (level < 10) return 'young';
  return 'adult';
}

export function sellValueDragon(dragon) {
  const sp = DRAGONS[dragon.species];
  let base = sp.cost && sp.cost.gold ? sp.cost.gold * 0.5 : { common: 200, rare: 800, epic: 5000, legendary: 30000 }[sp.rarity];
  return Math.round(base + base * 0.2 * (dragon.level - 1));
}

export function sellValueBuilding(b) {
  const def = BUILDINGS[b.def];
  let value = def.cost.gold ? def.cost.gold * 0.5 : 0;
  if (def.upgradeCost) for (let i = 0; i < b.level - 1; i++) value += def.upgradeCost[i] * 0.5;
  return Math.round(value);
}

export function upgradeCost(b) {
  const def = BUILDINGS[b.def];
  if (!def.upgradeCost || b.level - 1 >= def.upgradeCost.length) return null;
  return def.upgradeCost[b.level - 1];
}

export function maxBuildingLevel(defId) {
  const def = BUILDINGS[defId];
  return def.upgradeCost ? def.upgradeCost.length + 1 : 1;
}

export function canAfford(state, cost) {
  if (!cost) return true;
  if (cost.gold && state.player.gold < cost.gold) return false;
  if (cost.gems && state.player.gems < cost.gems) return false;
  if (cost.food && state.player.food < cost.food) return false;
  return true;
}

export function costLabel(cost) {
  if (!cost) return 'Free';
  const parts = [];
  if (cost.gold) parts.push(`${cost.gold} gold`);
  if (cost.gems) parts.push(`${cost.gems} gems`);
  if (cost.food) parts.push(`${cost.food} food`);
  return parts.join(' + ');
}

export function totalGoldRate(state) {
  return state.buildings.filter((b) => b.type === 'habitat').reduce((s, b) => s + habitatRate(state, b), 0);
}
