// Procedural isometric building art, v2: gradients, raised textured platforms and richer scenery.
// Each building image is `64*size` wide; the ground diamond sits at the bottom with TOP px of headroom.
import { ELEMENTS } from '../data/elements.js';
import { BUILDINGS } from '../data/buildings.js';
import { dragonSVG, shade, mix } from './dragon.js';

export const TILE_W = 64;
export const TILE_H = 32;
export const TOP = 120;

export function imageSize(size) {
  return { w: TILE_W * size, h: TILE_H * size + TOP };
}

const f1 = (n) => (Math.round(n * 10) / 10).toString();

function ctx(size, uid) {
  const { w, h } = imageSize(size);
  const defs = [];
  const iso = (u, v, z = 0) => [w / 2 + (u - v) * (TILE_W / 2), TOP + (u + v) * (TILE_H / 2) - z];
  const pt = (u, v, z) => iso(u, v, z).map(f1).join(',');
  const grad = (id, stops, opts = {}) => {
    const sid = `${uid}${id}`;
    if (opts.radial) defs.push(`<radialGradient id="${sid}" cx="${opts.cx ?? 0.4}" cy="${opts.cy ?? 0.35}" r="${opts.r ?? 0.75}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`);
    else defs.push(`<linearGradient id="${sid}" x1="${opts.x1 ?? 0}" y1="${opts.y1 ?? 0}" x2="${opts.x2 ?? 0}" y2="${opts.y2 ?? 1}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`);
    return `url(#${sid})`;
  };
  const blur = (id, sd) => {
    defs.push(`<filter id="${uid}${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${sd}"/></filter>`);
    return `url(#${uid}${id})`;
  };
  const glow = (id, sd) => {
    defs.push(`<filter id="${uid}${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
    return `url(#${uid}${id})`;
  };
  const diamond = (u0, v0, u1, v1, fill, extra = '', z = 0) => `<polygon points="${pt(u0, v0, z)} ${pt(u1, v0, z)} ${pt(u1, v1, z)} ${pt(u0, v1, z)}" fill="${fill}" ${extra}/>`;
  const box = (u, v, du, dv, hgt, top, left, right, extra = '') =>
    `<polygon points="${pt(u, v, hgt)} ${pt(u + du, v, hgt)} ${pt(u + du, v + dv, hgt)} ${pt(u, v + dv, hgt)}" fill="${top}" ${extra}/>` +
    `<polygon points="${pt(u, v + dv, hgt)} ${pt(u + du, v + dv, hgt)} ${pt(u + du, v + dv, 0)} ${pt(u, v + dv, 0)}" fill="${left}" ${extra}/>` +
    `<polygon points="${pt(u + du, v, hgt)} ${pt(u + du, v + dv, hgt)} ${pt(u + du, v + dv, 0)} ${pt(u + du, v, 0)}" fill="${right}" ${extra}/>`;
  const ell = (u, v, r, fill, z = 0, extra = '') => {
    const [x, y] = iso(u, v, z);
    return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(45.25 * r)}" ry="${f1(22.6 * r)}" fill="${fill}" ${extra}/>`;
  };
  const at = (u, v, z, inner, sc = 1) => {
    const [x, y] = iso(u, v, z);
    return `<g transform="translate(${f1(x)} ${f1(y)})${sc !== 1 ? ` scale(${sc})` : ''}">${inner}</g>`;
  };
  return { w, h, defs, iso, pt, grad, blur, glow, diamond, box, ell, at };
}

// ---------- scenery pieces (drawn at an origin on the ground) ----------
function tree(c, id, leaf = '#4caf50', leafDark = '#1b5e20', trunk = '#6d4c41') {
  const g = c.grad(`tl${id}`, [[0, mix(leaf, '#fff', 0.35)], [0.55, leaf], [1, leafDark]], { radial: true, cx: 0.35, cy: 0.3 });
  const t = c.grad(`tt${id}`, [[0, shade(trunk, 30)], [0.5, trunk], [1, shade(trunk, -40)]], { x2: 1, y2: 0 });
  return `<ellipse cx="0" cy="3" rx="16" ry="6" fill="#000" opacity=".25"/><path d="M-5 0 C -4 -10 -4 -18 -3 -26 L 3 -26 C 4 -18 4 -10 5 0 Z" fill="${t}"/><path d="M-3 -20 C -10 -24 -14 -30 -12 -32 M3 -22 C 10 -26 13 -30 12 -34" stroke="${t}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="-10" cy="-30" r="14" fill="${g}"/><circle cx="11" cy="-32" r="14" fill="${g}"/><circle cx="0" cy="-44" r="15" fill="${g}"/><circle cx="0" cy="-32" r="14" fill="${g}"/><path d="M-8 -50 Q 0 -56 8 -50" stroke="#fff" stroke-width="3" fill="none" opacity=".25" stroke-linecap="round"/>`;
}
function rock(c, id, col = '#8d8d99') {
  const g = c.grad(`rk${id}`, [[0, mix(col, '#fff', 0.45)], [0.5, col], [1, shade(col, -55)]], { radial: true, cx: 0.3, cy: 0.25, r: 0.9 });
  return `<ellipse cx="0" cy="3" rx="18" ry="7" fill="#000" opacity=".25"/><path d="M-18 0 C -18 -8 -12 -14 -6 -18 C 0 -22 8 -22 14 -16 C 18 -12 19 -4 16 2 Z" fill="${g}" stroke="${shade(col, -70)}" stroke-width="1"/><path d="M-6 -6 L 2 -14 M6 -4 L 10 -10" stroke="${shade(col, -60)}" stroke-width="1" opacity=".5"/>`;
}
function crystal(c, id, col = '#b388ff') {
  const g = c.grad(`cr${id}`, [[0, shade(col, -40)], [0.5, col], [1, mix(col, '#fff', 0.7)]], { x2: 1, y2: -0.3 });
  const gl = c.glow(`cg${id}`, 3);
  return `<ellipse cx="0" cy="2" rx="12" ry="5" fill="#000" opacity=".25"/><g filter="${gl}"><path d="M-9 0 L -7 -22 L 0 -40 L 7 -20 L 9 0 Z" fill="${g}" stroke="${shade(col, -60)}" stroke-width="1" stroke-linejoin="round" opacity=".95"/><path d="M-2 -4 L -1 -20 L 0 -32 L 1.5 -18 L 2 -4 Z" fill="#fff" opacity=".6"/></g>`;
}
function flower(col) {
  return `<rect x="-1" y="-9" width="2" height="9" fill="#33691e"/><circle cx="-4" cy="-11" r="3" fill="${col}"/><circle cx="4" cy="-11" r="3" fill="${col}"/><circle cx="0" cy="-15" r="3" fill="${col}"/><circle cx="0" cy="-7" r="3" fill="${col}"/><circle cx="0" cy="-11" r="2" fill="#fff59d"/>`;
}
function bush(c, id, col = '#43a047') {
  const g = c.grad(`bs${id}`, [[0, mix(col, '#fff', 0.3)], [1, shade(col, -60)]], { radial: true, cx: 0.35, cy: 0.3 });
  return `<ellipse cx="0" cy="2" rx="14" ry="5" fill="#000" opacity=".2"/><circle cx="-8" cy="-7" r="8" fill="${g}"/><circle cx="7" cy="-8" r="9" fill="${g}"/><circle cx="0" cy="-13" r="8" fill="${g}"/>`;
}
function tuft(col = '#7cb342') {
  return `<path d="M0 0 c -2 -6 -4 -8 -6 -10 M0 0 c 0 -7 1 -10 2 -13 M0 0 c 2 -5 5 -8 8 -9" stroke="${col}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
}

// Raised platform with textured top and layered cliff sides.
function platform(c, size, theme) {
  const lift = 14;
  const a = 0.06, b = size - 0.06;
  const topG = c.grad('ptop', [[0, mix(theme.top, '#fff', 0.18)], [0.6, theme.top], [1, shade(theme.top, -25)]], { radial: true, cx: 0.4, cy: 0.35, r: 0.8 });
  const sideL = c.grad('psl', [[0, shade(theme.side, 10)], [1, shade(theme.side, -50)]]);
  const sideR = c.grad('psr', [[0, shade(theme.side, -10)], [1, shade(theme.side, -70)]]);
  const sh = c.blur('psh', 5);
  let s = `<polygon points="${c.pt(a, a, -4)} ${c.pt(b + 0.25, a, -4)} ${c.pt(b + 0.25, b + 0.25, -4)} ${c.pt(a, b + 0.25, -4)}" fill="#000" opacity=".35" filter="${sh}"/>`;
  // sides (left face along v=b, right face along u=b)
  s += `<polygon points="${c.pt(a, b, lift)} ${c.pt(b, b, lift)} ${c.pt(b, b, 0)} ${c.pt(a, b, 0)}" fill="${sideL}"/>`;
  s += `<polygon points="${c.pt(b, a, lift)} ${c.pt(b, b, lift)} ${c.pt(b, b, 0)} ${c.pt(b, a, 0)}" fill="${sideR}"/>`;
  // strata lines on the sides
  for (const z of [4, 9]) {
    s += `<path d="M${c.pt(a, b, z)} L ${c.pt(b, b, z)} L ${c.pt(b, a, z)}" fill="none" stroke="${shade(theme.side, -35)}" stroke-width="1.2" opacity=".55"/>`;
  }
  // top
  s += c.diamond(a, a, b, b, topG, '', lift);
  // rim highlight along the top back edges
  s += `<path d="M${c.pt(a, b, lift)} L ${c.pt(a, a, lift)} L ${c.pt(b, a, lift)}" fill="none" stroke="#fff" stroke-width="2" opacity=".22"/>`;
  s += `<path d="M${c.pt(a, b, lift)} L ${c.pt(b, b, lift)} L ${c.pt(b, a, lift)}" fill="none" stroke="${shade(theme.top, -60)}" stroke-width="1.5" opacity=".5"/>`;
  // texture speckles
  const speck = theme.speck || shade(theme.top, -30);
  let seed = size * 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < size * size * 5; i++) {
    const u = a + 0.2 + rnd() * (size - 0.5), v = a + 0.2 + rnd() * (size - 0.5);
    const [x, y] = c.iso(u, v, lift);
    s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(1.5 + rnd() * 2)}" ry="${f1(0.8 + rnd())}" fill="${speck}" opacity=".35"/>`;
  }
  return { svg: s, lift };
}

const THEMES = {
  fire: { top: '#4a2a22', side: '#3a1d16', speck: '#2a120c' },
  earth: { top: '#b0813f', side: '#7a5223', speck: '#8a6230' },
  water: { top: '#e2cf96', side: '#9a7d48', speck: '#c9b47a' },
  nature: { top: '#5cb85c', side: '#5d4037', speck: '#3f8f3f' },
  electric: { top: '#c4a544', side: '#7a6224', speck: '#8f7a2a' },
  ice: { top: '#eaf7ff', side: '#8fbfd9', speck: '#cfe8f5' },
  metal: { top: '#7e8a96', side: '#4f5964', speck: '#5f6a75' },
  dark: { top: '#4a3070', side: '#2a1a45', speck: '#35225a' },
  light: { top: '#f6f0dc', side: '#c9bd98', speck: '#e7ddc0' },
  legend: { top: '#d9a53a', side: '#8a5a12', speck: '#b8862a' },
  farm: { top: '#8d6e63', side: '#5d4037', speck: '#6d4c41' },
  grass: { top: '#6fbf5a', side: '#7a5a3a', speck: '#4f9f3f' },
  stone: { top: '#c9c2b0', side: '#8a8070', speck: '#a89f8c' },
};

function habitat(c, element, level) {
  const E = ELEMENTS[element];
  const { svg: base, lift } = platform(c, 3, THEMES[element]);
  let s = base;
  const L = lift;
  switch (element) {
    case 'fire': {
      const lavaG = c.grad('lava', [[0, '#fff176'], [0.35, '#ffab00'], [0.8, '#ff5722'], [1, '#bf360c']], { radial: true, cx: 0.45, cy: 0.4, r: 0.7 });
      const gl = c.glow('lg', 6);
      s += `<g filter="${gl}">${c.ell(1.45, 1.75, 0.78, lavaG, L)}</g>`;
      s += c.ell(1.35, 1.65, 0.3, '#fff59d', L, 'opacity=".55"');
      s += `<path d="M${c.pt(0.6, 2.2, L)} q 14 -6 26 2 M${c.pt(2.1, 0.6, L)} q -8 10 2 20" stroke="#ff7043" stroke-width="2" fill="none" opacity=".8"/>`;
      const volG = c.grad('vol', [[0, '#6d4c41'], [0.6, '#3e2723'], [1, '#1b0f0b']], { x2: 1, y2: 0.4 });
      s += c.at(2.25, 2.25, L, `<path d="M-32 0 C -22 -20 -12 -40 -6 -56 L 6 -56 C 12 -40 22 -20 32 0 Z" fill="${volG}"/><path d="M-6 -56 L 6 -56 L 4 -50 L -4 -50 Z" fill="#ff7043"/><path d="M-1 -52 c 4 8 3 16 6 24 M1 -52 c -5 10 -3 18 -8 26" stroke="#ff9100" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".9"/><path d="M0 -58 q 8 -18 2 -30 q 10 14 0 30 Z" fill="#ffd54f" opacity=".9"/><ellipse cx="0" cy="-62" rx="12" ry="8" fill="#ff9100" opacity=".25" filter="${gl}"/>`);
      s += c.at(0.55, 2.4, L, rock(c, 'f1', '#4e342e'), 0.9) + c.at(2.5, 0.55, L, rock(c, 'f2', '#3e2723'), 1.1);
      break;
    }
    case 'earth': {
      s += c.at(0.75, 0.75, L, rock(c, 'e1', '#8d6e63'), 1.5) + c.at(2.2, 1.0, L, rock(c, 'e2', '#a1887f'), 1.1) + c.at(1.25, 2.3, L, rock(c, 'e3', '#795548'), 1.3);
      s += c.ell(2.2, 2.2, 0.35, '#c6a15b', L, 'opacity=".7"') + c.ell(0.6, 1.8, 0.28, '#c6a15b', L, 'opacity=".7"');
      s += `<path d="M${c.pt(1.6, 1.4, L)} l 10 6 l -4 8 M${c.pt(0.5, 1.2, L)} l 8 -4 l 6 6" stroke="#6b4a1e" stroke-width="1.5" fill="none" opacity=".7"/>`;
      s += c.at(2.6, 2.45, L, flower('#ffca28')) + c.at(0.5, 2.7, L, tuft('#9e9d24'));
      break;
    }
    case 'water': {
      const wG = c.grad('wtr', [[0, '#81d4fa'], [0.5, '#29b6f6'], [1, '#0277bd']], { radial: true, cx: 0.4, cy: 0.35, r: 0.75 });
      s += c.ell(1.5, 1.5, 1.08, '#f2e6c4', L) + c.ell(1.5, 1.5, 1.0, wG, L);
      s += c.ell(1.3, 1.35, 0.5, '#ffffff', L, 'opacity=".22"');
      s += `<path d="M${c.pt(1.0, 1.9, L)} q 8 -3 16 0 M${c.pt(1.9, 1.0, L)} q 8 -3 16 0 M${c.pt(1.4, 1.5, L)} q 10 -4 20 0" stroke="#fff" stroke-width="1.4" fill="none" opacity=".6"/>`;
      s += c.ell(1.9, 1.9, 0.18, '#66bb6a', L) + c.ell(1.1, 1.0, 0.14, '#66bb6a', L) + c.at(1.9, 1.9, L + 4, `<circle r="4" fill="#f06292"/><circle r="1.5" fill="#fff59d"/>`);
      s += c.at(2.55, 0.5, L, rock(c, 'w1', '#90a4ae'), 0.8) + c.at(0.45, 2.55, L, `<path d="M0 0 L 0 -22 M5 2 L 7 -18 M-5 2 L -6 -16" stroke="#558b2f" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="0" cy="-24" rx="2.5" ry="5" fill="#795548"/>`);
      break;
    }
    case 'nature': {
      s += c.at(0.75, 0.85, L, tree(c, 'n1'), 1.15) + c.at(2.3, 0.7, L, tree(c, 'n2', '#66bb6a', '#2e7d32'), 0.95) + c.at(1.25, 2.3, L, tree(c, 'n3', '#8bc34a', '#558b2f'), 1.05);
      s += c.at(2.35, 2.4, L, bush(c, 'n4')) + c.at(2.6, 1.6, L, flower('#ffee58')) + c.at(0.5, 2.0, L, flower('#ab47bc')) + c.at(1.8, 1.4, L, flower('#ec407a')) + c.at(0.5, 2.6, L, tuft());
      break;
    }
    case 'electric': {
      const mG = c.grad('el', [[0, '#eceff1'], [0.5, '#90a4ae'], [1, '#455a64']], { x2: 1, y2: 0 });
      const gl = c.glow('eg', 4);
      s += c.ell(1.5, 1.5, 0.5, '#6d5a1c', L);
      s += c.at(1.5, 1.5, L, `<path d="M-8 0 L -5 -70 L 5 -70 L 8 0 Z" fill="${mG}"/><rect x="-12" y="-8" width="24" height="8" rx="2" fill="#546e7a"/><circle cx="0" cy="-78" r="15" fill="${mG}" stroke="#37474f" stroke-width="2"/><circle cx="-4" cy="-82" r="5" fill="#fff" opacity=".5"/><g filter="${gl}" stroke="#ffee58" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M-14 -70 l -10 -10 l 6 -2 l -8 -12"/><path d="M14 -74 l 12 -6 l -4 -6 l 10 -8"/><path d="M0 -94 l 3 -10 l -5 -2 l 4 -10"/></g>`);
      s += c.at(0.6, 2.35, L, crystal(c, 'ec1', '#ffe082'), 0.9) + c.at(2.4, 0.7, L, crystal(c, 'ec2', '#ffd740'), 0.8);
      s += `<path d="M${c.pt(0.4, 1.1, L)} l 6 -6 l -3 0 l 6 -8" stroke="#fff59d" stroke-width="1.5" fill="none" opacity=".8"/>`;
      break;
    }
    case 'ice': {
      const sG = c.grad('sn', [[0, '#ffffff'], [1, '#cfe8f5']], { radial: true });
      s += c.ell(1.0, 2.1, 0.5, sG, L) + c.ell(2.0, 0.9, 0.4, sG, L);
      const pG = c.grad('ip', [[0, '#b3e5fc'], [1, '#4fc3f7']], { radial: true });
      s += c.ell(2.2, 2.2, 0.42, pG, L, 'opacity=".9"') + `<path d="M${c.pt(2.0, 2.2, L)} l 10 -4 l 8 4" stroke="#fff" stroke-width="1.5" fill="none" opacity=".7"/>`;
      s += c.at(1.5, 1.4, L, crystal(c, 'i1', '#81d4fa'), 1.5) + c.at(0.7, 1.0, L, crystal(c, 'i2', '#4fc3f7'), 1.0) + c.at(2.4, 1.0, L, crystal(c, 'i3', '#b3e5fc'), 1.1);
      s += c.at(0.5, 2.5, L, `<circle cx="0" cy="-6" r="6" fill="#fff"/><circle cx="0" cy="-16" r="4.5" fill="#fff"/><circle cx="-1.5" cy="-17" r=".8" fill="#000"/><circle cx="1.5" cy="-17" r=".8" fill="#000"/><path d="M0 -15 l 3 1 l -3 1" fill="#ff7043"/>`);
      break;
    }
    case 'metal': {
      const plate = c.grad('mp', [[0, '#cfd8dc'], [0.5, '#90a4ae'], [1, '#546e7a']], { x2: 1, y2: 1 });
      s += c.box(0.4, 0.4, 2.2, 2.2, 8, plate, '#546e7a', '#78909c') ;
      for (const [u, v] of [[0.6, 0.6], [2.4, 0.6], [0.6, 2.4], [2.4, 2.4]]) s += c.at(u, v, L + 8, `<circle r="2.5" fill="#37474f"/><circle r="1" fill="#b0bec5"/>`);
      const gearG = c.grad('gr', [[0, '#eceff1'], [0.5, '#90a4ae'], [1, '#455a64']], { x2: 1, y2: 1 });
      s += c.at(1.5, 1.5, L + 8, `${gear(0, -22, 24, gearG, '#37474f')}${gear(34, -10, 15, gearG, '#37474f')}${gear(-32, -8, 13, gearG, '#37474f')}`);
      s += c.at(2.6, 2.3, L, `<rect x="-5" y="-30" width="10" height="30" rx="2" fill="#78909c"/><circle cx="0" cy="-34" r="7" fill="#b0bec5" stroke="#455a64" stroke-width="1.5"/><path d="M-3 -34 h6" stroke="#455a64" stroke-width="1.5"/>`);
      break;
    }
    case 'dark': {
      s += c.ell(1.5, 1.6, 0.65, '#2a1a45', L, 'opacity=".8"');
      const fog = c.blur('fog', 5);
      s += c.ell(1.2, 1.9, 0.7, '#7e57c2', L, `opacity=".3" filter="${fog}"`);
      s += c.at(1.5, 1.5, L, crystal(c, 'd1', '#7e57c2'), 1.6) + c.at(0.6, 2.2, L, crystal(c, 'd2', '#9575cd'), 1.0) + c.at(2.4, 0.6, L, crystal(c, 'd3', '#5e35b1'), 1.1);
      s += c.at(0.8, 0.8, L, `<path d="M0 0 L 0 -34 M0 -20 L -14 -34 M0 -26 L 12 -40 M-14 -34 L -19 -46 M12 -40 L 16 -50" stroke="#1a0f2e" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M0 0 L 0 -34 M0 -20 L -14 -34" stroke="#3d2a5c" stroke-width="1.5" fill="none"/>`);
      s += c.at(2.5, 2.4, L, `<ellipse rx="10" ry="4" fill="#3d2a5c"/><path d="M-4 -2 l 0 -10 l 8 0 l 0 10" fill="#5d4a7c"/><circle cx="0" cy="-8" r="1.5" fill="#ff5252"/>`);
      break;
    }
    case 'light': {
      const pil = c.grad('pil', [[0, '#fffdf5'], [0.5, '#f1e9cf'], [1, '#bfb48f']], { x2: 1, y2: 0 });
      for (const [u, v] of [[0.35, 0.35], [2.35, 0.35], [0.35, 2.35], [2.35, 2.35]]) s += c.box(u, v, 0.3, 0.3, 46, '#fffdf5', shade('#e6dfc0', -20), pil) + `<polygon points="${c.pt(u - 0.05, v - 0.05, 46 + L)} ${c.pt(u + 0.35, v - 0.05, 46 + L)} ${c.pt(u + 0.35, v + 0.35, 46 + L)} ${c.pt(u - 0.05, v + 0.35, 46 + L)}" fill="#f6efd6" stroke="#c9bd98" stroke-width="1"/>`;
      const gl = c.glow('lgl', 8);
      s += c.at(1.5, 1.5, L, `<rect x="-7" y="-22" width="14" height="22" rx="2" fill="${pil}"/><g filter="${gl}"><circle cx="0" cy="-40" r="17" fill="#fff59d" stroke="#fbc02d" stroke-width="3"/></g><circle cx="-5" cy="-45" r="5" fill="#fff" opacity=".8"/><path d="M0 -70 l 3 8 l 8 3 l -8 3 l -3 8 l -3 -8 l -8 -3 l 8 -3 Z" fill="#fff" opacity=".85"/>`);
      s += c.at(1.5, 2.6, L, `<path d="M-30 0 L 30 0" stroke="#ffe082" stroke-width="2" opacity=".6"/>`);
      break;
    }
    case 'legend': {
      const gold = c.grad('gld', [[0, '#fff3c4'], [0.5, '#f6c453'], [1, '#a8701a']], { x2: 1, y2: 1 });
      s += c.box(0.3, 0.3, 2.4, 2.4, 6, gold, '#8a5a12', '#c98a24');
      const gl = c.glow('lg2', 10);
      s += `<g filter="${gl}">${c.at(1.5, 1.5, L + 6, crystal(c, 'l1', '#ffb300'), 2.1)}</g>` + c.at(0.6, 2.3, L + 6, crystal(c, 'l2', '#ffca28'), 1.0) + c.at(2.4, 0.6, L + 6, crystal(c, 'l3', '#ffca28'), 1.0);
      for (const [u, v] of [[0.5, 0.5], [2.5, 0.5], [0.5, 2.5], [2.5, 2.5]]) s += c.at(u, v, L + 6, `<circle r="4" fill="#fff8e1" stroke="#a8701a" stroke-width="1"/>`);
      s += c.at(1.5, 1.5, L + 30, `<path d="M-60 -30 L 0 -60 L 60 -30" fill="none" stroke="#fff3c4" stroke-width="1.5" opacity=".5"/>`);
      break;
    }
  }
  // level banners
  const flag = (u, v) => c.at(u, v, L, `<rect x="-2.5" y="-34" width="5" height="34" fill="#5d4037"/><path d="M2.5 -34 L 26 -27 L 2.5 -20 Z" fill="${E.color}" stroke="${E.dark}" stroke-width="1.2"/><path d="M4 -32 L 18 -27" stroke="#fff" stroke-width="1" opacity=".5"/>`);
  if (level >= 2) s += flag(0.3, 2.75);
  if (level >= 3) s += flag(2.75, 0.3);
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
  return `<polygon points="${pts.join(' ')}" fill="${col}" stroke="${dark}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="${r * 0.3}" fill="${dark}"/><circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="none" stroke="${dark}" stroke-width="1" opacity=".5"/>`;
}

function farm(c, level, state) {
  const { svg: base, lift: L } = platform(c, 2, THEMES.farm);
  let s = base;
  const rowG = c.grad('row', [[0, '#5d4037'], [1, '#3e2723']]);
  for (let i = 0; i < 4; i++) s += `<polygon points="${c.pt(0.2 + i * 0.45, 0.2, L)} ${c.pt(0.42 + i * 0.45, 0.2, L)} ${c.pt(0.42 + i * 0.45, 1.8, L)} ${c.pt(0.2 + i * 0.45, 1.8, L)}" fill="${rowG}"/>`;
  if (state === 'growing' || state === 'ready') {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const [x, y] = c.iso(0.31 + i * 0.45, 0.4 + j * 0.55, L);
        if (state === 'growing') s += `<path d="M${f1(x)} ${f1(y)} c -3 -5 -5 -7 -6 -10 M${f1(x)} ${f1(y)} c 3 -5 5 -7 6 -10 M${f1(x)} ${f1(y)} c 0 -6 0 -9 1 -13" stroke="#7cb342" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
        else s += `<g transform="translate(${f1(x)} ${f1(y)})"><path d="M0 0 c -4 -8 -7 -12 -8 -16 M0 0 c 4 -8 7 -12 8 -16 M0 0 c 0 -10 0 -14 0 -20" stroke="#558b2f" stroke-width="2.6" stroke-linecap="round" fill="none"/><circle cx="-6" cy="-14" r="4.5" fill="#ff7043"/><circle cx="-7" cy="-15" r="1.5" fill="#fff" opacity=".6"/><circle cx="6" cy="-16" r="4.5" fill="#ffca28"/><circle cx="5" cy="-17" r="1.5" fill="#fff" opacity=".6"/><circle cx="0" cy="-21" r="4.5" fill="#ef5350"/><circle cx="-1" cy="-22" r="1.5" fill="#fff" opacity=".6"/></g>`;
      }
    }
  }
  const barnG = c.grad('barn', [[0, '#e53935'], [1, '#8e1c1c']], { x2: 1, y2: 1 });
  s += c.box(1.5, -0.05, 0.5, 0.45, 28, '#ef5350', '#8e1c1c', barnG);
  s += `<polygon points="${c.pt(1.5, -0.05, 28 + L)} ${c.pt(1.75, -0.28, 44 + L)} ${c.pt(2.0, -0.05, 28 + L)}" fill="#b71c1c"/><polygon points="${c.pt(1.5, 0.4, 28 + L)} ${c.pt(1.75, 0.17, 44 + L)} ${c.pt(2.0, 0.4, 28 + L)}" fill="#c62828"/>`;
  s += c.at(1.72, 0.42, L + 4, `<rect x="-5" y="-12" width="10" height="12" fill="#3e2723"/><path d="M-5 -12 L 5 0 M5 -12 L -5 0" stroke="#8d6e63" stroke-width="1"/>`);
  if (level >= 2) s += `<polygon points="${c.pt(-0.05, 0.1, L)} ${c.pt(-0.05, 0.1, 14 + L)} ${c.pt(-0.05, 1.9, 14 + L)} ${c.pt(-0.05, 1.9, L)}" fill="#a1887f" opacity=".95"/><path d="M${c.pt(-0.05, 0.1, 7 + L)} L ${c.pt(-0.05, 1.9, 7 + L)}" stroke="#6d4c41" stroke-width="2"/>`;
  if (level >= 3) s += c.at(0.05, 1.95, L, `<rect x="-3" y="-44" width="6" height="44" fill="#795548"/><path d="M0 -44 l -16 -10 l 6 12 l -12 6 l 14 0 l -4 14 l 12 -8 l 12 8 l -4 -14 l 14 0 l -12 -6 l 6 -12 Z" fill="#ffe082" stroke="#795548" stroke-width="1.5"/>`);
  if (level >= 4) s += c.at(1.9, 1.9, L, tree(c, 'gf', '#ffd54f', '#f9a825'), 0.9);
  return s;
}

function breeding(c, active) {
  const { svg: base, lift: L } = platform(c, 3, THEMES.grass);
  let s = base;
  const mtn = c.grad('mtn', [[0, '#a1887f'], [0.5, '#7d6b5d'], [1, '#4e3c30']], { x2: 1, y2: 1 });
  const gl = c.glow('hg', 4);
  s += c.at(1.5, 1.5, L, `
<path d="M-72 8 L -34 -70 L -12 -48 L 8 -84 L 32 -46 L 72 8 Z" fill="${mtn}" stroke="#3e2f26" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M-34 -70 L -22 -58 L -12 -48 L 0 -66 L 8 -84 L 18 -66 L 32 -46 L 22 -50 L 10 -40 L -6 -44 L -22 -46 Z" fill="#fafafa"/>
<path d="M-30 -66 L -22 -58 M4 -72 L 10 -62" stroke="#e0e0e0" stroke-width="1.5"/>
<path d="M-42 8 L -10 -34 L 22 8 Z" fill="#2b1d16" opacity=".7"/><path d="M-30 8 L -10 -22 L 10 8 Z" fill="#150c08" opacity=".8"/>
<g filter="${gl}" transform="translate(0 -18)"><path d="M0 8 C -22 -10 -14 -30 0 -18 C 14 -30 22 -10 0 8 Z" fill="${active ? '#ff4081' : '#c2708a'}" stroke="#7b1f43" stroke-width="1.5"/><path d="M-9 -16 q 4 -4 8 -2" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/></g>`);
  s += c.at(0.6, 2.4, L, `<ellipse rx="16" ry="8" fill="#8d6e63"/><ellipse rx="12" ry="5" fill="#a1887f"/>`) + c.at(2.4, 0.6, L, `<ellipse rx="16" ry="8" fill="#8d6e63"/><ellipse rx="12" ry="5" fill="#a1887f"/>`);
  s += c.at(2.6, 2.6, L, tree(c, 'bt'), 0.8) + c.at(0.4, 1.2, L, flower('#f06292')) + c.at(1.2, 0.4, L, flower('#ec407a')) + c.at(2.3, 2.1, L, bush(c, 'bb'));
  if (active) s += c.at(1.5, 1.5, L + 92, `<path d="M0 6 C -10 -4 -6 -14 0 -8 C 6 -14 10 -4 0 6 Z" fill="#ff80ab"/><path d="M-22 16 C -28 10 -25 4 -22 8 C -19 4 -16 10 -22 16 Z" fill="#ff80ab" opacity=".8"/><path d="M22 -6 C 16 -12 19 -18 22 -14 C 25 -18 28 -12 22 -6 Z" fill="#ff80ab" opacity=".8"/>`);
  return s;
}

function hatchery(c, eggColors, level) {
  const { svg: base, lift: L } = platform(c, 2, { top: '#c9a56b', side: '#8a6a3b', speck: '#a8884a' });
  let s = base;
  const nestG = c.grad('nest', [[0, '#a1887f'], [1, '#5d4037']], { radial: true, cx: 0.4, cy: 0.3 });
  s += c.at(1, 1, L, `<ellipse cx="0" cy="-2" rx="50" ry="27" fill="#5d4037"/><ellipse cx="0" cy="-6" rx="44" ry="22" fill="${nestG}"/><ellipse cx="0" cy="-8" rx="34" ry="16" fill="#8d6e63"/>`);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const [x, y] = c.iso(1, 1, L);
    s += `<path d="M${f1(x + Math.cos(a) * 30)} ${f1(y - 6 + Math.sin(a) * 15)} l ${f1(Math.cos(a + 0.4) * 18)} ${f1(Math.sin(a + 0.4) * 9)}" stroke="#d7b98a" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>`;
  }
  const slots = [[-18, -14], [16, -12], [-2, -30], [0, 2]];
  eggColors.slice(0, 4).forEach((col, i) => {
    const [dx, dy] = slots[i];
    const eg = c.grad(`egg${i}`, [[0, mix(col.light, '#fff', 0.3)], [0.5, col.color], [1, col.dark]], { radial: true, cx: 0.35, cy: 0.3 });
    s += c.at(1, 1, L, `<g transform="translate(${dx} ${dy - 12})"><path d="M0 -26 C -11 -26 -15 -12 -15 -4 C -15 6 -8 12 0 12 C 8 12 15 6 15 -4 C 15 -12 11 -26 0 -26 Z" fill="${eg}" stroke="${col.dark}" stroke-width="1.2"/><circle cx="-4" cy="-8" r="3" fill="${col.dark}" opacity=".5"/><circle cx="5" cy="0" r="2.5" fill="${col.dark}" opacity=".5"/><path d="M-8 -16 q 2 -6 6 -8" stroke="#fff" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/></g>`);
  });
  const lamp = (dx) => c.at(1, 1, L, `<g transform="translate(${dx} -8)"><rect x="-4" y="-44" width="8" height="44" rx="2" fill="#6d4c41"/><circle cx="0" cy="-50" r="10" fill="#ff8a65" stroke="#bf360c" stroke-width="2"/><path d="M-3 -50 q 3 -12 6 0" fill="#ffd54f"/><circle cx="0" cy="-50" r="16" fill="#ff9800" opacity=".18"/></g>`);
  s += lamp(46);
  if (level >= 2) s += lamp(-46);
  return s;
}

function mine(c, level) {
  const { svg: base, lift: L } = platform(c, 2, { top: '#7d6b5d', side: '#4e3c30', speck: '#5f4d40' });
  let s = base;
  const mtn = c.grad('mmt', [[0, '#8a7869'], [0.5, '#6d5c50'], [1, '#3e2f26']], { x2: 1, y2: 1 });
  s += c.at(1, 1, L, `<path d="M-58 4 L -30 -52 L 0 -64 L 32 -50 L 58 4 Z" fill="${mtn}" stroke="#3e2f26" stroke-width="1.5" stroke-linejoin="round"/><path d="M-30 -52 L 0 -64 L 32 -50 L 10 -40 L -12 -38 Z" fill="#9a8878"/>
    <path d="M-22 4 L -22 -22 A 22 22 0 0 1 22 -22 L 22 4 Z" fill="#150e0a"/><path d="M-26 4 L -26 -22 A 26 26 0 0 1 26 -22 L 26 4 M-26 -6 L 26 -6" fill="none" stroke="#a1774a" stroke-width="5"/><path d="M-10 -30 l 20 0" stroke="#5d4037" stroke-width="3"/>`);
  s += c.at(0.35, 1.7, L, crystal(c, 'mc1', '#b388ff'), 0.9) + c.at(1.75, 0.5, L, crystal(c, 'mc2', '#f48fb1'), 0.8);
  if (level >= 2) s += c.at(0.4, 0.4, L, crystal(c, 'mc3', '#80d8ff'), 1.1);
  if (level >= 3) s += c.at(1.7, 1.7, L, crystal(c, 'mc4', '#ffd740'), 1.2);
  s += c.at(1.65, 1.35, L, `<path d="M-14 -4 L -10 -16 L 12 -16 L 14 -4 Z" fill="#5d4037" stroke="#3e2723" stroke-width="1.5"/><circle cx="-8" cy="-2" r="3.5" fill="#263238"/><circle cx="8" cy="-2" r="3.5" fill="#263238"/><circle cx="-4" cy="-18" r="4" fill="#b388ff"/><circle cx="4" cy="-19" r="3.5" fill="#f48fb1"/><path d="M-14 -4 L 14 -4" stroke="#8d6e63" stroke-width="1"/>`);
  return s;
}

function temple(c, tier) {
  const cols = ['#ffe082', '#80deea', '#ce93d8', '#ffab91', '#f48fb1'][tier - 1];
  const { svg: base, lift: L } = platform(c, 2, THEMES.stone);
  let s = base;
  const pil = c.grad('tp', [[0, '#fffdf5'], [0.5, '#f1e9cf'], [1, '#bfb48f']], { x2: 1, y2: 0 });
  s += c.box(0.25, 0.25, 1.5, 1.5, 6, '#f5f0e1', '#c9c0a4', '#e0d8c0');
  for (const [u, v] of [[0.35, 0.35], [1.5, 0.35], [0.35, 1.5], [1.5, 1.5]]) s += c.box(u, v, 0.18, 0.18, 48, '#fffbf0', '#cfc6ae', pil);
  s += `<polygon points="${c.pt(0.2, 0.2, 50 + L)} ${c.pt(1.8, 0.2, 50 + L)} ${c.pt(1.8, 1.8, 50 + L)} ${c.pt(0.2, 1.8, 50 + L)}" fill="#d7ccc8"/>`;
  const roofG = c.grad('roof', [[0, mix(cols, '#fff', 0.3)], [1, shade(cols, -40)]], { x2: 1, y2: 1 });
  s += `<polygon points="${c.pt(0.2, 0.2, 50 + L)} ${c.pt(1.8, 0.2, 50 + L)} ${c.pt(1, 1, 90 + L)}" fill="${shade(cols, -30)}"/><polygon points="${c.pt(1.8, 0.2, 50 + L)} ${c.pt(1.8, 1.8, 50 + L)} ${c.pt(1, 1, 90 + L)}" fill="${roofG}"/><polygon points="${c.pt(0.2, 1.8, 50 + L)} ${c.pt(1.8, 1.8, 50 + L)} ${c.pt(1, 1, 90 + L)}" fill="${shade(cols, -15)}"/><polygon points="${c.pt(0.2, 0.2, 50 + L)} ${c.pt(0.2, 1.8, 50 + L)} ${c.pt(1, 1, 90 + L)}" fill="${shade(cols, -50)}"/>`;
  s += `<path d="M${c.pt(1.8, 0.2, 50 + L)} L ${c.pt(1, 1, 90 + L)} L ${c.pt(1.8, 1.8, 50 + L)}" fill="none" stroke="#fff" stroke-width="1.5" opacity=".35"/>`;
  const gl = c.glow('tg', 4);
  s += c.at(1, 1, 94 + L, `<g filter="${gl}"><circle r="7" fill="#fff59d" stroke="#f9a825" stroke-width="2"/></g>`);
  return s;
}

function deco(c, id) {
  switch (id) {
    case 'deco_tree':
      return c.at(0.5, 0.5, 0, tree(c, 'dt'), 1.2);
    case 'deco_flowers': {
      const g = c.grad('fb', [[0, '#8bc34a'], [1, '#33691e']], { radial: true });
      return c.ell(0.5, 0.5, 0.42, g) + c.at(0.35, 0.35, 0, flower('#ec407a')) + c.at(0.7, 0.4, 0, flower('#ffee58')) + c.at(0.45, 0.72, 0, flower('#42a5f5')) + c.at(0.75, 0.75, 0, flower('#ff7043')) + c.at(0.55, 0.55, 0, tuft());
    }
    case 'deco_lantern': {
      const gl = c.glow('lan', 6);
      const st = c.grad('lst', [[0, '#e0e0e0'], [1, '#757575']], { x2: 1, y2: 0 });
      return c.at(0.5, 0.5, 0, `<ellipse cx="0" cy="2" rx="14" ry="6" fill="#000" opacity=".25"/><rect x="-10" y="-8" width="20" height="8" rx="1" fill="${st}"/><rect x="-5" y="-34" width="10" height="26" fill="${st}"/><rect x="-12" y="-48" width="24" height="14" rx="2" fill="#616161"/><g filter="${gl}"><rect x="-8" y="-46" width="16" height="10" fill="#fff59d"/></g><path d="M-14 -48 L 0 -58 L 14 -48 Z" fill="#424242"/>`);
    }
    case 'deco_fountain': {
      const wG = c.grad('fw', [[0, '#81d4fa'], [1, '#0288d1']], { radial: true });
      const st = c.grad('fst', [[0, '#eceff1'], [1, '#78909c']], { x2: 1, y2: 0 });
      return c.ell(1, 1, 0.98, '#78909c') + c.ell(1, 1, 0.9, st, 2) + c.ell(1, 1, 0.8, wG, 3) + c.at(1, 1, 0, `<rect x="-6" y="-30" width="12" height="30" fill="${st}"/><ellipse cx="0" cy="-30" rx="26" ry="10" fill="#90a4ae"/><ellipse cx="0" cy="-32" rx="20" ry="7" fill="${wG}"/><rect x="-4" y="-50" width="8" height="20" fill="${st}"/><path d="M0 -50 q -18 -10 -26 8 M0 -50 q 18 -10 26 8 M0 -50 q 0 -14 0 -6" stroke="#b3e5fc" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M-3 -56 q 3 -8 6 0" stroke="#e1f5fe" stroke-width="2" fill="none"/>`);
    }
    case 'deco_statue': {
      const inner = dragonSVG('legend', 'adult', { size: 240 }).replace(/<svg[^>]*>/, '').replace('</svg>', '');
      const st = c.grad('sst', [[0, '#eceff1'], [1, '#78909c']], { x2: 1, y2: 1 });
      return c.box(0.3, 0.3, 1.4, 1.4, 14, st, '#78909c', '#90a4ae') + `<g transform="translate(${f1(c.iso(1, 1)[0] - 52)} ${f1(c.iso(1, 1)[1] - 118)}) scale(0.44)">${inner}</g>`;
    }
    case 'deco_crystal':
      return c.at(0.5, 0.5, 0, crystal(c, 'dc', '#b388ff'), 1.4);
    case 'deco_bonfire': {
      const gl = c.glow('bf', 5);
      const fG = c.grad('bfg', [[0, '#ff3d00'], [0.5, '#ff9100'], [1, '#ffee58']], { y1: 1, y2: 0 });
      return c.ell(0.5, 0.5, 0.42, '#5d4037') + c.at(0.5, 0.5, 0, `<path d="M-16 0 L 16 -8 M-16 -8 L 16 0" stroke="#4e342e" stroke-width="6" stroke-linecap="round"/><g filter="${gl}"><path d="M0 -44 C 12 -30 14 -18 8 -8 C 4 -14 2 -18 0 -22 C -2 -16 -8 -12 -8 -6 C -16 -18 -10 -30 0 -44 Z" fill="${fG}"/></g><path d="M0 -30 C 6 -22 6 -14 2 -8 C 0 -12 -2 -16 -3 -18 C -5 -14 -6 -12 -5 -8 C -9 -16 -6 -24 0 -30 Z" fill="#fff59d" opacity=".8"/>`);
    }
    case 'deco_pond': {
      const wG = c.grad('pw', [[0, '#81d4fa'], [0.6, '#29b6f6'], [1, '#0277bd']], { radial: true });
      return c.ell(1, 1, 0.98, '#c9b46a') + c.ell(1, 1, 0.88, wG) + c.ell(0.85, 0.9, 0.4, '#fff', 0, 'opacity=".2"') + c.ell(1.25, 1.2, 0.16, '#66bb6a') + c.ell(0.75, 1.3, 0.14, '#66bb6a') + c.at(1.25, 1.2, 4, `<circle r="4" fill="#f06292"/><circle r="1.5" fill="#fff59d"/>`) + c.at(1.8, 0.4, 0, `<path d="M0 0 L 0 -26 M6 2 L 8 -22 M-6 2 L -7 -20" stroke="#7cb342" stroke-width="3" stroke-linecap="round"/><ellipse cx="0" cy="-28" rx="3" ry="6" fill="#795548"/><ellipse cx="8" cy="-24" rx="2.5" ry="5" fill="#795548"/>`);
    }
    case 'deco_windmill': {
      const wall = c.grad('wm', [[0, '#f5f0e6'], [1, '#bcaaa4']], { x2: 1, y2: 0 });
      return c.box(0.55, 0.55, 0.9, 0.9, 42, '#efebe9', '#a1887f', wall) + c.at(1, 1, 42, `<path d="M-30 -14 L 0 -14 L 30 -14 L 0 -32 Z" fill="#8d6e63"/><path d="M-30 -14 L 0 -32 L 30 -14" fill="none" stroke="#5d4037" stroke-width="1.5"/><circle cx="0" cy="-22" r="5" fill="#4e342e"/><g stroke="#5d4037" stroke-width="2.5" fill="#fff8e1"><path d="M0 -22 L 34 -50 L 40 -44 L 4 -18 Z"/><path d="M0 -22 L 34 6 L 28 12 L -4 -18 Z"/><path d="M0 -22 L -34 6 L -40 0 L -4 -26 Z"/><path d="M0 -22 L -34 -50 L -28 -56 L 4 -26 Z"/></g><path d="M8 -30 L 30 -46 M8 -14 L 30 4 M-8 -14 L -30 4 M-8 -30 L -30 -46" stroke="#d7ccc8" stroke-width="1"/>`);
    }
    case 'deco_arch': {
      const bands = ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0'];
      const gl = c.glow('ra', 2);
      return c.ell(0.5, 1.5, 0.28, '#fff', 0, 'opacity=".9"') + c.ell(1.5, 0.5, 0.28, '#fff', 0, 'opacity=".9"') + c.at(1, 1, 6, `<g filter="${gl}" opacity=".9">${bands.map((col, i) => `<path d="M${-50 + i * 6} 0 A ${50 - i * 6} ${50 - i * 6} 0 0 1 ${50 - i * 6} 0" fill="none" stroke="${col}" stroke-width="6"/>`).join('')}</g>`);
    }
    case 'deco_totem': {
      const wood = c.grad('tw', [[0, '#a1887f'], [0.5, '#8d6e63'], [1, '#4e342e']], { x2: 1, y2: 0 });
      return c.at(0.5, 0.5, 0, `<ellipse cx="0" cy="2" rx="16" ry="6" fill="#000" opacity=".25"/><rect x="-12" y="-70" width="24" height="70" rx="4" fill="${wood}" stroke="#3e2723" stroke-width="1.5"/><rect x="-12" y="-48" width="24" height="4" fill="#3e2723"/><rect x="-12" y="-26" width="24" height="4" fill="#3e2723"/><circle cx="-5" cy="-60" r="3" fill="#ffd54f"/><circle cx="5" cy="-60" r="3" fill="#ffd54f"/><path d="M-6 -52 q 6 4 12 0" stroke="#ffd54f" stroke-width="2" fill="none"/><circle cx="-5" cy="-38" r="3" fill="#80deea"/><circle cx="5" cy="-38" r="3" fill="#80deea"/><path d="M-6 -30 q 6 -4 12 0" stroke="#80deea" stroke-width="2" fill="none"/><circle cx="-5" cy="-16" r="3" fill="#f48fb1"/><circle cx="5" cy="-16" r="3" fill="#f48fb1"/><path d="M-16 -74 L 0 -84 L 16 -74 Z" fill="#ff7043" stroke="#4e342e" stroke-width="1.5"/>`);
    }
    case 'deco_obelisk': {
      const st = c.grad('ob', [[0, '#546e7a'], [0.5, '#37474f'], [1, '#102027']], { x2: 1, y2: 0 });
      const gl = c.glow('og', 4);
      return c.at(0.5, 0.5, 0, `<ellipse cx="0" cy="2" rx="16" ry="6" fill="#000" opacity=".3"/><path d="M-12 0 L -8 -84 L 0 -96 L 8 -84 L 12 0 Z" fill="${st}" stroke="#102027" stroke-width="1.5"/><g filter="${gl}"><path d="M-2 -70 h4 M-3 -60 h6 M-2 -50 h4 M-3 -40 h6 M-2 -30 h4 M-3 -20 h6" stroke="#80deea" stroke-width="3" stroke-linecap="round"/><path d="M0 -96 L 0 -112" stroke="#80deea" stroke-width="3" stroke-linecap="round" opacity=".8"/></g>`);
    }
  }
  return '';
}

// b: building state object (level...). extra: { farmState, eggs:[species], breedingActive }
export function buildingSVG(b, extra = {}) {
  const def = BUILDINGS[b.def];
  const c = ctx(def.size, `b${b.def.replace(/[^a-z0-9]/gi, '')}${b.level || 1}`);
  let inner = '';
  if (def.type === 'habitat') inner = habitat(c, def.element, b.level);
  else if (def.type === 'farm') inner = farm(c, b.level, extra.farmState || 'empty');
  else if (def.type === 'breeding') inner = breeding(c, !!extra.breedingActive);
  else if (def.type === 'hatchery') inner = hatchery(c, (extra.eggs || []).map((sp) => ELEMENTS[sp.elements[0]]), b.level);
  else if (def.type === 'temple') inner = temple(c, +def.id.split('_')[1]);
  else if (def.type === 'mine') inner = mine(c, b.level);
  else if (def.type === 'deco') inner = deco(c, def.id);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${c.w}" height="${c.h}" viewBox="0 0 ${c.w} ${c.h}"><defs>${c.defs.join('')}</defs>${inner}</svg>`;
}

export function buildingKey(b, extra = {}) {
  return [b.def, b.level, extra.farmState || '', (extra.eggs || []).map((s) => s.id).join('.'), extra.breedingActive ? 1 : 0].join('|');
}

export function lockSVG(size = 48) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" fill="#ffd54f" stroke="#7a5a00" stroke-width="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#7a5a00" stroke-width="2.2"/><circle cx="12" cy="15.5" r="1.8" fill="#7a5a00"/></svg>`;
}
