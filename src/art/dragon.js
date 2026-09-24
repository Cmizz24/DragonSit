// Procedural SVG dragons, v2: shaded, textured, anatomically dragon-like. No image files.
// Every species is drawn from its elements, rarity and a few "look" variants.
import { ELEMENTS } from '../data/elements.js';
import { DRAGONS, RARITY } from '../data/dragons.js';

// ---------- colour helpers ----------
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}
export function shade(hex, amt) {
  return rgbToHex(hexToRgb(hex).map((v) => v + amt));
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}
const f1 = (n) => (Math.round(n * 10) / 10).toString();

// ---------- geometry helpers ----------
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}
function bezTangent(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]),
  ];
}
// A filled "tube" around a cubic spine with a width function. Returns a closed path.
function tube(p0, p1, p2, p3, widthFn, samples = 14, capStart = true, capEnd = true) {
  const left = [], right = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const [x, y] = bez(p0, p1, p2, p3, t);
    const [tx, ty] = bezTangent(p0, p1, p2, p3, t);
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len, ny = tx / len;
    const w = widthFn(t) / 2;
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
  }
  let d = `M${f1(left[0][0])} ${f1(left[0][1])}`;
  for (let i = 1; i < left.length; i++) d += ` L${f1(left[i][0])} ${f1(left[i][1])}`;
  const end = bez(p0, p1, p2, p3, 1);
  if (capEnd) d += ` A${f1(widthFn(1) / 2)} ${f1(widthFn(1) / 2)} 0 0 1 ${f1(right[right.length - 1][0])} ${f1(right[right.length - 1][1])}`;
  else d += ` L${f1(right[right.length - 1][0])} ${f1(right[right.length - 1][1])}`;
  for (let i = right.length - 2; i >= 0; i--) d += ` L${f1(right[i][0])} ${f1(right[i][1])}`;
  if (capStart) d += ` A${f1(widthFn(0) / 2)} ${f1(widthFn(0) / 2)} 0 0 1 ${f1(left[0][0])} ${f1(left[0][1])}`;
  return d + ' Z';
}
function pt(p) {
  return `${f1(p[0])} ${f1(p[1])}`;
}
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}
function scale(a, s) {
  return [a[0] * s, a[1] * s];
}
function lerpPt(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// ---------- palette ----------
function palette(sp) {
  const E1 = ELEMENTS[sp.elements[0]];
  const E2 = sp.elements[1] ? ELEMENTS[sp.elements[1]] : null;
  const E3 = sp.elements[2] ? ELEMENTS[sp.elements[2]] : null;
  const E4 = sp.elements[3] ? ELEMENTS[sp.elements[3]] : null;
  const base = E1.color;
  const wingBase = E2 ? E2.color : mix(E1.color, E1.dark, 0.35);
  return {
    E1, E2, E3, E4,
    base, light: mix(E1.light, base, 0.25), dark: E1.dark, deep: shade(E1.dark, -35),
    belly: mix(E1.light, '#fff4dc', 0.45), bellyDark: mix(E1.light, E1.dark, 0.35),
    wing: wingBase, wingLight: mix(wingBase, '#ffffff', 0.35), wingDark: E2 ? E2.dark : E1.dark,
    horn: E2 ? mix(E2.light, E2.color, 0.4) : '#efe3c2', hornDark: E2 ? E2.dark : '#a68d5b',
    eye: E1.eye, mark: E3 ? E3.color : null, mark2: E4 ? E4.color : null,
    accent: E2 ? E2.color : E1.light,
  };
}

// ---------- element extras ----------
function crestFor(el, P, c, s, uid) {
  // Head crest drawn behind the skull; `c` is the crest anchor (back of skull top), pointing up-right.
  const [x, y] = c;
  const g = (inner) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">${inner}</g>`;
  switch (el) {
    case 'fire':
      return g(`<path d="M-2 4 C -14 -10 -10 -30 2 -44 C 0 -30 8 -26 6 -14 C 14 -22 16 -34 12 -46 C 26 -30 24 -8 10 4 Z" fill="url(#${uid}flame)"/><path d="M12 6 C 4 -6 8 -20 18 -30 C 16 -18 24 -14 22 -4 C 30 -12 32 -20 30 -30 C 40 -16 34 2 22 8 Z" fill="url(#${uid}flame)" opacity=".9"/>`);
    case 'water':
      return g(`<path d="M-4 6 C -6 -18 8 -40 30 -44 C 22 -30 24 -14 34 -2 C 20 -4 8 4 -4 6 Z" fill="url(#${uid}fin)" stroke="${P.wingDark}" stroke-width="1.2"/><path d="M0 2 C 6 -14 14 -26 26 -36 M6 4 C 12 -8 20 -18 32 -24" stroke="${P.wingDark}" stroke-width="1.2" fill="none" opacity=".6"/>`);
    case 'nature':
      return g(`<path d="M0 4 C -16 -8 -12 -32 4 -44 C 12 -30 10 -10 0 4 Z" fill="url(#${uid}leaf)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1"/><path d="M2 0 C 2 -14 4 -28 4 -40" stroke="${P.E1.dark}" stroke-width="1" fill="none" opacity=".6"/><path d="M12 8 C 4 -4 12 -26 30 -34 C 30 -18 26 -2 12 8 Z" fill="url(#${uid}leaf)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1"/>`);
    case 'earth':
      return g(`<path d="M-4 4 L -2 -22 L 10 -34 L 16 -8 L 12 6 Z" fill="url(#${uid}rock)" stroke="${shade(P.E1.dark, -20)}" stroke-width="1.2" stroke-linejoin="round"/><path d="M14 8 L 20 -12 L 32 -18 L 34 0 L 26 10 Z" fill="url(#${uid}rock)" stroke="${shade(P.E1.dark, -20)}" stroke-width="1.2" stroke-linejoin="round"/>`);
    case 'electric':
      return g(`<path d="M-2 4 L 6 -16 L 0 -16 L 12 -44 L 8 -22 L 15 -22 L 4 4 Z" fill="url(#${uid}bolt)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1"/><path d="M14 8 L 22 -10 L 16 -10 L 30 -34 L 26 -14 L 33 -14 L 20 8 Z" fill="url(#${uid}bolt)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1"/>`);
    case 'ice':
      return g(`<path d="M-4 4 L 0 -40 L 8 -26 L 10 4 Z" fill="url(#${uid}ice)" stroke="${P.E1.dark}" stroke-width="1"/><path d="M12 6 L 20 -28 L 28 -14 L 28 6 Z" fill="url(#${uid}ice)" stroke="${P.E1.dark}" stroke-width="1"/><path d="M1 -32 L 4 -8 M20 -22 L 22 -2" stroke="#fff" stroke-width="1.2" opacity=".7"/>`);
    case 'metal':
      return g(`<path d="M-4 4 C -2 -14 4 -28 14 -38 C 12 -24 12 -10 8 6 Z" fill="url(#${uid}metal)" stroke="${P.E1.dark}" stroke-width="1"/><path d="M10 8 C 14 -6 22 -18 34 -26 C 28 -14 26 -2 22 10 Z" fill="url(#${uid}metal)" stroke="${P.E1.dark}" stroke-width="1"/><circle cx="4" cy="-8" r="1.6" fill="${P.E1.dark}"/><circle cx="18" cy="-4" r="1.6" fill="${P.E1.dark}"/>`);
    case 'dark':
      return g(`<path d="M-2 6 C -18 -4 -22 -26 -8 -44 C -8 -26 2 -20 4 -8 C 10 -22 8 -34 2 -46 C 20 -34 20 -10 8 6 Z" fill="url(#${uid}shadow)"/><path d="M12 8 C 6 -8 14 -30 28 -36 C 22 -22 26 -10 30 0 C 22 -2 16 4 12 8 Z" fill="url(#${uid}shadow)" opacity=".85"/>`);
    case 'light':
      return g(`<path d="M-2 4 C -8 -12 0 -34 12 -44 C 8 -28 14 -14 10 2 Z" fill="url(#${uid}glow)"/><path d="M12 6 C 12 -10 22 -26 36 -32 C 28 -18 30 -6 24 8 Z" fill="url(#${uid}glow)" opacity=".85"/>`);
    case 'legend':
      return g(`<path d="M-6 6 L -2 -20 L 6 -8 L 12 -30 L 18 -8 L 26 -20 L 30 6 Z" fill="url(#${uid}gold)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="-14" r="3" fill="#ff5fa2"/><circle cx="2" cy="-6" r="1.8" fill="#8ff"/><circle cx="22" cy="-6" r="1.8" fill="#8ff"/>`);
  }
  return '';
}

function tailTipFor(el, P, tip, dir, s, uid) {
  // Tail ornament at `tip`, oriented along `dir` (unit vector of the tail's end direction).
  const ang = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI;
  const g = (inner) => `<g transform="translate(${f1(tip[0])} ${f1(tip[1])}) rotate(${f1(ang)}) scale(${f1(s)})">${inner}</g>`;
  switch (el) {
    case 'fire':
      return g(`<path d="M-4 -6 C 12 -18 26 -14 40 -2 C 26 -4 22 4 30 14 C 14 12 6 8 -4 6 Z" fill="url(#${uid}flame)"/><path d="M0 -3 C 10 -10 20 -8 30 -2 C 20 -2 18 2 24 8 C 12 6 6 4 0 3 Z" fill="#fff59d" opacity=".55"/>`);
    case 'water':
      return g(`<path d="M-4 -8 C 10 -22 30 -26 40 -12 C 26 -10 22 -2 22 4 C 22 10 26 16 40 18 C 30 30 8 26 -4 8 Z" fill="url(#${uid}fin)" stroke="${P.wingDark}" stroke-width="1"/>`);
    case 'nature':
      return g(`<path d="M-4 0 C 6 -20 28 -24 44 -10 C 30 8 10 14 -4 0 Z" fill="url(#${uid}leaf)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1"/><path d="M0 0 C 12 -6 26 -8 40 -8" stroke="${P.E1.dark}" stroke-width="1" fill="none" opacity=".6"/>`);
    case 'earth':
      return g(`<path d="M-4 -10 L 14 -18 L 32 -12 L 36 2 L 26 14 L 6 14 L -4 4 Z" fill="url(#${uid}rock)" stroke="${shade(P.E1.dark, -20)}" stroke-width="1.2" stroke-linejoin="round"/>`);
    case 'electric':
      return g(`<path d="M-4 -4 L 18 -14 L 12 -4 L 40 -10 L 20 6 L 28 14 L -2 6 Z" fill="url(#${uid}bolt)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1"/>`);
    case 'ice':
      return g(`<path d="M-4 -6 L 20 -20 L 40 -4 L 22 16 L -4 6 Z" fill="url(#${uid}ice)" stroke="${P.E1.dark}" stroke-width="1"/><path d="M4 -2 L 30 -6" stroke="#fff" stroke-width="1.2" opacity=".7"/>`);
    case 'metal':
      return g(`<path d="M-4 -8 L 44 -2 L -4 8 Z" fill="url(#${uid}metal)" stroke="${P.E1.dark}" stroke-width="1"/><path d="M0 0 L 34 -2" stroke="#fff" stroke-width="1" opacity=".5"/>`);
    case 'dark':
      return g(`<path d="M-4 0 L 14 -18 L 40 0 L 14 18 Z" fill="url(#${uid}shadow)"/><path d="M6 0 L 16 -8 L 28 0 L 16 8 Z" fill="${shade(P.E1.dark, -30)}" opacity=".6"/>`);
    case 'light':
      return g(`<path d="M-2 0 L 12 -8 L 18 -22 L 24 -8 L 40 0 L 24 8 L 18 22 L 12 8 Z" fill="url(#${uid}glow)"/>`);
    case 'legend':
      return g(`<path d="M-4 -8 L 20 -16 L 40 0 L 20 16 L -4 8 Z" fill="url(#${uid}gold)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1.2"/><circle cx="18" cy="0" r="4" fill="#ff5fa2"/>`);
  }
  return '';
}

function hornsFor(el, P, base, s, uid, variant) {
  // Two horns from the back of the skull (base), pointing up/back.
  const [x, y] = base;
  const g = (inner) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">${inner}</g>`;
  const fill = `url(#${uid}horn)`;
  const stroke = `stroke="${P.hornDark}" stroke-width="1.2" stroke-linejoin="round"`;
  if (el === 'ice') return g(`<path d="M-2 4 L 2 -34 L 12 -6 Z" fill="url(#${uid}ice)" stroke="${P.E1.dark}" stroke-width="1"/><path d="M12 6 L 22 -26 L 30 0 Z" fill="url(#${uid}ice)" stroke="${P.E1.dark}" stroke-width="1"/>`);
  if (el === 'electric') return g(`<path d="M-2 4 L 4 -14 L -2 -14 L 10 -36 L 6 -18 L 12 -18 L 4 6 Z" fill="url(#${uid}bolt)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1"/><path d="M12 8 L 18 -8 L 12 -8 L 26 -30 L 22 -12 L 28 -12 L 18 10 Z" fill="url(#${uid}bolt)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1"/>`);
  if (el === 'nature') return g(`<path d="M-2 4 C -16 -8 -10 -28 4 -36 C 12 -24 10 -8 -2 4 Z" fill="url(#${uid}leaf)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1"/><path d="M12 6 C 6 -10 16 -26 30 -30 C 30 -14 26 -2 12 6 Z" fill="url(#${uid}leaf)" stroke="${shade(P.E1.dark, -10)}" stroke-width="1"/>`);
  if (el === 'earth') return g(`<path d="M-4 4 L -2 -18 L 8 -30 L 14 -6 L 10 6 Z" fill="url(#${uid}rock)" stroke="${shade(P.E1.dark, -20)}" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 8 L 18 -10 L 30 -20 L 32 0 L 24 10 Z" fill="url(#${uid}rock)" stroke="${shade(P.E1.dark, -20)}" stroke-width="1.2" stroke-linejoin="round"/>`);
  if (el === 'water') return g(`<path d="M-4 6 C -4 -14 10 -34 30 -36 C 22 -24 24 -8 34 4 C 20 0 6 6 -4 6 Z" fill="url(#${uid}fin)" stroke="${P.wingDark}" stroke-width="1.2"/><path d="M2 2 C 8 -12 16 -24 28 -30 M10 4 C 14 -6 22 -16 32 -20" stroke="${P.wingDark}" stroke-width="1" fill="none" opacity=".55"/>`);
  if (el === 'legend') return g(`<path d="M-4 4 C -2 -18 8 -36 24 -42 C 16 -28 14 -12 8 4 Z" fill="url(#${uid}gold)" ${stroke}/><path d="M12 8 C 18 -8 30 -22 46 -26 C 36 -14 30 -2 24 10 Z" fill="url(#${uid}gold)" ${stroke}/><path d="M2 -6 C 6 -16 12 -24 18 -30" stroke="#fff3c4" stroke-width="1.4" fill="none" opacity=".8"/>`);
  if (el === 'dark') return g(`<path d="M-4 4 C -12 -10 -8 -30 8 -42 C 4 -28 8 -14 10 4 Z" fill="${shade(P.hornDark, -40)}" stroke="#120826" stroke-width="1.2"/><path d="M12 8 C 8 -8 16 -28 34 -38 C 26 -24 26 -8 24 10 Z" fill="${shade(P.hornDark, -40)}" stroke="#120826" stroke-width="1.2"/><path d="M2 -6 C 2 -18 6 -26 10 -32" stroke="#5b3ea3" stroke-width="1.2" fill="none" opacity=".7"/>`);
  if (el === 'metal') return g(`<path d="M-4 4 C -2 -14 6 -30 18 -38 C 12 -24 12 -10 8 6 Z" fill="url(#${uid}metal)" stroke="${P.E1.dark}" stroke-width="1"/><path d="M12 8 C 16 -6 26 -22 40 -30 C 32 -18 30 -4 24 10 Z" fill="url(#${uid}metal)" stroke="${P.E1.dark}" stroke-width="1"/><path d="M-1 -4 L 9 -6 M2 -14 L 12 -18 M14 -2 L 26 -6 M18 -12 L 30 -18" stroke="${P.E1.dark}" stroke-width="1" opacity=".6"/>`);
  // generic horn variants (fire, light and fallbacks)
  if (variant === 1) return g(`<path d="M-3 4 L 0 -34 L 10 0 Z" fill="${fill}" ${stroke}/><path d="M12 6 L 20 -28 L 28 4 Z" fill="${fill}" ${stroke}/>`);
  if (variant === 2) return g(`<path d="M-4 4 C -18 -8 -14 -28 4 -34 C 2 -20 8 -8 8 4 Z" fill="${fill}" ${stroke}/><path d="M12 8 C 2 -4 8 -26 26 -30 C 22 -16 26 -4 24 10 Z" fill="${fill}" ${stroke}/>`);
  if (variant === 3) return g(`<path d="M-4 4 C -22 0 -22 -24 -6 -30 C 6 -34 12 -22 6 -12 C 2 -6 -2 0 -4 4 Z" fill="${fill}" ${stroke}/><path d="M12 8 C -2 4 -2 -20 14 -26 C 26 -30 32 -18 26 -8 C 22 -2 16 4 12 8 Z" fill="${fill}" ${stroke}/>`);
  return g(`<path d="M-4 4 C -2 -14 8 -32 26 -40 C 16 -26 14 -10 8 4 Z" fill="${fill}" ${stroke}/><path d="M12 8 C 18 -8 32 -24 48 -30 C 36 -16 30 -2 24 10 Z" fill="${fill}" ${stroke}/><path d="M2 -8 C 6 -18 12 -26 20 -32" stroke="#fff" stroke-width="1.2" fill="none" opacity=".5"/>`);
}

// ---------- the dragon ----------
export function dragonSVG(speciesId, stage = 'adult', opts = {}) {
  const sp = DRAGONS[speciesId];
  const size = opts.size || 200;
  const P = palette(sp);
  const look = sp.look;
  const s = stage === 'baby' ? 0 : stage === 'young' ? 1 : 2;
  const uid = `d${speciesId}${s}`;
  const mythic = sp.rarity === 'mythic';
  const legendary = sp.rarity === 'legendary' || mythic;
  const epic = sp.rarity === 'epic';
  const e1 = P.E1.id;
  const e2 = P.E2 ? P.E2.id : e1;

  // Stage proportions.
  const st = [
    { head: 1.35, neck: 0.5, body: 0.72, wing: 0.22, tail: 0.55, leg: 0.5, spines: 0.45, crest: 0.55, horn: 0.5, legW: 1.35 },
    { head: 1.12, neck: 0.8, body: 0.88, wing: 0.68, tail: 0.85, leg: 0.85, spines: 0.8, crest: 0.85, horn: 0.8, legW: 1.1 },
    { head: 1.0, neck: 1.0, body: 1.0, wing: 1.0, tail: 1.0, leg: 1.0, spines: 1.0, crest: 1.0, horn: 1.0, legW: 1.0 },
  ][s];

  // --- key points (adult layout scaled per stage, facing left) ---
  const groundY = 206;
  const bodyKind = [0, 1, 2].includes(look.body) ? look.body : 0; // 0 normal, 1 bulky, 2 slim
  const bodyRx = 50 * st.body * [1, 1.1, 0.9][bodyKind], bodyRy = 40 * st.body * [1, 1.12, 0.9][bodyKind];
  const legLen = 58 * st.leg;
  const bodyC = [128, groundY - legLen - bodyRy * 0.55];
  const neckStart = [bodyC[0] - bodyRx * 0.55, bodyC[1] - bodyRy * 0.55];
  const neckEnd = add(neckStart, [-24 * st.neck, -58 * st.neck]);
  const neckW0 = 34 * st.body * [1, 1.15, 0.85][bodyKind], neckW1 = 26 * Math.max(st.body, 0.8) * [1, 1.1, 0.85][bodyKind];
  const headScale = st.head * (0.9 + 0.1 * st.body);
  const headC = add(neckEnd, [-8 * headScale, -6 * headScale]);
  const tailStart = [bodyC[0] + bodyRx * 0.75, bodyC[1] + bodyRy * 0.15];
  const tailP1 = add(tailStart, [52 * st.tail, 28 * st.tail]);
  const tailP2 = add(tailStart, [82 * st.tail, -26 * st.tail]);
  const tailP3 = add(tailStart, [46 * st.tail, -70 * st.tail]);
  const tailW = (t) => (24 * st.body) * (1 - t) * (1 - t) + 6 * (1 - (1 - t) * (1 - t));
  const wingRoot = [bodyC[0] + 6, bodyC[1] - bodyRy * 0.45];
  const wingRootFar = [bodyC[0] + 30, bodyC[1] - bodyRy * 0.62];

  const parts = [];
  const defs = [];

  // --- defs: gradients, patterns, filters ---
  defs.push(`<radialGradient id="${uid}body" gradientUnits="userSpaceOnUse" cx="${f1(bodyC[0] - 40)}" cy="${f1(bodyC[1] - 70)}" r="190"><stop offset="0" stop-color="${P.light}"/><stop offset=".42" stop-color="${P.base}"/><stop offset=".8" stop-color="${P.dark}"/><stop offset="1" stop-color="${P.deep}"/></radialGradient>`);
  defs.push(`<radialGradient id="${uid}belly" gradientUnits="userSpaceOnUse" cx="${f1(bodyC[0] - 40)}" cy="${f1(bodyC[1] - 40)}" r="150"><stop offset="0" stop-color="${mix(P.belly, '#ffffff', 0.4)}"/><stop offset=".5" stop-color="${P.belly}"/><stop offset="1" stop-color="${P.bellyDark}"/></radialGradient>`);
  defs.push(`<linearGradient id="${uid}wing" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${P.wingDark}"/><stop offset=".45" stop-color="${P.wing}"/><stop offset="1" stop-color="${P.wingLight}"/></linearGradient>`);
  defs.push(`<linearGradient id="${uid}horn" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${P.hornDark}"/><stop offset=".5" stop-color="${P.horn}"/><stop offset="1" stop-color="${mix(P.horn, '#fff', 0.5)}"/></linearGradient>`);
  defs.push(`<linearGradient id="${uid}flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d00"/><stop offset=".5" stop-color="#ff9100"/><stop offset="1" stop-color="#ffee58"/></linearGradient>`);
  defs.push(`<linearGradient id="${uid}fin" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${mix('#1565c0', P.wing, 0.5)}" stop-opacity=".9"/><stop offset="1" stop-color="${mix('#b3e5fc', P.wingLight, 0.5)}" stop-opacity=".85"/></linearGradient>`);
  defs.push(`<linearGradient id="${uid}leaf" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2e7d32"/><stop offset=".6" stop-color="#66bb6a"/><stop offset="1" stop-color="#c5e1a5"/></linearGradient>`);
  defs.push(`<linearGradient id="${uid}rock" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#5d4037"/><stop offset=".6" stop-color="#8d6e63"/><stop offset="1" stop-color="#d7ccc8"/></linearGradient>`);
  defs.push(`<linearGradient id="${uid}bolt" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffab00"/><stop offset="1" stop-color="#ffff8d"/></linearGradient>`);
  defs.push(`<linearGradient id="${uid}ice" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#4fc3f7" stop-opacity=".95"/><stop offset=".6" stop-color="#b3e5fc"/><stop offset="1" stop-color="#ffffff"/></linearGradient>`);
  defs.push(`<linearGradient id="${uid}metal" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#546e7a"/><stop offset=".5" stop-color="#b0bec5"/><stop offset=".7" stop-color="#eceff1"/><stop offset="1" stop-color="#90a4ae"/></linearGradient>`);
  defs.push(`<linearGradient id="${uid}shadow" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1a0b3d"/><stop offset=".6" stop-color="#4a2a8a"/><stop offset="1" stop-color="#8a5cf0" stop-opacity=".2"/></linearGradient>`);
  defs.push(`<linearGradient id="${uid}glow" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffd54f"/><stop offset="1" stop-color="#ffffff"/></linearGradient>`);
  defs.push(`<linearGradient id="${uid}gold" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#b8860b"/><stop offset=".5" stop-color="#ffd54f"/><stop offset="1" stop-color="#fff8e1"/></linearGradient>`);
  defs.push(`<radialGradient id="${uid}iris" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${mix(P.eye, '#fff', 0.5)}"/><stop offset=".6" stop-color="${P.eye}"/><stop offset="1" stop-color="${shade(P.eye, -90)}"/></radialGradient>`);
  defs.push(`<pattern id="${uid}scales" width="9" height="7" patternUnits="userSpaceOnUse"><path d="M0 7 a4.5 4.5 0 0 1 9 0" fill="none" stroke="#000" stroke-opacity=".13" stroke-width="1"/><path d="M-4.5 3.5 a4.5 4.5 0 0 1 9 0 M4.5 3.5 a4.5 4.5 0 0 1 9 0" fill="none" stroke="#000" stroke-opacity=".13" stroke-width="1"/><path d="M0 7 a4.5 4.5 0 0 1 9 0" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1" transform="translate(0 -1)"/></pattern>`);
  defs.push(`<filter id="${uid}blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>`);
  defs.push(`<filter id="${uid}soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>`);
  defs.push(`<filter id="${uid}glowf" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  const bodyPath = `M${pt([bodyC[0] - bodyRx, bodyC[1] - bodyRy * 0.1])} C ${pt([bodyC[0] - bodyRx, bodyC[1] - bodyRy * 1.05])} ${pt([bodyC[0] + bodyRx * 0.3, bodyC[1] - bodyRy * 1.15])} ${pt([bodyC[0] + bodyRx * 0.85, bodyC[1] - bodyRy * 0.55])} C ${pt([bodyC[0] + bodyRx * 1.12, bodyC[1] - bodyRy * 0.1])} ${pt([bodyC[0] + bodyRx * 0.95, bodyC[1] + bodyRy * 0.85])} ${pt([bodyC[0] + bodyRx * 0.3, bodyC[1] + bodyRy])} C ${pt([bodyC[0] - bodyRx * 0.4, bodyC[1] + bodyRy * 1.08])} ${pt([bodyC[0] - bodyRx * 1.05, bodyC[1] + bodyRy * 0.6])} ${pt([bodyC[0] - bodyRx, bodyC[1] - bodyRy * 0.1])} Z`;
  defs.push(`<clipPath id="${uid}bodyclip"><path d="${bodyPath}"/></clipPath>`);
  const neckPath = tube(neckStart, add(neckStart, [-2 * st.neck, -30 * st.neck]), add(neckEnd, [6 * st.neck, 26 * st.neck]), neckEnd, (t) => neckW0 * (1 - t) + neckW1 * t, 12, false, true);
  defs.push(`<clipPath id="${uid}neckclip"><path d="${neckPath}"/></clipPath>`);

  // --- rarity aura ---
  if (mythic) {
    defs.push(`<radialGradient id="${uid}aura"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".5" stop-color="${P.wing}" stop-opacity=".45"/><stop offset="1" stop-color="${P.base}" stop-opacity="0"/></radialGradient>`);
    parts.push(`<circle cx="120" cy="118" r="112" fill="url(#${uid}aura)"/>`);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const r = 92 + (i % 2) * 10;
      parts.push(`<path d="M${f1(120 + Math.cos(a) * r)} ${f1(118 + Math.sin(a) * r)} m -5 0 l 5 -7 l 5 7 l -5 7 Z" fill="#fff" opacity=".85"/>`);
    }
  } else if (legendary) {
    defs.push(`<radialGradient id="${uid}aura"><stop offset="0" stop-color="${P.light}" stop-opacity=".85"/><stop offset="1" stop-color="${P.base}" stop-opacity="0"/></radialGradient>`);
    parts.push(`<circle cx="120" cy="118" r="106" fill="url(#${uid}aura)"/>`);
  } else if (epic) {
    defs.push(`<radialGradient id="${uid}aura"><stop offset="0" stop-color="${P.mark || P.light}" stop-opacity=".4"/><stop offset="1" stop-color="${P.base}" stop-opacity="0"/></radialGradient>`);
    parts.push(`<circle cx="120" cy="120" r="100" fill="url(#${uid}aura)"/>`);
  }

  // --- ground shadow ---
  parts.push(`<ellipse cx="${f1(bodyC[0] + 4)}" cy="${groundY + 6}" rx="${f1(70 * st.body + 10)}" ry="${f1(12 * st.body + 3)}" fill="#000" opacity=".28" filter="url(#${uid}blur)"/>`);

  // --- wing (far) ---
  const wing = (root, sc, far) => {
    if (st.wing < 0.3) {
      // wing nubs for babies
      const [x, y] = root;
      return `<path d="M${f1(x)} ${f1(y)} c 6 -22 26 -26 34 -12 c -8 4 -18 4 -24 14 Z" fill="url(#${uid}wing)" stroke="${P.wingDark}" stroke-width="1" opacity="${far ? 0.7 : 1}"/>`;
    }
    const wrist = [34, -74];
    const tips = [[66, -128], [112, -104], [136, -60], [118, -14]];
    const feather = look.wing === 1;
    const fin = look.wing === 2 || e2 === 'water' || e2 === 'ice';
    // Scallop control points sit well inside the wing so the trailing edge dips between fingers.
    const dip = (a, b, k) => { const m = lerpPt(a, b, 0.5); return lerpPt(m, wrist, k); };
    const c1 = dip(tips[0], tips[1], feather ? 0.15 : 0.42), c2 = dip(tips[1], tips[2], feather ? 0.15 : 0.4), c3 = dip(tips[2], tips[3], feather ? 0.15 : 0.38);
    const membrane = `M0 0 C 10 -30, 20 -56, ${pt(wrist)} C ${pt(add(wrist, [10, -20]))} ${pt(add(tips[0], [-14, 8]))} ${pt(tips[0])} Q ${pt(c1)} ${pt(tips[1])} Q ${pt(c2)} ${pt(tips[2])} Q ${pt(c3)} ${pt(tips[3])} C 90 -6, 40 4, 0 0 Z`;
    let edgeDeco = '';
    if (feather) {
      edgeDeco = [tips[0], tips[1], tips[2]].map((t, i) => { const n = tips[i + 1]; return `<path d="M${pt(t)} Q ${pt(lerpPt(t, n, 0.25))} ${pt(lerpPt(t, n, 0.5))} Q ${pt(lerpPt(t, n, 0.75))} ${pt(n)}" fill="none" stroke="${P.wingLight}" stroke-width="4" stroke-linecap="round" opacity=".6"/>`; }).join('');
    }
    const fingers = tips.map((t) => `M${pt(wrist)} L ${pt(t)}`).join(' ');
    const veins = tips.slice(0, 3).map((t, i) => `M${pt(lerpPt(wrist, t, 0.45))} Q ${pt(lerpPt(lerpPt(t, tips[i + 1], 0.5), wrist, 0.35))} ${pt(lerpPt(wrist, tips[i + 1], 0.55))}`).join(' ');
    return `<g transform="translate(${f1(root[0])} ${f1(root[1])}) scale(${f1(sc)})" opacity="${far ? 0.82 : 1}">
      <path d="${membrane}" fill="url(#${uid}wing)" stroke="${P.wingDark}" stroke-width="1.2" stroke-linejoin="round" opacity="${fin ? 0.88 : 0.97}"/>
      <path d="${membrane}" fill="url(#${uid}scales)" opacity=".45"/>
      <path d="${veins}" fill="none" stroke="${P.wingDark}" stroke-width="1" opacity=".35"/>
      ${edgeDeco}
      <path d="M0 0 C 10 -30, 20 -56, ${pt(wrist)}" fill="none" stroke="${P.wingDark}" stroke-width="7" stroke-linecap="round"/>
      <path d="${fingers}" fill="none" stroke="${P.wingDark}" stroke-width="4" stroke-linecap="round"/>
      <path d="M0 0 C 10 -30, 20 -56, ${pt(wrist)}" fill="none" stroke="${mix(P.wingDark, '#fff', 0.4)}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
      <path d="${fingers}" fill="none" stroke="${mix(P.wingDark, '#fff', 0.4)}" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>
      <circle cx="${f1(wrist[0])}" cy="${f1(wrist[1])}" r="4.5" fill="${P.wingDark}"/>
      <path d="M${pt(wrist)} l -9 -9 l 4 11 Z" fill="url(#${uid}horn)" stroke="${P.hornDark}" stroke-width="1"/>
      ${P.mark2 ? `<circle cx="84" cy="-74" r="6" fill="${P.mark2}" opacity=".75"/><circle cx="106" cy="-50" r="4.5" fill="${P.mark2}" opacity=".75"/>` : ''}
    </g>`;
  };
  if (s > 0) parts.push(wing(wingRootFar, 0.68 * st.wing, true));

  // --- tail ---
  parts.push(`<path d="${tube(tailStart, tailP1, tailP2, tailP3, tailW, 18, true, true)}" fill="url(#${uid}body)" stroke="${P.dark}" stroke-width="1" stroke-opacity=".6"/>`);
  parts.push(`<path d="${tube(tailStart, tailP1, tailP2, tailP3, tailW, 18, true, true)}" fill="url(#${uid}scales)"/>`);
  // tail underside plates
  parts.push(`<path d="${tube(tailStart, tailP1, tailP2, tailP3, (t) => tailW(t) * 0.42, 18, true, true)}" fill="url(#${uid}belly)" opacity=".55" transform="translate(0 ${f1(4 * st.body)})"/>`);
  {
    const tan = bezTangent(tailStart, tailP1, tailP2, tailP3, 1);
    const len = Math.hypot(tan[0], tan[1]) || 1;
    parts.push(tailTipFor(e2, P, tailP3, [tan[0] / len, tan[1] / len], 0.75 * st.tail + 0.2, uid));
  }
  // tail spines
  if (st.spines > 0.5) {
    for (let i = 1; i <= 5; i++) {
      const t = i / 7;
      const p = bez(tailStart, tailP1, tailP2, tailP3, t);
      const tan = bezTangent(tailStart, tailP1, tailP2, tailP3, t);
      const len = Math.hypot(tan[0], tan[1]) || 1;
      const n = [tan[1] / len, -tan[0] / len]; // "up" side
      const w = tailW(t) / 2;
      const b = add(p, scale(n, w - 1));
      const h = (14 - i * 1.6) * st.spines;
      const tipP = add(b, scale(n, h));
      const l = add(b, scale([tan[0] / len, tan[1] / len], -5));
      const r = add(b, scale([tan[0] / len, tan[1] / len], 5));
      parts.push(`<path d="M${pt(l)} L ${pt(tipP)} L ${pt(r)} Z" fill="url(#${uid}horn)" stroke="${P.hornDark}" stroke-width="1" stroke-linejoin="round"/>`);
    }
  }

  // --- far legs ---
  const leg = (hip, dir, w0, w1, far, hind) => {
    const knee = add(hip, [dir * 10 * st.leg + (hind ? 6 : -4), legLen * 0.5]);
    const ankle = add(hip, [dir * 6 * st.leg + (hind ? 10 : -2), legLen * 0.92]);
    const foot = add(ankle, [-6, 8]);
    const shadeK = far ? 0.72 : 1;
    let g = '';
    if (hind) g += `<ellipse cx="${f1(hip[0])}" cy="${f1(hip[1] + 4)}" rx="${f1(24 * st.body)}" ry="${f1(19 * st.body)}" fill="url(#${uid}body)"/>`;
    g += `<path d="${tube(hip, lerpPt(hip, knee, 0.5), lerpPt(knee, ankle, 0.5), ankle, (t) => w0 * (1 - t) + w1 * t, 8, true, true)}" fill="url(#${uid}body)" stroke="${P.dark}" stroke-width="1" stroke-opacity=".5"/>`;
    g += `<path d="${tube(hip, lerpPt(hip, knee, 0.5), lerpPt(knee, ankle, 0.5), ankle, (t) => w0 * (1 - t) + w1 * t, 8, true, true)}" fill="url(#${uid}scales)"/>`;
    // foot
    g += `<path d="M${f1(foot[0] - 16)} ${f1(foot[1] + 2)} C ${f1(foot[0] - 16)} ${f1(foot[1] - 10)} ${f1(foot[0] + 14)} ${f1(foot[1] - 10)} ${f1(foot[0] + 16)} ${f1(foot[1] + 2)} C ${f1(foot[0] + 8)} ${f1(foot[1] + 8)} ${f1(foot[0] - 8)} ${f1(foot[1] + 8)} ${f1(foot[0] - 16)} ${f1(foot[1] + 2)} Z" fill="url(#${uid}body)" stroke="${P.dark}" stroke-width="1" stroke-opacity=".5"/>`;
    for (let i = 0; i < 3; i++) {
      const cx = foot[0] - 14 + i * 9;
      g += `<path d="M${f1(cx)} ${f1(foot[1] + 1)} q -5 4 -7 10 q 6 -3 10 -6 Z" fill="url(#${uid}horn)" stroke="${P.hornDark}" stroke-width=".8"/>`;
    }
    return far ? `<g opacity="${shadeK}">${g}</g>` : g;
  };
  const hipFront = [bodyC[0] - bodyRx * 0.45, bodyC[1] + bodyRy * 0.25];
  const hipHind = [bodyC[0] + bodyRx * 0.45, bodyC[1] + bodyRy * 0.3];
  const lw = st.body * st.legW;
  parts.push(leg(add(hipFront, [22, -8]), 1, 20 * lw, 13 * lw, true, false));
  parts.push(leg(add(hipHind, [16, -10]), 1, 22 * lw, 14 * lw, true, true));

  // --- body ---
  parts.push(`<path d="${bodyPath}" fill="url(#${uid}body)" stroke="${P.dark}" stroke-width="1.2" stroke-opacity=".6"/>`);
  parts.push(`<path d="${bodyPath}" fill="url(#${uid}scales)"/>`);
  // belly plates
  {
    const bx = bodyC[0] - bodyRx * 0.2, by = bodyC[1] + bodyRy * 0.45;
    parts.push(`<g clip-path="url(#${uid}bodyclip)"><ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="${f1(bodyRx * 0.72)}" ry="${f1(bodyRy * 0.55)}" fill="url(#${uid}belly)"/>`);
    for (let i = -2; i <= 3; i++) {
      const yy = by + i * bodyRy * 0.19;
      parts.push(`<path d="M${f1(bx - bodyRx * 0.72)} ${f1(yy)} Q ${f1(bx)} ${f1(yy + 7)} ${f1(bx + bodyRx * 0.72)} ${f1(yy)}" fill="none" stroke="${P.bellyDark}" stroke-width="1.6" opacity=".55"/>`);
    }
    parts.push('</g>');
  }
  // ambient occlusion where neck and wing meet the body
  parts.push(`<g clip-path="url(#${uid}bodyclip)"><ellipse cx="${f1(neckStart[0] + 6)}" cy="${f1(neckStart[1] + 10)}" rx="26" ry="14" fill="#000" opacity=".22" filter="url(#${uid}blur)"/><ellipse cx="${f1(wingRoot[0] + 10)}" cy="${f1(wingRoot[1] + 8)}" rx="22" ry="10" fill="#000" opacity=".18" filter="url(#${uid}blur)"/></g>`);
  // markings for third/fourth elements
  if (P.mark) {
    const spots = [[0.25, -0.35, 9], [0.55, 0.05, 7], [0.05, -0.65, 6], [0.7, -0.45, 5], [0.4, 0.4, 6]];
    parts.push(`<g clip-path="url(#${uid}bodyclip)" opacity=".8">${spots.map(([fx, fy, r], i) => `<circle cx="${f1(bodyC[0] + fx * bodyRx)}" cy="${f1(bodyC[1] + fy * bodyRy)}" r="${r * st.body}" fill="${i % 2 && P.mark2 ? P.mark2 : P.mark}"/>`).join('')}</g>`);
  } else if (P.E2 && !['metal', 'earth'].includes(e2)) {
    if (look.tail % 2 === 1) {
      // stripes across the back
      parts.push(`<g clip-path="url(#${uid}bodyclip)" opacity=".5">${[0.05, 0.35, 0.65].map((fx) => `<path d="M${f1(bodyC[0] + (fx - 0.15) * bodyRx)} ${f1(bodyC[1] - bodyRy * 1.2)} C ${f1(bodyC[0] + (fx + 0.1) * bodyRx)} ${f1(bodyC[1] - bodyRy * 0.6)} ${f1(bodyC[0] + (fx + 0.05) * bodyRx)} ${f1(bodyC[1] - bodyRy * 0.1)} ${f1(bodyC[0] + (fx - 0.1) * bodyRx)} ${f1(bodyC[1] + bodyRy * 0.3)}" fill="none" stroke="${P.accent}" stroke-width="${f1(7 * st.body)}" stroke-linecap="round"/>`).join('')}</g>`);
    } else {
      parts.push(`<g clip-path="url(#${uid}bodyclip)" opacity=".55">${[[0.3, -0.4, 7], [0.6, 0.0, 5.5], [0.1, -0.7, 4.5]].map(([fx, fy, r]) => `<circle cx="${f1(bodyC[0] + fx * bodyRx)}" cy="${f1(bodyC[1] + fy * bodyRy)}" r="${r * st.body}" fill="${P.accent}"/>`).join('')}</g>`);
    }
  }
  // element body armour
  if (e1 === 'metal' || e2 === 'metal') {
    parts.push(`<g clip-path="url(#${uid}bodyclip)"><path d="M${f1(bodyC[0] - bodyRx * 0.4)} ${f1(bodyC[1] - bodyRy * 0.95)} C ${f1(bodyC[0] + bodyRx * 0.2)} ${f1(bodyC[1] - bodyRy * 1.2)} ${f1(bodyC[0] + bodyRx * 0.9)} ${f1(bodyC[1] - bodyRy * 0.6)} ${f1(bodyC[0] + bodyRx * 1.1)} ${f1(bodyC[1] - bodyRy * 0.1)} L ${f1(bodyC[0] + bodyRx * 0.6)} ${f1(bodyC[1] - bodyRy * 0.2)} C ${f1(bodyC[0] + bodyRx * 0.2)} ${f1(bodyC[1] - bodyRy * 0.6)} ${f1(bodyC[0] - bodyRx * 0.2)} ${f1(bodyC[1] - bodyRy * 0.6)} ${f1(bodyC[0] - bodyRx * 0.4)} ${f1(bodyC[1] - bodyRy * 0.95)} Z" fill="url(#${uid}metal)" stroke="#455a64" stroke-width="1.2"/><circle cx="${f1(bodyC[0] + 6)}" cy="${f1(bodyC[1] - bodyRy * 0.85)}" r="2" fill="#37474f"/><circle cx="${f1(bodyC[0] + 28)}" cy="${f1(bodyC[1] - bodyRy * 0.6)}" r="2" fill="#37474f"/></g>`);
  }
  if (e1 === 'earth' || e2 === 'earth') {
    parts.push(`<g clip-path="url(#${uid}bodyclip)">${[[0.1, -0.85, 9], [0.5, -0.7, 7], [0.8, -0.35, 6]].map(([fx, fy, r]) => `<path d="M${f1(bodyC[0] + fx * bodyRx - r)} ${f1(bodyC[1] + fy * bodyRy + r * 0.4)} l ${r * 0.6} ${-r} l ${r} ${-r * 0.2} l ${r * 0.6} ${r * 0.9} l ${-r * 0.4} ${r * 0.7} Z" fill="url(#${uid}rock)" stroke="#4e342e" stroke-width="1"/>`).join('')}</g>`);
  }

  // --- back spines along the body ---
  if (st.spines > 0.5) {
    for (let i = 0; i < 4; i++) {
      const t = 0.15 + i * 0.22;
      // sample along the body's top curve (from neckStart to tailStart region)
      const p0 = [bodyC[0] - bodyRx * 0.55, bodyC[1] - bodyRy * 0.9];
      const p3 = [bodyC[0] + bodyRx * 0.9, bodyC[1] - bodyRy * 0.5];
      const p1 = [bodyC[0] - bodyRx * 0.1, bodyC[1] - bodyRy * 1.18];
      const p2 = [bodyC[0] + bodyRx * 0.6, bodyC[1] - bodyRy * 1.0];
      const p = bez(p0, p1, p2, p3, t);
      const tan = bezTangent(p0, p1, p2, p3, t);
      const len = Math.hypot(tan[0], tan[1]) || 1;
      const n = [tan[1] / len, -tan[0] / len];
      const h = (18 - i * 2) * st.spines;
      const tipP = add(p, scale(n, h));
      const l = add(p, scale([tan[0] / len, tan[1] / len], -7));
      const r = add(p, scale([tan[0] / len, tan[1] / len], 7));
      if (look.spikes === 2) parts.push(`<path d="M${pt(l)} Q ${pt(add(tipP, [0, 2]))} ${pt(r)} Z" fill="url(#${uid}wing)" stroke="${P.wingDark}" stroke-width="1"/>`);
      else parts.push(`<path d="M${pt(l)} Q ${pt(add(p, scale(n, h * 0.6)))} ${pt(tipP)} Q ${pt(add(p, scale(n, h * 0.5)))} ${pt(r)} Z" fill="url(#${uid}horn)" stroke="${P.hornDark}" stroke-width="1" stroke-linejoin="round"/>`);
    }
  }

  // --- near legs ---
  parts.push(leg(hipHind, 1, 24 * lw, 15 * lw, false, true));
  parts.push(leg(hipFront, -1, 21 * lw, 13 * lw, false, false));

  // --- neck ---
  parts.push(`<path d="${neckPath}" fill="url(#${uid}body)" stroke="${P.dark}" stroke-width="1.2" stroke-opacity=".6"/>`);
  parts.push(`<path d="${neckPath}" fill="url(#${uid}scales)"/>`);
  // neck plates (front side)
  {
    const inner = tube(neckStart, add(neckStart, [-2 * st.neck, -30 * st.neck]), add(neckEnd, [6 * st.neck, 26 * st.neck]), neckEnd, (t) => (neckW0 * (1 - t) + neckW1 * t) * 0.45, 12, false, true);
    parts.push(`<g clip-path="url(#${uid}neckclip)"><path d="${inner}" fill="url(#${uid}belly)" opacity=".85" transform="translate(${f1(-9 * st.body)} 2)"/>`);
    for (let i = 1; i <= 6; i++) {
      const t = i / 7;
      const p = bez(neckStart, add(neckStart, [-2 * st.neck, -30 * st.neck]), add(neckEnd, [6 * st.neck, 26 * st.neck]), neckEnd, t);
      const w = (neckW0 * (1 - t) + neckW1 * t) * 0.5;
      parts.push(`<path d="M${f1(p[0] - w - 4)} ${f1(p[1] + 2)} q ${f1(w * 0.5)} 5 ${f1(w)} 0" fill="none" stroke="${P.bellyDark}" stroke-width="1.4" opacity=".5"/>`);
    }
    parts.push('</g>');
  }
  // neck spines
  if (st.spines > 0.5) {
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const p = bez(neckStart, add(neckStart, [-2 * st.neck, -30 * st.neck]), add(neckEnd, [6 * st.neck, 26 * st.neck]), neckEnd, t);
      const tan = bezTangent(neckStart, add(neckStart, [-2 * st.neck, -30 * st.neck]), add(neckEnd, [6 * st.neck, 26 * st.neck]), neckEnd, t);
      const len = Math.hypot(tan[0], tan[1]) || 1;
      const n = [tan[1] / len, -tan[0] / len];
      const w = (neckW0 * (1 - t) + neckW1 * t) / 2;
      const b = add(p, scale(n, w - 2));
      const h = 11 * st.spines;
      const tipP = add(b, scale(n, h));
      const l = add(b, scale([tan[0] / len, tan[1] / len], -5));
      const r = add(b, scale([tan[0] / len, tan[1] / len], 5));
      parts.push(`<path d="M${pt(l)} L ${pt(tipP)} L ${pt(r)} Z" fill="url(#${uid}horn)" stroke="${P.hornDark}" stroke-width="1" stroke-linejoin="round"/>`);
    }
  }

  // rim light along the back of the neck and body
  {
    const np = tube(neckStart, add(neckStart, [-2 * st.neck, -30 * st.neck]), add(neckEnd, [6 * st.neck, 26 * st.neck]), neckEnd, (t) => neckW0 * (1 - t) + neckW1 * t, 12, false, true);
    parts.push(`<g clip-path="url(#${uid}neckclip)"><path d="${np}" fill="none" stroke="#fff" stroke-width="5" opacity=".14" transform="translate(4 0)"/></g>`);
    parts.push(`<g clip-path="url(#${uid}bodyclip)"><path d="${bodyPath}" fill="none" stroke="#fff" stroke-width="6" opacity=".12" transform="translate(-2 3)"/></g>`);
  }

  // --- near wing ---
  if (s > 0) parts.push(wing(wingRoot, 0.8 * st.wing, false));
  else parts.push(wing(wingRoot, 1, false));

  // --- head ---
  {
    const hs = headScale;
    const hx = headC[0], hy = headC[1];
    const H = (x, y) => `${f1(hx + x * hs)} ${f1(hy + y * hs)}`;
    // crest + horns behind the skull
    parts.push(crestFor(e1, P, [hx + 14 * hs, hy - 16 * hs], st.crest * hs * 0.9, uid));
    parts.push(hornsFor(e2, P, [hx + 6 * hs, hy - 18 * hs], st.horn * hs * 0.85, uid, look.horn));
    // ear frill
    parts.push(`<path d="M${H(16, -6)} L ${H(38, -20)} L ${H(30, 10)} Z" fill="url(#${uid}wing)" stroke="${P.wingDark}" stroke-width="1"/><path d="M${H(18, -4)} L ${H(34, -16)} M${H(20, 2)} L ${H(31, -2)}" stroke="${P.wingDark}" stroke-width="1" opacity=".5"/>`);
    // skull
    const sn = look.snout ? 8 : 0; // longer snout variant
    const skull = `M${H(22, -4)} C ${H(24, -26)} ${H(6, -34)} ${H(-10, -28)} C ${H(-22, -24)} ${H(-32 - sn * 0.5, -14)} ${H(-48 - sn, -2)} C ${H(-54 - sn, 2)} ${H(-52 - sn, 8)} ${H(-46 - sn, 10)} L ${H(-24, 12)} C ${H(-16, 24)} ${H(2, 28)} ${H(16, 22)} C ${H(26, 16)} ${H(28, 6)} ${H(22, -4)} Z`;
    parts.push(`<path d="${skull}" fill="url(#${uid}body)" stroke="${P.dark}" stroke-width="1.2" stroke-opacity=".6"/>`);
    parts.push(`<path d="${skull}" fill="url(#${uid}scales)" opacity=".8"/>`);
    // mouth: a slightly open jaw line with a dark interior and teeth
    parts.push(`<path d="M${H(-46 - sn, 9)} C ${H(-38 - sn, 14)} ${H(-30, 15)} ${H(-20, 13)} C ${H(-30, 11)} ${H(-40 - sn, 10)} ${H(-46 - sn, 9)} Z" fill="${shade(P.deep, -20)}"/>`);
    parts.push(`<path d="M${H(-46 - sn, 9)} C ${H(-36 - sn, 12)} ${H(-28, 13)} ${H(-20, 13)}" fill="none" stroke="${P.deep}" stroke-width="1.2" stroke-opacity=".8"/>`);
    parts.push(`<path d="M${H(-41 - sn, 10)} l 2 5 l 2.5 -5 Z M${H(-33 - sn * 0.6, 11.5)} l 2 5 l 2.5 -5 Z M${H(-26, 12.5)} l 1.5 4 l 2 -4 Z" fill="#fff"/>`);
    // chin / throat plate
    parts.push(`<path d="M${H(-20, 13)} C ${H(-12, 22)} ${H(2, 25)} ${H(14, 20)} C ${H(8, 16)} ${H(-8, 15)} ${H(-20, 13)} Z" fill="url(#${uid}belly)" opacity=".7"/>`);
    // nostril
    parts.push(`<path d="M${H(-44 - sn, 2)} q 3 -2 5 1 q -3 2 -5 -1 Z" fill="${P.deep}"/>`);
    // brow ridge
    parts.push(`<path d="M${H(-14, -12)} Q ${H(0, -22)} ${H(16, -14)}" fill="none" stroke="${P.dark}" stroke-width="${f1(3.5 * hs)}" stroke-linecap="round" opacity=".8"/>`);
    // eye
    const ex = -2, ey = -6;
    parts.push(`<path d="M${H(ex - 11, ey)} Q ${H(ex, ey - 9)} ${H(ex + 11, ey)} Q ${H(ex, ey + 8)} ${H(ex - 11, ey)} Z" fill="#fff" stroke="${P.deep}" stroke-width="1"/>`);
    parts.push(`<circle cx="${f1(hx + ex * hs)}" cy="${f1(hy + ey * hs)}" r="${f1(6 * hs)}" fill="url(#${uid}iris)"/>`);
    parts.push(`<ellipse cx="${f1(hx + ex * hs)}" cy="${f1(hy + ey * hs)}" rx="${f1(2 * hs)}" ry="${f1(5.5 * hs)}" fill="#0a0612"/>`);
    parts.push(`<circle cx="${f1(hx + (ex - 3) * hs)}" cy="${f1(hy + (ey - 3.5) * hs)}" r="${f1(1.8 * hs)}" fill="#fff"/>`);
    if (e1 === 'dark') parts.push(`<circle cx="${f1(hx + ex * hs)}" cy="${f1(hy + ey * hs)}" r="${f1(9 * hs)}" fill="#ff2d55" opacity=".35" filter="url(#${uid}soft)"/>`);
    if (s === 0) parts.push(`<circle cx="${f1(hx - 24 * hs)}" cy="${f1(hy + 4 * hs)}" r="${f1(5 * hs)}" fill="#ff8a9e" opacity=".45" filter="url(#${uid}soft)"/>`);
    // cheek spikes
    parts.push(`<path d="M${H(10, 10)} l 14 6 l -12 6 Z M${H(14, 2)} l 14 0 l -10 8 Z" fill="url(#${uid}horn)" stroke="${P.hornDark}" stroke-width=".8"/>`);
    // specular highlight
    parts.push(`<path d="M${H(-30, -20)} Q ${H(-12, -30)} ${H(4, -26)}" fill="none" stroke="#fff" stroke-width="${f1(3 * hs)}" stroke-linecap="round" opacity=".28"/>`);
    // halo / crowns
    if (e1 === 'light' || (e2 === 'light' && e1 !== 'legend')) parts.push(`<ellipse cx="${f1(hx + 2 * hs)}" cy="${f1(hy - 40 * hs)}" rx="${f1(24 * hs)}" ry="${f1(6 * hs)}" fill="none" stroke="#ffe27a" stroke-width="4" opacity=".9" filter="url(#${uid}glowf)"/>`);
    if (legendary) {
      const cc = mythic ? '#ff7ae0' : '#ffd54f', cd = mythic ? '#a3127f' : '#b8860b';
      parts.push(`<g transform="translate(${f1(hx + 2 * hs)} ${f1(hy - 30 * hs)}) scale(${f1(hs)})"><path d="M-18 6 L -14 -12 L -6 -2 L 0 -16 L 6 -2 L 14 -12 L 18 6 Z" fill="url(#${uid}gold)" stroke="${cd}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="0" cy="-6" r="3" fill="${mythic ? '#fff' : '#ff5fa2'}"/><circle cx="-10" cy="0" r="2" fill="${cc}"/><circle cx="10" cy="0" r="2" fill="${cc}"/></g>`);
    }
  }

  // --- element ambience ---
  if (e1 === 'fire') {
    parts.push(`<g filter="url(#${uid}glowf)" opacity=".8">${[[60, 30], [200, 60], [90, 20], [215, 150]].map(([x, y], i) => `<circle cx="${x}" cy="${y + (i % 2) * 8}" r="${2 + (i % 3)}" fill="#ffab40"/>`).join('')}</g>`);
  } else if (e1 === 'electric') {
    parts.push(`<path d="M50 40 l 6 -10 l -4 0 l 7 -12 M200 70 l -6 10 l 4 0 l -7 12" fill="none" stroke="#fff176" stroke-width="2" stroke-linecap="round" filter="url(#${uid}glowf)"/>`);
  } else if (e1 === 'ice') {
    parts.push(`<g opacity=".8">${[[52, 44], [206, 78], [78, 28]].map(([x, y]) => `<path d="M${x} ${y - 6} v12 M${x - 6} ${y} h12 M${x - 4} ${y - 4} l8 8 M${x + 4} ${y - 4} l-8 8" stroke="#e1f5fe" stroke-width="1.4" stroke-linecap="round"/>`).join('')}</g>`);
  } else if (e1 === 'light') {
    parts.push(`<g fill="#fff" opacity=".9">${[[48, 40, 5], [206, 64, 4], [86, 24, 3], [214, 150, 4]].map(([x, y, r]) => `<path d="M${x} ${y - r} L ${x + r * 0.35} ${y - r * 0.35} L ${x + r} ${y} L ${x + r * 0.35} ${y + r * 0.35} L ${x} ${y + r} L ${x - r * 0.35} ${y + r * 0.35} L ${x - r} ${y} L ${x - r * 0.35} ${y - r * 0.35} Z"/>`).join('')}</g>`);
  } else if (e1 === 'dark') {
    parts.push(`<g opacity=".5" filter="url(#${uid}blur)"><ellipse cx="${f1(bodyC[0] + 30)}" cy="${f1(bodyC[1] - 60)}" rx="18" ry="8" fill="#3d1a7a"/><ellipse cx="${f1(headC[0] - 30)}" cy="${f1(headC[1] - 30)}" rx="14" ry="6" fill="#3d1a7a"/></g>`);
  } else if (e1 === 'nature') {
    parts.push(`<g opacity=".9">${[[56, 48], [200, 66], [88, 26]].map(([x, y]) => `<path d="M${x} ${y} c -6 -6 -4 -14 4 -16 c 4 8 2 14 -4 16 Z" fill="#8bc34a" stroke="#33691e" stroke-width=".8"/>`).join('')}</g>`);
  } else if (e1 === 'water') {
    parts.push(`<g opacity=".7">${[[54, 44, 3], [204, 70, 2.5], [84, 30, 2]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e1f5fe" stroke="#4fc3f7" stroke-width="1"/>`).join('')}</g>`);
  }

  const flip = opts.facing === 'right' ? `transform="translate(240 0) scale(-1 1)"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 240 240"><defs>${defs.join('')}</defs><g ${flip}>${parts.join('')}</g></svg>`;
}

// ---------- eggs ----------
export function eggSVG(speciesId, opts = {}) {
  const sp = DRAGONS[speciesId];
  const size = opts.size || 120;
  const P = palette(sp);
  const uid = `e${speciesId}`;
  const spots = P.E2 ? P.E2.color : P.dark;
  const glow = sp.rarity === 'legendary' || sp.rarity === 'epic' || sp.rarity === 'mythic';
  const auraCol = RARITY[sp.rarity].color;
  const eggPath = 'M50 6 C 24 6 10 40 10 70 C 10 96 28 114 50 114 C 72 114 90 96 90 70 C 90 40 76 6 50 6 Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.2}" viewBox="0 0 100 120"><defs>
<radialGradient id="${uid}g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${mix(P.light, '#fff', 0.3)}"/><stop offset=".45" stop-color="${P.base}"/><stop offset="1" stop-color="${P.deep}"/></radialGradient>
<radialGradient id="${uid}a"><stop offset="0" stop-color="${auraCol}" stop-opacity=".55"/><stop offset="1" stop-color="${auraCol}" stop-opacity="0"/></radialGradient>
<clipPath id="${uid}c"><path d="${eggPath}"/></clipPath>
<filter id="${uid}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>
<pattern id="${uid}s" width="8" height="6" patternUnits="userSpaceOnUse"><path d="M0 6 a4 4 0 0 1 8 0 M-4 3 a4 4 0 0 1 8 0 M4 3 a4 4 0 0 1 8 0" fill="none" stroke="#000" stroke-opacity=".1"/></pattern></defs>
${glow ? `<ellipse cx="50" cy="64" rx="50" ry="58" fill="url(#${uid}a)"/>` : ''}
<ellipse cx="50" cy="112" rx="34" ry="6" fill="#000" opacity=".3" filter="url(#${uid}b)"/>
<path d="${eggPath}" fill="url(#${uid}g)"/>
<path d="${eggPath}" fill="url(#${uid}s)"/>
<g clip-path="url(#${uid}c)" opacity=".85"><circle cx="58" cy="44" r="9" fill="${spots}"/><circle cx="38" cy="78" r="8" fill="${spots}"/><circle cx="66" cy="86" r="6" fill="${spots}"/><circle cx="50" cy="100" r="4" fill="${spots}"/><circle cx="30" cy="52" r="5" fill="${spots}"/>
${sp.elements.length > 2 ? `<circle cx="72" cy="64" r="5" fill="${ELEMENTS[sp.elements[2]].color}"/><circle cx="36" cy="30" r="4" fill="${ELEMENTS[sp.elements[2]].color}"/>` : ''}
${sp.elements.length > 3 ? `<circle cx="22" cy="72" r="4" fill="${ELEMENTS[sp.elements[3]].color}"/><circle cx="60" cy="20" r="3.5" fill="${ELEMENTS[sp.elements[3]].color}"/>` : ''}</g>
<path d="M30 30 C 24 42 22 56 24 72" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".35" filter="url(#${uid}b)"/>
<path d="${eggPath}" fill="none" stroke="${P.deep}" stroke-width="1.2" stroke-opacity=".5"/>
</svg>`;
}

// A mystery egg for undiscovered breeding results.
export function mysteryEggSVG(size = 120) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.2}" viewBox="0 0 100 120"><defs><radialGradient id="mysg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#9aa0b4"/><stop offset=".5" stop-color="#5f6478"/><stop offset="1" stop-color="#2b2e3c"/></radialGradient></defs>
<ellipse cx="50" cy="112" rx="34" ry="6" fill="#000" opacity=".3"/>
<path d="M50 6 C 24 6 10 40 10 70 C 10 96 28 114 50 114 C 72 114 90 96 90 70 C 90 40 76 6 50 6 Z" fill="url(#mysg)" stroke="#1d1f28" stroke-width="1.5"/>
<text x="50" y="80" text-anchor="middle" font-size="44" font-weight="700" fill="#e8e9f0" font-family="Arial">?</text></svg>`;
}
