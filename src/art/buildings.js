// Procedural isometric building art. Each building image is `64*size` wide; the ground
// diamond sits at the bottom with TOP px of headroom above it for tall structures.
import { ELEMENTS } from '../data/elements.js';
import { BUILDINGS } from '../data/buildings.js';
import { dragonSVG } from './dragon.js';

export const TILE_W = 64;
export const TILE_H = 32;
export const TOP = 120;

export function imageSize(size) {
  return { w: TILE_W * size, h: TILE_H * size + TOP };
}

function ctx(size) {
  const { w, h } = imageSize(size);
  const iso = (u, v, z = 0) => [w / 2 + (u - v) * (TILE_W / 2), TOP + (u + v) * (TILE_H / 2) - z];
  const pt = (u, v, z) => iso(u, v, z).map((n) => n.toFixed(1)).join(',');
  const diamond = (u0, v0, u1, v1, fill, extra = '') => `<polygon points="${pt(u0, v0)} ${pt(u1, v0)} ${pt(u1, v1)} ${pt(u0, v1)}" fill="${fill}" ${extra}/>`;
  const box = (u, v, du, dv, hgt, top, left, right, extra = '') =>
    `<polygon points="${pt(u, v, hgt)} ${pt(u + du, v, hgt)} ${pt(u + du, v + dv, hgt)} ${pt(u, v + dv, hgt)}" fill="${top}" ${extra}/>` +
    `<polygon points="${pt(u, v + dv, hgt)} ${pt(u + du, v + dv, hgt)} ${pt(u + du, v + dv, 0)} ${pt(u, v + dv, 0)}" fill="${left}" ${extra}/>` +
    `<polygon points="${pt(u + du, v, hgt)} ${pt(u + du, v + dv, hgt)} ${pt(u + du, v + dv, 0)} ${pt(u + du, v, 0)}" fill="${right}" ${extra}/>`;
  const ell = (u, v, r, fill, z = 0, extra = '') => {
    const [x, y] = iso(u, v, z);
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(45.25 * r).toFixed(1)}" ry="${(22.6 * r).toFixed(1)}" fill="${fill}" ${extra}/>`;
  };
  const tree = (u, v, sc = 1, leaf = '#4caf50', leafDark = '#2e7d32', trunk = '#7a4b22') => {
    const [x, y] = iso(u, v);
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc})"><ellipse cx="0" cy="2" rx="14" ry="6" fill="#000" opacity=".18"/><rect x="-4" y="-22" width="8" height="24" rx="3" fill="${trunk}"/><circle cx="0" cy="-34" r="17" fill="${leafDark}"/><circle cx="-9" cy="-26" r="13" fill="${leaf}"/><circle cx="9" cy="-28" r="13" fill="${leaf}"/><circle cx="0" cy="-40" r="12" fill="${leaf}"/></g>`;
  };
  const rock = (u, v, sc = 1, col = '#8d8d99', hi = '#b6b6c2') => {
    const [x, y] = iso(u, v);
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc})"><ellipse cx="0" cy="3" rx="16" ry="6" fill="#000" opacity=".18"/><path d="M-16 0 L -10 -14 L 4 -18 L 15 -8 L 13 2 Z" fill="${col}" stroke="${shade(col, -40)}" stroke-width="1.5" stroke-linejoin="round"/><path d="M-8 -10 L 2 -14 L 8 -8 Z" fill="${hi}"/></g>`;
  };
  const crystal = (u, v, sc = 1, col = '#b388ff', hi = '#e7d6ff') => {
    const [x, y] = iso(u, v);
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc})"><ellipse cx="0" cy="2" rx="12" ry="5" fill="#000" opacity=".2"/><path d="M-9 0 L -6 -22 L 0 -38 L 7 -20 L 9 0 Z" fill="${col}" stroke="${shade(col, -50)}" stroke-width="1.5" stroke-linejoin="round"/><path d="M-3 -2 L -2 -20 L 0 -32 L 2 -18 L 2 -2 Z" fill="${hi}" opacity=".8"/></g>`;
  };
  const flower = (u, v, col) => {
    const [x, y] = iso(u, v);
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><rect x="-1" y="-8" width="2" height="8" fill="#3d8b37"/><circle cx="-4" cy="-10" r="3" fill="${col}"/><circle cx="4" cy="-10" r="3" fill="${col}"/><circle cx="0" cy="-14" r="3" fill="${col}"/><circle cx="0" cy="-6" r="3" fill="${col}"/><circle cx="0" cy="-10" r="2" fill="#fff59d"/></g>`;
  };
  return { w, h, iso, pt, diamond, box, ell, tree, rock, crystal, flower };
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function wrap(c, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${c.w}" height="${c.h}" viewBox="0 0 ${c.w} ${c.h}">${inner}</svg>`;
}

// Base platform with a thick edge.
function platform(c, size, top, side, inset = 0.08) {
  const a = inset, b = size - inset;
  const edge = `<polygon points="${c.pt(a, b, 0)} ${c.pt(b, b, 0)} ${c.pt(b, b, -8)} ${c.pt(a, b, -8)}" fill="${shade(side, -20)}"/>` +
    `<polygon points="${c.pt(b, a, 0)} ${c.pt(b, b, 0)} ${c.pt(b, b, -8)} ${c.pt(b, a, -8)}" fill="${side}"/>`;
  return edge + c.diamond(a, a, b, b, top);
}

const GROUND = { fire: '#5a2d1c', earth: '#a5732f', water: '#3f8f5c', nature: '#4caf50', electric: '#c9a13a', ice: '#dff5ff', metal: '#7a8592', dark: '#4b3170', light: '#f5f0dc', legend: '#d9a53a' };
const SIDE = { fire: '#3a1a0f', earth: '#6b4514', water: '#2a5f3d', nature: '#2e7d32', electric: '#8a6a1a', ice: '#9fd3e6', metal: '#4b5563', dark: '#2a1a45', light: '#c9c0a0', legend: '#8a5a12' };

function habitat(c, element, level) {
  const E = ELEMENTS[element];
  let s = platform(c, 3, GROUND[element], SIDE[element]);
  const lvl = level || 1;
  switch (element) {
    case 'fire':
      s += c.ell(1.5, 1.7, 0.75, '#ff6d1f') + c.ell(1.5, 1.7, 0.5, '#ffb300') + c.ell(1.45, 1.65, 0.22, '#fff176');
      s += c.rock(0.5, 2.4, 0.9, '#3e2723', '#5d4037') + c.rock(2.5, 0.6, 1.1, '#3e2723', '#5d4037');
      s += `<g transform="translate(${c.iso(2.3, 2.3)[0].toFixed(1)} ${c.iso(2.3, 2.3)[1].toFixed(1)})"><path d="M-26 0 L -8 -46 L 8 -46 L 26 0 Z" fill="#4e342e"/><path d="M-9 -44 L 9 -44 L 6 -50 L -6 -50 Z" fill="#ff7043"/><path d="M-2 -50 q 6 -14 2 -24 q 8 12 0 24" fill="#ffd54f"/></g>`;
      break;
    case 'earth':
      s += c.rock(0.7, 0.7, 1.4, '#8d6e63', '#bcaaa4') + c.rock(2.2, 1.0, 1.0, '#a1887f', '#d7ccc8') + c.rock(1.2, 2.3, 1.2, '#795548', '#a1887f');
      s += c.ell(2.2, 2.2, 0.35, '#c6a15b') + c.ell(0.6, 1.8, 0.28, '#c6a15b');
      s += c.flower(2.6, 2.4, '#ffca28');
      break;
    case 'water':
      s += c.ell(1.5, 1.5, 1.05, '#1e88e5', 0, 'stroke="#f2e6c4" stroke-width="5"') + c.ell(1.5, 1.5, 0.98, '#42a5f5') + c.ell(1.3, 1.35, 0.5, '#64b5f6');
      s += c.ell(1.9, 1.9, 0.18, '#66bb6a') + c.ell(1.1, 1.0, 0.14, '#66bb6a') + `<circle cx="${c.iso(1.9, 1.9)[0]}" cy="${c.iso(1.9, 1.9)[1] - 4}" r="4" fill="#f06292"/>`;
      s += c.rock(2.5, 0.5, 0.8, '#90a4ae', '#cfd8dc');
      break;
    case 'nature':
      s += c.tree(0.7, 0.8, 1.1) + c.tree(2.3, 0.7, 0.9, '#66bb6a', '#388e3c') + c.tree(1.2, 2.3, 1.0, '#8bc34a', '#558b2f');
      s += c.flower(2.4, 2.4, '#ec407a') + c.flower(2.6, 1.6, '#ffee58') + c.flower(0.5, 2.0, '#ab47bc');
      break;
    case 'electric': {
      const [x, y] = c.iso(1.5, 1.5);
      s += c.ell(1.5, 1.5, 0.5, '#8a6a1a');
      s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><rect x="-5" y="-70" width="10" height="70" fill="#616161"/><circle cx="0" cy="-76" r="14" fill="#90a4ae" stroke="#455a64" stroke-width="2"/><path d="M-4 -76 L 2 -88 L 0 -78 L 6 -78 L -2 -64 L 0 -74 Z" fill="#ffee58"/><path d="M-28 -60 L -20 -74 L -22 -66 L -16 -66 L -24 -52 L -22 -60 Z" fill="#ffee58" opacity=".9"/><path d="M28 -66 L 20 -80 L 22 -72 L 16 -72 L 24 -58 L 22 -66 Z" fill="#ffee58" opacity=".9"/></g>`;
      s += c.crystal(0.6, 2.3, 0.9, '#ffe082', '#fff8e1') + c.crystal(2.4, 0.7, 0.8, '#ffe082', '#fff8e1');
      break;
    }
    case 'ice':
      s += c.ell(1.0, 2.1, 0.5, '#fff') + c.ell(2.0, 0.9, 0.4, '#fff');
      s += c.crystal(1.5, 1.4, 1.5, '#81d4fa', '#e1f5fe') + c.crystal(0.7, 1.0, 1.0, '#4fc3f7', '#e1f5fe') + c.crystal(2.4, 2.2, 1.1, '#4fc3f7', '#e1f5fe');
      break;
    case 'metal': {
      const [x, y] = c.iso(1.5, 1.5);
      s += c.box(0.5, 0.5, 2, 2, 10, '#b0bec5', '#78909c', '#90a4ae');
      s += `<g transform="translate(${x.toFixed(1)} ${(y - 12).toFixed(1)})">${gear(0, -18, 22, '#78909c', '#546e7a')}${gear(30, -8, 14, '#90a4ae', '#546e7a')}${gear(-30, -6, 12, '#90a4ae', '#546e7a')}</g>`;
      s += c.rock(0.5, 2.5, 0.8, '#78909c', '#cfd8dc');
      break;
    }
    case 'dark':
      s += c.ell(1.5, 1.6, 0.6, '#311b5c');
      s += c.crystal(1.5, 1.5, 1.6, '#7e57c2', '#d1c4e9') + c.crystal(0.6, 2.2, 1.0, '#9575cd', '#d1c4e9') + c.crystal(2.4, 0.6, 1.1, '#5e35b1', '#d1c4e9');
      s += `<g transform="translate(${c.iso(0.8, 0.8)[0].toFixed(1)} ${c.iso(0.8, 0.8)[1].toFixed(1)})"><path d="M0 0 L 0 -30 M0 -18 L -12 -30 M0 -24 L 10 -36 M-12 -30 L -16 -40" stroke="#2a1a45" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
      break;
    case 'light': {
      s += c.box(0.35, 0.35, 0.3, 0.3, 44, '#fffde7', '#e6dfc0', '#f3edd2') + c.box(2.35, 0.35, 0.3, 0.3, 44, '#fffde7', '#e6dfc0', '#f3edd2') + c.box(0.35, 2.35, 0.3, 0.3, 44, '#fffde7', '#e6dfc0', '#f3edd2') + c.box(2.35, 2.35, 0.3, 0.3, 44, '#fffde7', '#e6dfc0', '#f3edd2');
      const [x, y] = c.iso(1.5, 1.5);
      s += `<circle cx="${x.toFixed(1)}" cy="${(y - 34).toFixed(1)}" r="30" fill="#ffee58" opacity=".25"/><circle cx="${x.toFixed(1)}" cy="${(y - 34).toFixed(1)}" r="16" fill="#fff59d" stroke="#fbc02d" stroke-width="3"/>`;
      s += `<rect x="${(x - 6).toFixed(1)}" y="${(y - 20).toFixed(1)}" width="12" height="20" fill="#e6dfc0"/>`;
      break;
    }
    case 'legend': {
      const [x, y] = c.iso(1.5, 1.5);
      s += c.box(0.3, 0.3, 2.4, 2.4, 6, '#f6c453', '#a8701a', '#c98a24');
      s += `<circle cx="${x.toFixed(1)}" cy="${(y - 44).toFixed(1)}" r="46" fill="#ffd54f" opacity=".25"/>`;
      s += c.crystal(1.5, 1.5, 2.0, '#ffb300', '#fff3c4') + c.crystal(0.6, 2.3, 1.0, '#ffca28', '#fff8e1') + c.crystal(2.4, 0.6, 1.0, '#ffca28', '#fff8e1');
      break;
    }
  }
  if (lvl >= 2) s += `<g transform="translate(${c.iso(0.35, 2.75)[0].toFixed(1)} ${c.iso(0.35, 2.75)[1].toFixed(1)})"><rect x="-3" y="-30" width="6" height="30" fill="#6d4c41"/><path d="M3 -30 L 24 -24 L 3 -18 Z" fill="${E.color}" stroke="${E.dark}" stroke-width="1.5"/></g>`;
  if (lvl >= 3) s += `<g transform="translate(${c.iso(2.75, 0.35)[0].toFixed(1)} ${c.iso(2.75, 0.35)[1].toFixed(1)})"><rect x="-3" y="-30" width="6" height="30" fill="#6d4c41"/><path d="M3 -30 L 24 -24 L 3 -18 Z" fill="${E.color}" stroke="${E.dark}" stroke-width="1.5"/></g>`;
  return s;
}

function gear(x, y, r, col, dark) {
  const pts = [];
  const teeth = 8;
  for (let i = 0; i < teeth * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a1 = (i / (teeth * 2)) * Math.PI * 2;
    const a2 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    pts.push(`${(x + Math.cos(a1) * rr).toFixed(1)},${(y + Math.sin(a1) * rr).toFixed(1)}`);
    pts.push(`${(x + Math.cos(a2) * rr).toFixed(1)},${(y + Math.sin(a2) * rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${col}" stroke="${dark}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r * 0.3}" fill="${dark}"/>`;
}

function farm(c, level, state) {
  let s = platform(c, 2, '#8d6e63', '#5d4037');
  for (let i = 0; i < 4; i++) s += `<polygon points="${c.pt(0.2 + i * 0.45, 0.2)} ${c.pt(0.4 + i * 0.45, 0.2)} ${c.pt(0.4 + i * 0.45, 1.8)} ${c.pt(0.2 + i * 0.45, 1.8)}" fill="#6d4c41"/>`;
  if (state === 'growing' || state === 'ready') {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const [x, y] = c.iso(0.3 + i * 0.45, 0.4 + j * 0.55);
        if (state === 'growing') s += `<path d="M${x} ${y} l -4 -8 M${x} ${y} l 4 -8 M${x} ${y} l 0 -11" stroke="#7cb342" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
        else s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path d="M0 0 l -6 -14 M0 0 l 6 -14 M0 0 l 0 -18" stroke="#558b2f" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="-5" cy="-13" r="4" fill="#ff7043"/><circle cx="5" cy="-15" r="4" fill="#ffca28"/><circle cx="0" cy="-19" r="4" fill="#ef5350"/></g>`;
      }
    }
  }
  s += c.box(1.55, -0.05, 0.5, 0.45, 26, '#c62828', '#8e1c1c', '#b71c1c');
  s += `<polygon points="${c.pt(1.55, -0.05, 26)} ${c.pt(1.8, -0.3, 40)} ${c.pt(2.05, -0.05, 26)}" fill="#ef5350"/>`;
  if (level >= 2) s += `<polygon points="${c.pt(-0.05, 0.1, 0)} ${c.pt(-0.05, 0.1, 14)} ${c.pt(-0.05, 1.9, 14)} ${c.pt(-0.05, 1.9, 0)}" fill="#a1887f" opacity=".9"/>`;
  if (level >= 3) s += `<g transform="translate(${c.iso(0.05, 1.95)[0].toFixed(1)} ${c.iso(0.05, 1.95)[1].toFixed(1)})"><rect x="-3" y="-42" width="6" height="42" fill="#795548"/><path d="M0 -42 l -16 -10 l 6 12 l -12 6 l 14 0 l -4 14 l 12 -8 l 12 8 l -4 -14 l 14 0 l -12 -6 l 6 -12 Z" fill="#ffe082" stroke="#795548" stroke-width="1.5"/></g>`;
  if (level >= 4) s += c.tree(1.9, 1.9, 0.9, '#ffd54f', '#f9a825');
  return s;
}

function breeding(c, active) {
  let s = platform(c, 3, '#6d8b4a', '#3f5a2b');
  const [x, y] = c.iso(1.5, 1.5);
  s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
<path d="M-70 10 L -30 -70 L -10 -50 L 10 -82 L 34 -46 L 70 10 Z" fill="#7d6b5d" stroke="#4e3c30" stroke-width="2" stroke-linejoin="round"/>
<path d="M-30 -70 L -18 -58 L -10 -50 L 2 -68 L 10 -82 L 20 -66 L 34 -46 L 22 -50 L 12 -40 L -6 -44 L -22 -46 Z" fill="#f5f5f5"/>
<path d="M-40 10 L -10 -30 L 20 10 Z" fill="#3e2723" opacity=".55"/>
<g transform="translate(0 -18)"><path d="M0 8 C -22 -10 -14 -30 0 -18 C 14 -30 22 -10 0 8 Z" fill="${active ? '#ff4081' : '#ad6b7d'}" stroke="#7b1f43" stroke-width="2"/></g>
</g>`;
  s += c.ell(0.6, 2.4, 0.3, '#8d6e63') + c.ell(2.4, 0.6, 0.3, '#8d6e63');
  s += c.tree(2.6, 2.6, 0.8) + c.flower(0.4, 1.2, '#f06292') + c.flower(1.2, 0.4, '#ec407a');
  if (active) s += `<g transform="translate(${x.toFixed(1)} ${(y - 90).toFixed(1)})"><path d="M0 6 C -10 -4 -6 -14 0 -8 C 6 -14 10 -4 0 6 Z" fill="#ff80ab"/><path d="M-22 16 C -28 10 -25 4 -22 8 C -19 4 -16 10 -22 16 Z" fill="#ff80ab" opacity=".8"/><path d="M22 -6 C 16 -12 19 -18 22 -14 C 25 -18 28 -12 22 -6 Z" fill="#ff80ab" opacity=".8"/></g>`;
  return s;
}

function hatchery(c, eggColors, level) {
  let s = platform(c, 2, '#c9a56b', '#8a6a3b');
  const [x, y] = c.iso(1, 1);
  s += `<ellipse cx="${x.toFixed(1)}" cy="${(y - 4).toFixed(1)}" rx="48" ry="26" fill="#8d6e63" stroke="#5d4037" stroke-width="3"/><ellipse cx="${x.toFixed(1)}" cy="${(y - 8).toFixed(1)}" rx="40" ry="20" fill="#a1887f"/>`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    s += `<path d="M${(x + Math.cos(a) * 30).toFixed(1)} ${(y - 6 + Math.sin(a) * 15).toFixed(1)} l ${(Math.cos(a) * 16).toFixed(1)} ${(Math.sin(a) * 9).toFixed(1)}" stroke="#d7b98a" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  const slots = [[-18, -14], [16, -12], [-2, -30], [0, 2]];
  eggColors.slice(0, 4).forEach((col, i) => {
    const [dx, dy] = slots[i];
    s += `<g transform="translate(${(x + dx).toFixed(1)} ${(y - 12 + dy).toFixed(1)})"><path d="M0 -26 C -11 -26 -15 -12 -15 -4 C -15 6 -8 12 0 12 C 8 12 15 6 15 -4 C 15 -12 11 -26 0 -26 Z" fill="${col.color}" stroke="${col.dark}" stroke-width="2"/><circle cx="-4" cy="-8" r="3" fill="${col.dark}" opacity=".5"/><circle cx="5" cy="0" r="2.5" fill="${col.dark}" opacity=".5"/></g>`;
  });
  s += `<g transform="translate(${(x + 44).toFixed(1)} ${(y - 8).toFixed(1)})"><rect x="-4" y="-40" width="8" height="40" fill="#6d4c41"/><circle cx="0" cy="-46" r="9" fill="#ff8a65" stroke="#bf360c" stroke-width="2"/><path d="M-3 -46 q 3 -10 6 0" fill="#ffd54f"/></g>`;
  if (level >= 2) s += `<g transform="translate(${(x - 46).toFixed(1)} ${(y - 8).toFixed(1)})"><rect x="-4" y="-40" width="8" height="40" fill="#6d4c41"/><circle cx="0" cy="-46" r="9" fill="#ff8a65" stroke="#bf360c" stroke-width="2"/><path d="M-3 -46 q 3 -10 6 0" fill="#ffd54f"/></g>`;
  return s;
}

function mine(c, level) {
  let s = platform(c, 2, '#7d6b5d', '#4e3c30');
  const [x, y] = c.iso(1, 1);
  s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path d="M-58 4 L -30 -52 L 0 -64 L 32 -50 L 58 4 Z" fill="#6d5c50" stroke="#3e2f26" stroke-width="2" stroke-linejoin="round"/><path d="M-30 -52 L 0 -64 L 32 -50 L 10 -40 L -12 -38 Z" fill="#8a7869"/>`;
  s += `<path d="M-22 4 L -22 -22 A 22 22 0 0 1 22 -22 L 22 4 Z" fill="#1c1410"/><path d="M-26 4 L -26 -22 A 26 26 0 0 1 26 -22 L 26 4 M-26 -6 L 26 -6" fill="none" stroke="#a1774a" stroke-width="5"/></g>`;
  s += c.crystal(0.35, 1.7, 0.9, '#b388ff', '#ede7f6') + c.crystal(1.75, 0.5, 0.8, '#f48fb1', '#fce4ec');
  if (level >= 2) s += c.crystal(0.4, 0.4, 1.1, '#80d8ff', '#e1f5fe');
  if (level >= 3) s += c.crystal(1.7, 1.7, 1.2, '#ffd740', '#fff8e1');
  const [cx, cy] = c.iso(1.65, 1.35);
  s += `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})"><path d="M-14 -4 L -10 -16 L 12 -16 L 14 -4 Z" fill="#5d4037" stroke="#3e2723" stroke-width="1.5"/><circle cx="-8" cy="-2" r="3.5" fill="#263238"/><circle cx="8" cy="-2" r="3.5" fill="#263238"/><circle cx="-4" cy="-18" r="4" fill="#b388ff"/><circle cx="4" cy="-19" r="3.5" fill="#f48fb1"/></g>`;
  return s;
}

function temple(c, tier) {
  const cols = ['#ffe082', '#80deea', '#ce93d8', '#ffab91', '#f48fb1'][tier - 1];
  let s = platform(c, 2, '#e0d6bd', '#a89f86');
  s += c.box(0.25, 0.25, 1.5, 1.5, 6, '#f5f0e1', '#c9c0a4', '#e0d8c0');
  for (const [u, v] of [[0.35, 0.35], [1.5, 0.35], [0.35, 1.5], [1.5, 1.5]]) s += c.box(u, v, 0.18, 0.18, 46, '#fffbf0', '#cfc6ae', '#e8e0c8');
  s += `<polygon points="${c.pt(0.2, 0.2, 50)} ${c.pt(1.8, 0.2, 50)} ${c.pt(1.8, 1.8, 50)} ${c.pt(0.2, 1.8, 50)}" fill="#d7ccc8"/>`;
  s += `<polygon points="${c.pt(0.2, 0.2, 50)} ${c.pt(1.8, 0.2, 50)} ${c.pt(1, 1, 88)}" fill="${shade(cols, -30)}"/><polygon points="${c.pt(1.8, 0.2, 50)} ${c.pt(1.8, 1.8, 50)} ${c.pt(1, 1, 88)}" fill="${cols}"/><polygon points="${c.pt(0.2, 1.8, 50)} ${c.pt(1.8, 1.8, 50)} ${c.pt(1, 1, 88)}" fill="${shade(cols, -15)}"/><polygon points="${c.pt(0.2, 0.2, 50)} ${c.pt(0.2, 1.8, 50)} ${c.pt(1, 1, 88)}" fill="${shade(cols, -50)}"/>`;
  const [x, y] = c.iso(1, 1, 92);
  s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#fff59d" stroke="#f9a825" stroke-width="2"/>`;
  return s;
}

function deco(c, id) {
  switch (id) {
    case 'deco_tree':
      return c.tree(0.5, 0.5, 1.15);
    case 'deco_flowers':
      return c.ell(0.5, 0.5, 0.42, '#66bb6a') + c.flower(0.35, 0.35, '#ec407a') + c.flower(0.7, 0.4, '#ffee58') + c.flower(0.45, 0.72, '#42a5f5') + c.flower(0.75, 0.75, '#ff7043');
    case 'deco_lantern': {
      const [x, y] = c.iso(0.5, 0.5);
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><ellipse cx="0" cy="2" rx="14" ry="6" fill="#000" opacity=".2"/><rect x="-10" y="-8" width="20" height="8" fill="#9e9e9e"/><rect x="-5" y="-34" width="10" height="26" fill="#bdbdbd"/><rect x="-12" y="-48" width="24" height="14" rx="2" fill="#757575"/><rect x="-8" y="-46" width="16" height="10" fill="#fff59d"/><path d="M-14 -48 L 0 -58 L 14 -48 Z" fill="#616161"/><circle cx="0" cy="-41" r="14" fill="#fff59d" opacity=".25"/></g>`;
    }
    case 'deco_fountain': {
      const [x, y] = c.iso(1, 1);
      return c.ell(1, 1, 0.95, '#90a4ae') + c.ell(1, 1, 0.82, '#4fc3f7') + `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><rect x="-6" y="-30" width="12" height="30" fill="#b0bec5"/><ellipse cx="0" cy="-30" rx="26" ry="10" fill="#90a4ae"/><ellipse cx="0" cy="-32" rx="20" ry="7" fill="#81d4fa"/><rect x="-4" y="-50" width="8" height="20" fill="#b0bec5"/><path d="M0 -50 q -18 -10 -26 8 M0 -50 q 18 -10 26 8 M0 -50 q 0 -14 0 -6" stroke="#b3e5fc" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
    }
    case 'deco_statue': {
      const [x, y] = c.iso(1, 1);
      const inner = dragonSVG('legend', 'adult', { size: 200 }).replace(/<svg[^>]*>/, '').replace('</svg>', '');
      return c.box(0.3, 0.3, 1.4, 1.4, 14, '#cfd8dc', '#78909c', '#90a4ae') + `<g transform="translate(${(x - 50).toFixed(1)} ${(y - 118).toFixed(1)}) scale(0.5)">${inner}</g>`;
    }
    case 'deco_crystal':
      return c.crystal(0.5, 0.5, 1.4, '#b388ff', '#ede7f6');
    case 'deco_bonfire': {
      const [x, y] = c.iso(0.5, 0.5);
      return c.ell(0.5, 0.5, 0.4, '#6d4c41') + `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path d="M-16 0 L 16 -8 M-16 -8 L 16 0" stroke="#5d4037" stroke-width="6" stroke-linecap="round"/><path d="M0 -44 C 12 -30 14 -18 8 -8 C 4 -14 2 -18 0 -22 C -2 -16 -8 -12 -8 -6 C -16 -18 -10 -30 0 -44 Z" fill="#ff7043"/><path d="M0 -30 C 6 -22 6 -14 2 -8 C 0 -12 -2 -16 -3 -18 C -5 -14 -6 -12 -5 -8 C -9 -16 -6 -24 0 -30 Z" fill="#ffd54f"/><circle cx="0" cy="-26" r="22" fill="#ffab40" opacity=".18"/></g>`;
    }
    case 'deco_pond':
      return c.ell(1, 1, 0.95, '#c9b46a') + c.ell(1, 1, 0.85, '#2196f3') + c.ell(0.85, 0.9, 0.45, '#64b5f6') + c.ell(1.25, 1.2, 0.16, '#66bb6a') + c.ell(0.75, 1.3, 0.14, '#66bb6a') + `<circle cx="${c.iso(1.25, 1.2)[0]}" cy="${c.iso(1.25, 1.2)[1] - 4}" r="4" fill="#f06292"/>` + `<g transform="translate(${c.iso(1.8, 0.4)[0].toFixed(1)} ${c.iso(1.8, 0.4)[1].toFixed(1)})"><path d="M0 0 L 0 -26 M6 2 L 8 -22 M-6 2 L -7 -20" stroke="#7cb342" stroke-width="3" stroke-linecap="round"/><ellipse cx="0" cy="-28" rx="3" ry="6" fill="#795548"/><ellipse cx="8" cy="-24" rx="2.5" ry="5" fill="#795548"/></g>`;
    case 'deco_windmill': {
      const [x, y] = c.iso(1, 1);
      return c.box(0.55, 0.55, 0.9, 0.9, 40, '#efebe9', '#a1887f', '#bcaaa4') + `<g transform="translate(${x.toFixed(1)} ${(y - 40).toFixed(1)})"><path d="M-30 -14 L 0 -14 L 30 -14 L 0 -30 Z" fill="#8d6e63"/><circle cx="0" cy="-22" r="5" fill="#5d4037"/><g stroke="#5d4037" stroke-width="3" fill="#fff3e0"><path d="M0 -22 L 34 -50 L 40 -44 L 4 -18 Z"/><path d="M0 -22 L 34 6 L 28 12 L -4 -18 Z"/><path d="M0 -22 L -34 6 L -40 0 L -4 -26 Z"/><path d="M0 -22 L -34 -50 L -28 -56 L 4 -26 Z"/></g></g>`;
    }
    case 'deco_arch': {
      const [x, y] = c.iso(1, 1);
      const bands = ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0'];
      return c.ell(0.5, 1.5, 0.25, '#fff') + c.ell(1.5, 0.5, 0.25, '#fff') + `<g transform="translate(${x.toFixed(1)} ${(y - 6).toFixed(1)})">${bands.map((col, i) => `<path d="M${-50 + i * 6} 0 A ${50 - i * 6} ${50 - i * 6} 0 0 1 ${50 - i * 6} 0" fill="none" stroke="${col}" stroke-width="6"/>`).join('')}</g>`;
    }
    case 'deco_totem': {
      const [x, y] = c.iso(0.5, 0.5);
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><ellipse cx="0" cy="2" rx="16" ry="6" fill="#000" opacity=".2"/><rect x="-12" y="-70" width="24" height="70" rx="4" fill="#8d6e63" stroke="#4e342e" stroke-width="2"/><rect x="-12" y="-48" width="24" height="4" fill="#4e342e"/><rect x="-12" y="-26" width="24" height="4" fill="#4e342e"/><circle cx="-5" cy="-60" r="3" fill="#ffd54f"/><circle cx="5" cy="-60" r="3" fill="#ffd54f"/><path d="M-6 -52 q 6 4 12 0" stroke="#ffd54f" stroke-width="2" fill="none"/><circle cx="-5" cy="-38" r="3" fill="#80deea"/><circle cx="5" cy="-38" r="3" fill="#80deea"/><path d="M-6 -30 q 6 -4 12 0" stroke="#80deea" stroke-width="2" fill="none"/><circle cx="-5" cy="-16" r="3" fill="#f48fb1"/><circle cx="5" cy="-16" r="3" fill="#f48fb1"/><path d="M-16 -74 L 0 -84 L 16 -74 Z" fill="#ff7043" stroke="#4e342e" stroke-width="2"/></g>`;
    }
    case 'deco_obelisk': {
      const [x, y] = c.iso(0.5, 0.5);
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><ellipse cx="0" cy="2" rx="16" ry="6" fill="#000" opacity=".25"/><path d="M-12 0 L -8 -84 L 0 -96 L 8 -84 L 12 0 Z" fill="#37474f" stroke="#102027" stroke-width="2"/><path d="M-2 -70 h4 M-3 -60 h6 M-2 -50 h4 M-3 -40 h6 M-2 -30 h4 M-3 -20 h6" stroke="#80deea" stroke-width="3" stroke-linecap="round"/><path d="M0 -96 L 0 -110" stroke="#80deea" stroke-width="3" stroke-linecap="round" opacity=".7"/><circle cx="0" cy="-60" r="26" fill="#80deea" opacity=".12"/></g>`;
    }
  }
  return '';
}

// b: building state object (level, growing, eggs...). extra: { farmState, eggs:[speciesIds], breedingActive }
export function buildingSVG(b, extra = {}) {
  const def = BUILDINGS[b.def];
  const c = ctx(def.size);
  let inner = '';
  if (def.type === 'habitat') inner = habitat(c, def.element, b.level);
  else if (def.type === 'farm') inner = farm(c, b.level, extra.farmState || 'empty');
  else if (def.type === 'breeding') inner = breeding(c, !!extra.breedingActive);
  else if (def.type === 'hatchery') inner = hatchery(c, (extra.eggs || []).map((sp) => ELEMENTS[sp.elements[0]]), b.level);
  else if (def.type === 'temple') inner = temple(c, +def.id.split('_')[1]);
  else if (def.type === 'mine') inner = mine(c, b.level);
  else if (def.type === 'deco') inner = deco(c, def.id);
  return wrap(c, inner);
}

export function buildingKey(b, extra = {}) {
  return [b.def, b.level, extra.farmState || '', (extra.eggs || []).map((s) => s.id).join('.'), extra.breedingActive ? 1 : 0].join('|');
}

// Locked-zone marker and misc canvas helpers can live here too.
export function lockSVG(size = 48) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" fill="#ffd54f" stroke="#7a5a00" stroke-width="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#7a5a00" stroke-width="2.2"/><circle cx="12" cy="15.5" r="1.8" fill="#7a5a00"/></svg>`;
}
