import { ELEMENT_ORDER, ELEMENTS } from './elements.js';

export const BUILDINGS = {};
export const BUILDING_LIST = [];

function add(def) {
  BUILDINGS[def.id] = def;
  BUILDING_LIST.push(def);
}

// Habitats, one per element.
const habitatCost = { fire: 500, earth: 500, water: 1200, nature: 2500, electric: 5000, ice: 9000, metal: 15000, dark: 25000, light: 40000, legend: 120000 };
const habitatCap = { fire: 500, earth: 500, water: 900, nature: 1500, electric: 2500, ice: 4000, metal: 6000, dark: 9000, light: 14000, legend: 30000 };
for (const e of ELEMENT_ORDER) {
  const E = ELEMENTS[e];
  add({
    id: `habitat_${e}`, type: 'habitat', element: e, name: `${E.name} Habitat`, size: 3,
    cost: { gold: habitatCost[e] }, unlock: E.unlock, xp: 40 + 10 * E.unlock,
    capacity: [2, 3, 4], goldCap: [habitatCap[e], habitatCap[e] * 4, habitatCap[e] * 12],
    upgradeCost: [habitatCost[e] * 3, habitatCost[e] * 8],
    desc: `Home for ${E.name} dragons. Dragons living here earn gold over time.`,
  });
}

add({
  id: 'farm', type: 'farm', name: 'Food Farm', size: 2, cost: { gold: 200 }, unlock: 1, xp: 30,
  upgradeCost: [1500, 8000, 30000], desc: 'Grows food to feed and level up your dragons. Upgrade to unlock bigger crops.',
});
add({
  id: 'breeding', type: 'breeding', name: 'Breeding Mountain', size: 3, cost: { gold: 600 }, unlock: 2, xp: 80, max: 1,
  desc: 'Pair two dragons to discover new hybrid species.',
});
add({
  id: 'hatchery', type: 'hatchery', name: 'Hatchery', size: 2, cost: { gold: 500 }, unlock: 1, xp: 40, max: 1,
  slots: [2, 3, 4], upgradeCost: [5000, 25000], desc: 'Keeps eggs warm until they hatch. Upgrade for more nests.',
});
add({ id: 'temple_1', type: 'temple', name: 'Temple of Growth', size: 2, cost: { gold: 20000 }, unlock: 5, xp: 300, max: 1, levelCap: 15, desc: 'Raises the dragon level cap to 15.' });
add({ id: 'temple_2', type: 'temple', name: 'Temple of Wisdom', size: 2, cost: { gold: 90000 }, unlock: 10, xp: 800, max: 1, levelCap: 20, requires: 'temple_1', desc: 'Raises the dragon level cap to 20.' });
add({ id: 'temple_3', type: 'temple', name: 'Temple of Power', size: 2, cost: { gold: 350000 }, unlock: 15, xp: 2000, max: 1, levelCap: 25, requires: 'temple_2', desc: 'Raises the dragon level cap to 25.' });
add({ id: 'temple_4', type: 'temple', name: 'Temple of Legends', size: 2, cost: { gold: 1200000 }, unlock: 20, xp: 5000, max: 1, levelCap: 30, requires: 'temple_3', desc: 'Raises the dragon level cap to 30.' });

add({ id: 'deco_tree', type: 'deco', name: 'Oak Tree', size: 1, cost: { gold: 80 }, unlock: 1, xp: 5, desc: 'A leafy friend for your island.' });
add({ id: 'deco_flowers', type: 'deco', name: 'Flower Bed', size: 1, cost: { gold: 60 }, unlock: 1, xp: 5, desc: 'Bright blooms that dragons love to sniff.' });
add({ id: 'deco_lantern', type: 'deco', name: 'Stone Lantern', size: 1, cost: { gold: 250 }, unlock: 3, xp: 10, desc: 'Lights the paths at night.' });
add({ id: 'deco_fountain', type: 'deco', name: 'Fountain', size: 2, cost: { gold: 1500 }, unlock: 4, xp: 40, desc: 'A sparkling centrepiece.' });
add({ id: 'deco_statue', type: 'deco', name: 'Dragon Statue', size: 2, cost: { gems: 40 }, unlock: 6, xp: 100, desc: 'Honour the legends of old.' });
add({ id: 'deco_crystal', type: 'deco', name: 'Crystal Spire', size: 1, cost: { gems: 25 }, unlock: 8, xp: 60, desc: 'Hums with ancient magic.' });

export function building(id) {
  return BUILDINGS[id];
}

// Crops a farm can grow. `unlock` is the farm level required.
export const FOOD_OPTIONS = [
  { id: 'berries', name: 'Star Berries', food: 30, cost: 50, time: 30, unlock: 1 },
  { id: 'melon', name: 'Dragon Melon', food: 150, cost: 240, time: 240, unlock: 1 },
  { id: 'pumpkin', name: 'Lava Pumpkin', food: 500, cost: 750, time: 900, unlock: 2 },
  { id: 'cactus', name: 'Cloud Cactus', food: 1500, cost: 2100, time: 2700, unlock: 3 },
  { id: 'golden', name: 'Golden Fruit', food: 5000, cost: 6500, time: 7200, unlock: 4 },
];

// Island layout: 22x22 grid split into zones. Zone 0 is free; others are bought in order.
export const ISLAND_SIZE = 22;
export const ZONES = [
  { id: 0, x: 5, y: 5, w: 12, h: 12, cost: null },
  { id: 1, x: 17, y: 5, w: 5, h: 12, cost: { gold: 6000 }, gems: 20 },
  { id: 2, x: 5, y: 17, w: 17, h: 5, cost: { gold: 30000 }, gems: 60 },
  { id: 3, x: 0, y: 0, w: 5, h: 22, cost: { gold: 120000 }, gems: 150 },
  { id: 4, x: 5, y: 0, w: 17, h: 5, cost: { gold: 400000 }, gems: 350 },
];

export function zoneAt(x, y) {
  for (const z of ZONES) {
    if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return z.id;
  }
  return -1;
}
