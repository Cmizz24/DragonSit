// Trainer cards and gift codes: sharing progress with friends without a server.
import { DRAGONS } from './data/dragons.js';
import { hashStr } from './util.js';
import { dayNumber } from './data/events.js';

const PREFIX = 'DS1.';

function b64url(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return decodeURIComponent(escape(atob(s)));
}

export function bestTeam(state, n = 3) {
  return [...state.dragons].sort((a, b) => b.level + (b.stars || 0) * 2 - (a.level + (a.stars || 0) * 2)).slice(0, n);
}

export function myCard(state) {
  const claimedAch = Object.values(state.achievements.claimed).reduce((s, v) => s + v, 0);
  return {
    id: state.player.id,
    name: state.player.name,
    level: state.player.level,
    trophies: state.battle.trophies,
    campaign: state.battle.campaignCleared,
    heroic: state.battle.heroicCleared,
    tower: state.tower.best,
    discovered: state.discovered.length,
    achievements: claimedAch,
    team: bestTeam(state).map((d) => ({ species: d.species, level: d.level, name: d.name, stars: d.stars || 0 })),
    updatedAt: Date.now(),
  };
}

export function encodeCard(card) {
  const arr = [1, card.id, card.name, card.level, card.trophies, card.campaign, card.tower, card.discovered, card.achievements, card.heroic || 0,
    card.team.map((t) => [t.species, t.level, t.name, t.stars || 0]), card.updatedAt];
  return PREFIX + b64url(JSON.stringify(arr));
}

export function decodeCard(text) {
  const t = String(text || '').trim();
  if (!t.startsWith(PREFIX)) throw new Error('Not a trainer card');
  const arr = JSON.parse(unb64url(t.slice(PREFIX.length)));
  if (!Array.isArray(arr) || arr[0] !== 1) throw new Error('Unknown card version');
  const [, id, name, level, trophies, campaign, tower, discovered, achievements, heroic, team, updatedAt] = arr;
  if (typeof id !== 'string' || !/^[A-Z0-9]{4,12}$/.test(id)) throw new Error('Bad card id');
  const cleanTeam = (Array.isArray(team) ? team : []).filter((x) => Array.isArray(x) && DRAGONS[x[0]]).slice(0, 3)
    .map((x) => ({ species: x[0], level: Math.max(1, Math.min(60, Math.floor(+x[1] || 1))), name: String(x[2] || DRAGONS[x[0]].name).slice(0, 16), stars: Math.max(0, Math.min(5, Math.floor(+x[3] || 0))) }));
  return {
    id, name: String(name || 'Keeper').slice(0, 16), level: Math.max(1, Math.floor(+level || 1)), trophies: Math.max(0, Math.floor(+trophies || 0)),
    campaign: Math.max(0, Math.floor(+campaign || 0)), tower: Math.max(0, Math.floor(+tower || 0)), discovered: Math.max(0, Math.floor(+discovered || 0)),
    achievements: Math.max(0, Math.floor(+achievements || 0)), heroic: Math.max(0, Math.floor(+heroic || 0)), team: cleanTeam, updatedAt: +updatedAt || Date.now(),
  };
}

// Gift codes are valid for the day they were made (plus one day of slack) and can be redeemed once per friend per day.
export function giftCode(playerId, day = dayNumber()) {
  const check = (hashStr(`${playerId}|${day}|dragonsit-gift`) % 46656).toString(36).toUpperCase().padStart(3, '0');
  return `GIFT-${playerId}-${day.toString(36).toUpperCase()}-${check}`;
}

export function parseGiftCode(code) {
  const m = String(code || '').trim().toUpperCase().match(/^GIFT-([A-Z0-9]{4,12})-([A-Z0-9]+)-([A-Z0-9]{3})$/);
  if (!m) return null;
  const [, fromId, dayStr, check] = m;
  const day = parseInt(dayStr, 36);
  if (!Number.isFinite(day)) return null;
  const expected = giftCode(fromId, day).split('-')[3];
  if (expected !== check) return null;
  return { fromId, day };
}

export const GIFT_REWARD = { gems: 5, gold: 2500, food: 250 };
