// Optional cloud sync through a Firebase Realtime Database REST endpoint.
// Works with any URL that accepts GET/PUT on "<url>/<path>.json" the way Firebase does.
import { CLOUD_URL } from './config.js';
import { myCard } from './social.js';

export function cloudUrl(state) {
  const u = (state && state.settings && state.settings.cloudUrl) || CLOUD_URL || '';
  return u.replace(/\/+$/, '');
}

export function cloudEnabled(state) {
  return !!cloudUrl(state);
}

async function request(url, method = 'GET', body) {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) throw new Error(`Cloud error ${res.status}`);
  return res.json();
}

export async function publishCard(state) {
  const base = cloudUrl(state);
  if (!base) return null;
  const card = myCard(state);
  await request(`${base}/players/${encodeURIComponent(card.id)}.json`, 'PUT', card);
  state.cloudLastPublish = Date.now();
  return card;
}

export async function fetchPlayer(state, id) {
  const base = cloudUrl(state);
  if (!base) return null;
  const card = await request(`${base}/players/${encodeURIComponent(id)}.json`);
  return card && card.id ? card : null;
}

export async function fetchLeaderboard(state, limit = 50) {
  const base = cloudUrl(state);
  if (!base) return [];
  let data;
  try {
    data = await request(`${base}/players.json?orderBy=%22trophies%22&limitToLast=${limit}`);
  } catch (err) {
    data = await request(`${base}/players.json`);
  }
  const list = Object.values(data || {}).filter((c) => c && c.id);
  list.sort((a, b) => (b.trophies || 0) - (a.trophies || 0) || (b.tower || 0) - (a.tower || 0));
  return list.slice(0, limit);
}
