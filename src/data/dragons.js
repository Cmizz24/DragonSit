import { ELEMENTS } from './elements.js';
import { hashStr } from '../util.js';

// Base stats by rarity. Element biases are applied on top in economy.js.
export const RARITY = {
  common: { name: 'Common', color: '#9fb3c8', hp: 120, atk: 20, def: 15, spd: 10, gold: 6, xp: 25, weight: 100, breed: 45, hatch: 30 },
  rare: { name: 'Rare', color: '#4fc3ff', hp: 155, atk: 27, def: 19, spd: 12, gold: 14, xp: 80, weight: 38, breed: 360, hatch: 270 },
  epic: { name: 'Epic', color: '#c56bff', hp: 200, atk: 36, def: 24, spd: 15, gold: 32, xp: 250, weight: 12, breed: 2700, hatch: 1800 },
  legendary: { name: 'Legendary', color: '#ffb02e', hp: 260, atk: 48, def: 30, spd: 18, gold: 70, xp: 800, weight: 2, breed: 7200, hatch: 5400 },
};

// Per-element flavour applied to stats (fractions of base).
export const ELEMENT_BIAS = {
  fire: { atk: 0.15, def: -0.05 },
  earth: { hp: 0.1, def: 0.15, spd: -0.1 },
  water: { spd: 0.15, hp: 0.05 },
  nature: { hp: 0.2, atk: -0.05 },
  electric: { spd: 0.2, atk: 0.1, hp: -0.1 },
  ice: { def: 0.15, spd: -0.05 },
  metal: { def: 0.25, spd: -0.15 },
  dark: { atk: 0.2, def: -0.1 },
  light: { hp: 0.1, def: 0.05 },
  legend: { hp: 0.1, atk: 0.1, def: 0.1, spd: 0.1 },
};

const raw = [
  // --- Pure element dragons (buyable with gold) ---
  ['flame', 'Flame Dragon', ['fire'], 'common', { gold: 100 }, 'A warm little hothead who loves to roast marshmallows.', { horn: 1, tail: 0 }],
  ['terra', 'Terra Dragon', ['earth'], 'common', { gold: 100 }, 'Loyal, stubborn and happiest rolling in dirt.', { horn: 0, tail: 2 }],
  ['sea', 'Sea Dragon', ['water'], 'common', { gold: 300 }, 'Splashes in every puddle it can find.', { horn: 2, tail: 3 }],
  ['sprout', 'Sprout Dragon', ['nature'], 'common', { gold: 500 }, 'Grows a little taller every time it is fed.', { horn: 3, tail: 1 }],
  ['volt', 'Volt Dragon', ['electric'], 'common', { gold: 1000 }, 'Never sits still and hums when it sleeps.', { horn: 1, tail: 0 }],
  ['frost', 'Frost Dragon', ['ice'], 'common', { gold: 1500 }, 'Breathes snowflakes and sneezes hail.', { horn: 2, tail: 1 }],
  ['iron', 'Iron Dragon', ['metal'], 'common', { gold: 2500 }, 'Polishes its scales every single morning.', { horn: 0, tail: 2 }],
  ['shade', 'Shade Dragon', ['dark'], 'common', { gold: 4000 }, 'Loves midnight snacks and spooky stories.', { horn: 3, tail: 3 }],
  ['glow', 'Glow Dragon', ['light'], 'common', { gold: 6000 }, 'A gentle glow follows it wherever it goes.', { horn: 2, tail: 1 }],

  // --- Rare hybrids ---
  ['volcano', 'Volcano Dragon', ['fire', 'earth'], 'rare', { gems: 30 }, 'Its back rumbles before it erupts in laughter.'],
  ['steam', 'Steam Dragon', ['fire', 'water'], 'rare', { gems: 35 }, 'Hisses and whistles like a kettle when excited.'],
  ['wildfire', 'Wildfire Dragon', ['fire', 'nature'], 'rare', { gems: 35 }, 'Spreads warmth (and sometimes chaos) across meadows.'],
  ['plasma', 'Plasma Dragon', ['fire', 'electric'], 'rare', { gems: 40 }, 'Glows so bright it needs no lamp.'],
  ['frostfire', 'Frostfire Dragon', ['fire', 'ice'], 'rare', { gems: 45 }, 'Half blazing, half freezing, entirely confused.'],
  ['forge', 'Forge Dragon', ['fire', 'metal'], 'rare', { gems: 45 }, 'Hammers out horseshoes for fun.'],
  ['inferno', 'Inferno Dragon', ['fire', 'dark'], 'rare', { gems: 50 }, 'Its shadow flickers like a candle.'],
  ['solar', 'Solar Dragon', ['fire', 'light'], 'rare', { gems: 55 }, 'Rises with the sun and naps at noon.'],
  ['mud', 'Mud Dragon', ['earth', 'water'], 'rare', { gems: 30 }, 'Squelches happily through every swamp.'],
  ['moss', 'Moss Dragon', ['earth', 'nature'], 'rare', { gems: 35 }, 'Sits so still that flowers grow on it.'],
  ['quake', 'Quake Dragon', ['earth', 'electric'], 'rare', { gems: 40 }, 'Its footsteps make the whole island buzz.'],
  ['alpine', 'Alpine Dragon', ['earth', 'ice'], 'rare', { gems: 40 }, 'Climbs the highest peaks just for the view.'],
  ['boulder', 'Boulder Dragon', ['earth', 'metal'], 'rare', { gems: 45 }, 'Nothing gets past this walking fortress.'],
  ['obsidian', 'Obsidian Dragon', ['earth', 'dark'], 'rare', { gems: 50 }, 'Sharp, glossy and a little bit dramatic.'],
  ['dune', 'Dune Dragon', ['earth', 'light'], 'rare', { gems: 50 }, 'Shimmers like a desert mirage.'],
  ['coral', 'Coral Dragon', ['water', 'nature'], 'rare', { gems: 35 }, 'Builds tiny reefs in its habitat pond.'],
  ['storm', 'Storm Dragon', ['water', 'electric'], 'rare', { gems: 40 }, 'Thunder follows it like a puppy.'],
  ['iceberg', 'Iceberg Dragon', ['water', 'ice'], 'rare', { gems: 40 }, 'Only a tenth of its grumpiness shows on the surface.'],
  ['mercury', 'Mercury Dragon', ['water', 'metal'], 'rare', { gems: 45 }, 'Slippery, shiny and impossible to catch.'],
  ['abyss', 'Abyss Dragon', ['water', 'dark'], 'rare', { gems: 50 }, 'Its eyes glow from the deepest trench.'],
  ['pearl', 'Pearl Dragon', ['water', 'light'], 'rare', { gems: 50 }, 'A treasure that swims.'],
  ['firefly', 'Firefly Dragon', ['nature', 'electric'], 'rare', { gems: 40 }, 'Lights up the garden every evening.'],
  ['pine', 'Pine Dragon', ['nature', 'ice'], 'rare', { gems: 40 }, 'Smells faintly of winter mornings.'],
  ['bramble', 'Bramble Dragon', ['nature', 'metal'], 'rare', { gems: 45 }, 'Do not hug. Seriously.'],
  ['nightshade', 'Nightshade Dragon', ['nature', 'dark'], 'rare', { gems: 50 }, 'Blooms only under moonlight.'],
  ['blossom', 'Blossom Dragon', ['nature', 'light'], 'rare', { gems: 50 }, 'Petals drift wherever it flies.'],
  ['aurora', 'Aurora Dragon', ['electric', 'ice'], 'rare', { gems: 45 }, 'Paints the night sky with colour.'],
  ['dynamo', 'Dynamo Dragon', ['electric', 'metal'], 'rare', { gems: 50 }, 'Powers the whole island when it gets excited.'],
  ['nightstorm', 'Nightstorm Dragon', ['electric', 'dark'], 'rare', { gems: 55 }, 'Crackles with purple lightning.'],
  ['prism', 'Prism Dragon', ['electric', 'light'], 'rare', { gems: 55 }, 'Splits sunlight into a thousand rainbows.'],
  ['chrome', 'Chrome Dragon', ['ice', 'metal'], 'rare', { gems: 55 }, 'Cold to the touch and colder in battle.'],
  ['frostbite', 'Frostbite Dragon', ['ice', 'dark'], 'rare', { gems: 55 }, 'A chill runs down your spine when it stares.'],
  ['crystal', 'Crystal Dragon', ['ice', 'light'], 'rare', { gems: 60 }, 'Its scales chime softly in the wind.'],
  ['gargoyle', 'Gargoyle Dragon', ['metal', 'dark'], 'rare', { gems: 60 }, 'Perches on rooftops pretending to be a statue.'],
  ['paladin', 'Paladin Dragon', ['metal', 'light'], 'rare', { gems: 60 }, 'Sworn protector of the island.'],
  ['eclipse', 'Eclipse Dragon', ['dark', 'light'], 'rare', { gems: 70 }, 'Half of it is always in shadow.'],

  // --- Epic (three elements) ---
  ['phoenix', 'Phoenix Dragon', ['fire', 'electric', 'light'], 'epic', { gems: 200 }, 'Bursts into flame and rises again, brighter than before.', { horn: 1, tail: 0, wing: 2 }],
  ['kraken', 'Kraken Dragon', ['water', 'dark', 'ice'], 'epic', { gems: 200 }, 'Rules the frozen deep with a hundred whispers.', { horn: 2, tail: 3, wing: 1 }],
  ['titan', 'Titan Dragon', ['earth', 'metal', 'electric'], 'epic', { gems: 200 }, 'A living mountain wired with lightning.', { horn: 0, tail: 2, wing: 0 }],
  ['elder', 'Elder Dragon', ['nature', 'earth', 'light'], 'epic', { gems: 200 }, 'Old as the forest and twice as wise.', { horn: 3, tail: 1, wing: 2 }],
  ['void', 'Void Dragon', ['dark', 'ice', 'electric'], 'epic', { gems: 200 }, 'Stares into nothing. Nothing stares back.', { horn: 3, tail: 3, wing: 1 }],
  ['rainbow', 'Rainbow Dragon', ['water', 'light', 'nature'], 'epic', { gems: 200 }, 'Appears after every storm to cheer everyone up.', { horn: 2, tail: 1, wing: 2 }],

  // --- Legendary ---
  ['legend', 'Legend Dragon', ['legend'], 'legendary', { gems: 600 }, 'The first dragon. Every tale begins with it.', { horn: 3, tail: 0, wing: 2 }],
  ['mirror', 'Mirror Dragon', ['legend', 'light'], 'legendary', null, 'Reflects every attack thrown at it with a smile.', { horn: 2, tail: 1, wing: 2 }],
  ['chaos', 'Chaos Dragon', ['legend', 'dark'], 'legendary', null, 'Where it walks, the rules bend.', { horn: 3, tail: 3, wing: 1 }],
  ['tempest', 'Tempest Dragon', ['legend', 'water', 'electric'], 'legendary', null, 'A hurricane with wings.', { horn: 1, tail: 3, wing: 2 }],
];

function timerFor(rarity, elements) {
  const r = RARITY[rarity];
  const unlockSum = elements.reduce((s, e) => s + ELEMENTS[e].unlock, 0);
  if (rarity === 'common') {
    const u = ELEMENTS[elements[0]].unlock;
    const breed = [45, 45, 60, 120, 300, 420, 600, 900, 1200, 1800][u - 1] || 1800;
    return { breed, hatch: Math.round(breed * 0.7) };
  }
  if (rarity === 'rare') {
    const breed = 180 + 90 * unlockSum;
    return { breed, hatch: Math.round(breed * 0.75) };
  }
  return { breed: r.breed, hatch: r.hatch };
}

function unlockFor(rarity, elements) {
  const maxU = Math.max(...elements.map((e) => ELEMENTS[e].unlock));
  if (rarity === 'common') return maxU;
  if (rarity === 'rare') return Math.min(30, maxU + 1);
  if (rarity === 'epic') return 8;
  return 10;
}

export const DRAGONS = {};
export const DRAGON_LIST = [];

for (const [id, name, elements, rarity, cost, desc, look] of raw) {
  const h = hashStr(id);
  const r = RARITY[rarity];
  const t = timerFor(rarity, elements);
  const goldBase = r.gold * (1 + 0.08 * Math.max(0, ELEMENTS[elements[0]].unlock - 1));
  const species = {
    id, name, elements, rarity, cost, desc,
    unlock: unlockFor(rarity, elements),
    breedTime: t.breed * 1000,
    hatchTime: t.hatch * 1000,
    goldRate: Math.round(goldBase),
    xp: r.xp,
    look: {
      horn: (look && look.horn) ?? h % 4,
      tail: (look && look.tail) ?? (h >> 2) % 4,
      wing: (look && look.wing) ?? (h >> 4) % 3,
      spikes: (h >> 6) % 3,
      snout: (h >> 8) % 2,
    },
  };
  DRAGONS[id] = species;
  DRAGON_LIST.push(species);
}

export function species(id) {
  return DRAGONS[id];
}
