// Turn-based 3v3 battle engine. Pure logic; the UI animates the returned events.
import { DRAGONS, DRAGON_LIST, RARITY } from './data/dragons.js';
import { elementMultiplier, ELEMENTS } from './data/elements.js';
import { dragonStats } from './economy.js';
import { weightedPick } from './util.js';

const MOVE_NAMES = {
  fire: ['Flame Burst', 'Ember Shot'],
  earth: ['Rock Slide', 'Pebble Toss'],
  water: ['Tidal Wave', 'Water Jet'],
  nature: ['Vine Whip', 'Leaf Storm'],
  electric: ['Thunderbolt', 'Static Zap'],
  ice: ['Blizzard', 'Ice Shard'],
  metal: ['Steel Slash', 'Bolt Cannon'],
  dark: ['Shadow Claw', 'Night Bite'],
  light: ['Holy Beam', 'Flash'],
  legend: ['Legend Fury', 'Ancient Roar'],
};

// Mastery: moves grow stronger at levels 10, 20, 30 and 40.
export function masteryTier(level) {
  return Math.min(4, Math.floor(level / 10));
}

export function movesFor(speciesId, level = 1) {
  const sp = DRAGONS[speciesId];
  const moves = [];
  const bonus = masteryTier(level) * 10;
  const [e1, e2, e3, e4] = sp.elements;
  moves.push({ id: 'm1', name: MOVE_NAMES[e1][0], el: e1, power: 85 + bonus, acc: 0.9 });
  if (e2) moves.push({ id: 'm2', name: MOVE_NAMES[e2][0], el: e2, power: 80 + bonus, acc: 0.92 });
  else moves.push({ id: 'm2', name: MOVE_NAMES[e1][1], el: e1, power: 55 + bonus, acc: 1 });
  if (e3) moves.push({ id: 'm3', name: MOVE_NAMES[e3][0], el: e3, power: 80 + bonus, acc: 0.92 });
  else moves.push({ id: 'm3', name: 'Tail Slam', el: null, power: 75 + bonus, acc: 0.88 });
  if (e4) moves.push({ id: 'm4', name: MOVE_NAMES[e4][0], el: e4, power: 80 + bonus, acc: 0.92 });
  else moves.push({ id: 'm4', name: 'Bite', el: null, power: 55 + bonus, acc: 1 });
  return moves;
}

export function makeUnit(speciesId, level, name, id, stars = 0) {
  const st = dragonStats(speciesId, level, stars);
  const sp = DRAGONS[speciesId];
  return {
    id: id || `${speciesId}_${Math.random().toString(36).slice(2, 7)}`,
    species: speciesId, name: name || sp.name, level, stars, elements: sp.elements,
    maxHp: st.hp, hp: st.hp, atk: st.atk, def: st.def, spd: st.spd,
    moves: movesFor(speciesId, level),
  };
}

export function unitsFromDragons(dragons) {
  return dragons.map((d) => makeUnit(d.species, d.level, d.name, d.id, d.stars || 0));
}

export function unitsFromTeam(team) {
  return team.map((t) => makeUnit(t.species, t.level, t.name, undefined, t.stars || 0));
}

export function createBattle(playerUnits, enemyUnits, meta = {}) {
  return {
    player: playerUnits, enemy: enemyUnits,
    active: { player: firstAlive(playerUnits), enemy: firstAlive(enemyUnits) },
    round: 1, over: false, winner: null, meta,
  };
}

function firstAlive(units) {
  const i = units.findIndex((u) => u.hp > 0);
  return i < 0 ? 0 : i;
}

function aliveCount(units) {
  return units.filter((u) => u.hp > 0).length;
}

export function computeDamage(attacker, defender, move, rng = Math.random) {
  if (rng() > move.acc) return { dmg: 0, mult: 1, crit: false, miss: true };
  const mult = move.el ? elementMultiplier(move.el, defender.elements) : 1;
  const effMult = mult === 2 ? 1.75 : mult === 0.5 ? 0.6 : mult;
  const crit = rng() < 0.08;
  const stab = move.el && attacker.elements.includes(move.el) ? 1.1 : 1;
  const base = move.power * 0.32 * (attacker.atk / Math.max(1, defender.def));
  const variance = 0.9 + rng() * 0.2;
  const dmg = Math.max(1, Math.round(base * effMult * stab * (crit ? 1.5 : 1) * variance));
  return { dmg, mult, crit, miss: false };
}

function attack(battle, side, move, events) {
  const other = side === 'player' ? 'enemy' : 'player';
  const attacker = battle[side][battle.active[side]];
  const defender = battle[other][battle.active[other]];
  if (attacker.hp <= 0 || defender.hp <= 0) return;
  const res = computeDamage(attacker, defender, move);
  defender.hp = Math.max(0, defender.hp - res.dmg);
  events.push({ type: 'attack', side, attacker: attacker.id, target: defender.id, move, ...res, targetHp: defender.hp, targetMax: defender.maxHp });
  if (defender.hp <= 0) {
    events.push({ type: 'faint', side: other, unit: defender.id });
    if (aliveCount(battle[other]) === 0) {
      battle.over = true;
      battle.winner = side;
      events.push({ type: 'end', winner: side });
    } else {
      battle.active[other] = firstAlive(battle[other]);
      events.push({ type: 'switch', side: other, unit: battle[other][battle.active[other]].id, forced: true });
    }
  }
}

export function enemyChooseMove(battle) {
  const attacker = battle.enemy[battle.active.enemy];
  const defender = battle.player[battle.active.player];
  const scored = attacker.moves.map((m) => {
    const mult = m.el ? elementMultiplier(m.el, defender.elements) : 1;
    return { m, score: m.power * m.acc * mult * (0.85 + Math.random() * 0.3) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].m;
}

// Resolve one round. action = { type: 'attack', move } | { type: 'switch', index }
export function playRound(battle, action) {
  const events = [];
  if (battle.over) return events;
  const enemyMove = enemyChooseMove(battle);
  if (action.type === 'switch') {
    const target = battle.player[action.index];
    if (!target || target.hp <= 0 || action.index === battle.active.player) return events;
    battle.active.player = action.index;
    events.push({ type: 'switch', side: 'player', unit: target.id, forced: false });
    attack(battle, 'enemy', enemyMove, events);
  } else {
    const pu = battle.player[battle.active.player];
    const eu = battle.enemy[battle.active.enemy];
    const playerFirst = pu.spd >= eu.spd;
    const order = playerFirst ? ['player', 'enemy'] : ['enemy', 'player'];
    for (const side of order) {
      if (battle.over) break;
      const move = side === 'player' ? action.move : enemyMove;
      attack(battle, side, move, events);
    }
  }
  battle.round++;
  return events;
}

// Arena: a random opponent roughly matching the player's team strength.
export function makeArenaOpponent(state, teamLevels) {
  const avg = Math.max(1, Math.round(teamLevels.reduce((s, l) => s + l, 0) / Math.max(1, teamLevels.length)));
  const unlock = Math.min(10, Math.max(2, state.player.level));
  const pool = DRAGON_LIST.filter((d) => (d.rarity === 'common' || d.rarity === 'rare' || (d.rarity === 'epic' && state.player.level >= 8) || (d.rarity === 'legendary' && state.player.level >= 15)) && d.unlock <= unlock + 1);
  const weights = pool.map((d) => ({ item: d.id, weight: d.rarity === 'common' ? 10 : d.rarity === 'rare' ? 5 : d.rarity === 'epic' ? 2 : 1 }));
  const team = [];
  for (let i = 0; i < 3; i++) {
    let id = weightedPick(weights);
    let guard = 0;
    while (team.some((t) => t.species === id) && guard++ < 10) id = weightedPick(weights);
    team.push({ species: id, level: Math.max(1, avg + Math.round((Math.random() - 0.45) * 3)) });
  }
  const names = ['Rival Rook', 'Sky Pirate Vex', 'Lady Ashmere', 'Baron Von Scale', 'Tamer Juno', 'Old Man Cinder', 'Captain Brisk', 'Mira the Swift'];
  return { name: names[Math.floor(Math.random() * names.length)], team, level: avg };
}

export function describeMultiplier(mult) {
  if (mult >= 2) return 'Super effective!';
  if (mult <= 0.5) return 'Not very effective...';
  if (mult === 1.5) return 'Legendary power!';
  return '';
}

export function elementName(el) {
  return el ? ELEMENTS[el].name : 'Physical';
}

export function rarityName(id) {
  return RARITY[id].name;
}
