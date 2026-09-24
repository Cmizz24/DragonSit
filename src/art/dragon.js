// Procedural SVG dragons. Every species is drawn from its elements + a few "look" variants,
// so the whole roster ships without any image files.
import { ELEMENTS } from '../data/elements.js';
import { DRAGONS, RARITY } from '../data/dragons.js';

const HORN = '#f5e9c9';
const HORN_DARK = '#c9b487';

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// stage: 'baby' | 'young' | 'adult'. facing: 'left' | 'right'.
export function dragonSVG(speciesId, stage = 'adult', opts = {}) {
  const sp = DRAGONS[speciesId];
  const size = opts.size || 200;
  const E1 = ELEMENTS[sp.elements[0]];
  const E2 = sp.elements[1] ? ELEMENTS[sp.elements[1]] : null;
  const E3 = sp.elements[2] ? ELEMENTS[sp.elements[2]] : null;
  const E4 = sp.elements[3] ? ELEMENTS[sp.elements[3]] : null;
  const body = E1.color;
  const belly = E1.light;
  const dark = E1.dark;
  const wingCol = E2 ? E2.color : shade(E1.color, -25);
  const wingBone = E2 ? E2.dark : dark;
  const eye = E1.eye;
  const look = sp.look;
  const s = stage === 'baby' ? 0 : stage === 'young' ? 1 : 2;
  const legendary = sp.rarity === 'legendary' || sp.rarity === 'mythic';
  const mythic = sp.rarity === 'mythic';
  const uid = `g${speciesId}${s}`;
  const parts = [];

  // Geometry that changes with growth stage.
  const bodyRx = [34, 41, 46][s];
  const bodyRy = [30, 36, 40][s];
  const bodyCx = [102, 101, 100][s];
  const bodyCy = [138, 130, 125][s];
  const headR = [38, 35, 33][s];
  const headCx = [70, 65, 62][s];
  const headCy = [96, 88, 82][s];
  const snoutRx = [17, 20, 22][s];
  const snoutRy = [12, 14, 15][s];
  const snoutCx = headCx - headR + [8, 6, 5][s];
  const snoutCy = headCy + [12, 12, 12][s];
  const wingScale = [0.35, 0.72, 1][s];
  const outline = `stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"`;

  if (mythic) {
    parts.push(`<defs><radialGradient id="${uid}aura"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".45" stop-color="${E2 ? E2.color : E1.light}" stop-opacity=".55"/><stop offset="1" stop-color="${E1.color}" stop-opacity="0"/></radialGradient></defs>`);
    parts.push(`<circle cx="100" cy="115" r="98" fill="url(#${uid}aura)"/>`);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      parts.push(`<path d="M${(100 + Math.cos(a) * 88).toFixed(1)} ${(115 + Math.sin(a) * 88).toFixed(1)} l 4 -6 l 4 6 l -4 6 Z" fill="#fff" opacity=".9"/>`);
    }
  } else if (legendary) {
    parts.push(`<defs><radialGradient id="${uid}aura"><stop offset="0" stop-color="${E1.light}" stop-opacity=".9"/><stop offset="1" stop-color="${E1.color}" stop-opacity="0"/></radialGradient></defs>`);
    parts.push(`<circle cx="100" cy="115" r="92" fill="url(#${uid}aura)"/>`);
  } else if (sp.rarity === 'epic') {
    parts.push(`<defs><radialGradient id="${uid}aura"><stop offset="0" stop-color="${E3 ? E3.color : E1.light}" stop-opacity=".45"/><stop offset="1" stop-color="${E1.color}" stop-opacity="0"/></radialGradient></defs>`);
    parts.push(`<circle cx="100" cy="118" r="86" fill="url(#${uid}aura)"/>`);
  }

  // --- wings ---
  const wing = (x, y, sc, col, bone, back) => {
    const style = look.wing;
    let membrane, bones;
    if (style === 1) {
      // feathered
      membrane = `M0 0 Q 22 -45 62 -66 Q 70 -40 60 -22 Q 66 -8 52 2 Q 50 14 36 16 Q 28 24 14 18 Z`;
      bones = `M0 0 Q 22 -45 62 -66`;
    } else if (style === 2) {
      // angular fin
      membrane = `M0 0 L 20 -50 L 60 -70 L 64 -44 L 56 -20 L 50 6 L 30 18 Z`;
      bones = `M0 0 L 60 -70 M0 0 L 56 -20 M0 0 L 50 6`;
    } else {
      // classic bat wing
      membrane = `M0 0 Q 18 -48 60 -68 L 66 -40 Q 58 -30 52 -16 Q 46 -6 40 6 Q 32 12 22 16 Z`;
      bones = `M0 0 L 60 -68 M0 0 L 52 -16 M0 0 L 40 6`;
    }
    return `<g transform="translate(${x} ${y}) scale(${sc})" opacity="${back ? 0.8 : 1}"><path d="${membrane}" fill="${col}" ${outline}/><path d="${bones}" fill="none" stroke="${bone}" stroke-width="4" stroke-linecap="round"/></g>`;
  };
  if (s > 0) parts.push(wing(bodyCx + 8, bodyCy - bodyRy + 18, wingScale * 0.8, shade(wingCol, -30), wingBone, true));

  // --- tail ---
  const tx = bodyCx + bodyRx - 12;
  const ty = bodyCy + 6;
  const tailLen = [0.6, 0.85, 1][s];
  const tailPath = `M${tx} ${ty} C ${tx + 40 * tailLen} ${ty + 22 * tailLen}, ${tx + 62 * tailLen} ${ty - 6 * tailLen}, ${tx + 50 * tailLen} ${ty - 42 * tailLen}`;
  parts.push(`<path d="${tailPath}" fill="none" stroke="${dark}" stroke-width="${18 * tailLen + 4}" stroke-linecap="round"/>`);
  parts.push(`<path d="${tailPath}" fill="none" stroke="${body}" stroke-width="${18 * tailLen}" stroke-linecap="round"/>`);
  const tipX = tx + 50 * tailLen, tipY = ty - 42 * tailLen;
  const tipScale = [0.6, 0.85, 1][s];
  const tipCol = E2 ? E2.color : (E1.id === 'nature' ? E1.dark : belly);
  let tip = '';
  if (look.tail === 0) tip = `<path d="M0 0 L -12 -16 L 0 -30 L 12 -16 Z" fill="${tipCol}" ${outline}/>`;
  else if (look.tail === 1) tip = `<path d="M0 4 Q -18 -8 -6 -30 Q 14 -16 0 4 Z" fill="${tipCol}" ${outline}/><path d="M-1 0 L -4 -22" stroke="${dark}" stroke-width="2" fill="none"/>`;
  else if (look.tail === 2) tip = `<circle cx="0" cy="-12" r="12" fill="${tipCol}" ${outline}/><circle cx="-4" cy="-16" r="4" fill="${shade(tipCol, 40)}"/>`;
  else tip = `<path d="M0 6 L -16 -14 L -4 -12 L 0 -30 L 4 -12 L 16 -14 Z" fill="${tipCol}" ${outline}/>`;
  parts.push(`<g transform="translate(${tipX} ${tipY}) scale(${tipScale})">${tip}</g>`);

  // --- back leg ---
  const legY = bodyCy + bodyRy - 8;
  parts.push(`<ellipse cx="${bodyCx + bodyRx * 0.55}" cy="${legY + 6}" rx="${bodyRx * 0.34}" ry="${bodyRy * 0.3}" fill="${shade(body, -18)}" ${outline}/>`);

  // --- body ---
  parts.push(`<ellipse cx="${bodyCx}" cy="${bodyCy}" rx="${bodyRx}" ry="${bodyRy}" fill="${body}" ${outline}/>`);
  parts.push(`<ellipse cx="${bodyCx - bodyRx * 0.2}" cy="${bodyCy + bodyRy * 0.22}" rx="${bodyRx * 0.62}" ry="${bodyRy * 0.62}" fill="${belly}"/>`);
  // belly lines
  for (let i = 0; i < 3; i++) {
    const yy = bodyCy + bodyRy * (0.05 + i * 0.22);
    parts.push(`<path d="M${bodyCx - bodyRx * 0.62} ${yy} Q ${bodyCx - bodyRx * 0.2} ${yy + 5} ${bodyCx + bodyRx * 0.3} ${yy}" fill="none" stroke="${shade(belly, -30)}" stroke-width="1.6" opacity=".6"/>`);
  }

  // --- element body decorations ---
  const e1 = E1.id;
  if (e1 === 'metal' || (E2 && E2.id === 'metal')) {
    const mc = e1 === 'metal' ? E1 : E2;
    parts.push(`<path d="M${bodyCx - 6} ${bodyCy - bodyRy + 6} Q ${bodyCx + 20} ${bodyCy - bodyRy + 2} ${bodyCx + bodyRx - 4} ${bodyCy - 4} Q ${bodyCx + 22} ${bodyCy + 4} ${bodyCx - 6} ${bodyCy - bodyRy + 6} Z" fill="${mc.light}" stroke="${mc.dark}" stroke-width="2"/>`);
    parts.push(`<circle cx="${bodyCx + 12}" cy="${bodyCy - bodyRy + 14}" r="2.5" fill="${mc.dark}"/><circle cx="${bodyCx + 28}" cy="${bodyCy - bodyRy + 22}" r="2.5" fill="${mc.dark}"/>`);
  }
  if (e1 === 'earth' || (E2 && E2.id === 'earth')) {
    const ec = e1 === 'earth' ? E1 : E2;
    parts.push(`<circle cx="${bodyCx + 14}" cy="${bodyCy - bodyRy + 12}" r="7" fill="${ec.dark}"/><circle cx="${bodyCx + 30}" cy="${bodyCy - bodyRy + 24}" r="5" fill="${ec.dark}"/><circle cx="${bodyCx + 2}" cy="${bodyCy - bodyRy + 6}" r="4" fill="${ec.dark}"/>`);
  }
  if (E3) {
    [[10, -10, 6], [26, 4, 5], [16, 12, 4], [-2, -18, 4]].forEach(([dx, dy, r], i) => {
      const col = E4 && i % 2 === 1 ? E4.color : E3.color;
      parts.push(`<circle cx="${bodyCx + dx}" cy="${bodyCy + dy}" r="${r}" fill="${col}" opacity=".85"/>`);
    });
  } else if (E2 && !['metal', 'earth'].includes(E2.id)) {
    for (const [dx, dy, r] of [[14, -12, 5], [28, 2, 4], [20, 14, 3.5]]) {
      parts.push(`<circle cx="${bodyCx + dx}" cy="${bodyCy + dy}" r="${r}" fill="${E2.color}" opacity=".8"/>`);
    }
  }

  // --- back spikes / crest ---
  if (s > 0) {
    const spikeCol = E2 ? E2.color : HORN;
    const n = s === 1 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const px = bodyCx - 10 + i * 18;
      const py = bodyCy - bodyRy + 4 + i * 2;
      const h = 12 - i * 2;
      if (look.spikes === 0) parts.push(`<path d="M${px - 7} ${py} L ${px + 2} ${py - h - 4} L ${px + 8} ${py} Z" fill="${spikeCol}" ${outline}/>`);
      else if (look.spikes === 1) parts.push(`<path d="M${px - 7} ${py} Q ${px} ${py - h - 8} ${px + 8} ${py} Z" fill="${spikeCol}" ${outline}/>`);
      else parts.push(`<circle cx="${px}" cy="${py - 2}" r="${h / 2 + 1}" fill="${spikeCol}" ${outline}/>`);
    }
  }

  // --- front leg ---
  parts.push(`<ellipse cx="${bodyCx - bodyRx * 0.5}" cy="${legY + 8}" rx="${bodyRx * 0.3}" ry="${bodyRy * 0.28}" fill="${body}" ${outline}/>`);
  for (let i = 0; i < 3; i++) {
    parts.push(`<path d="M${bodyCx - bodyRx * 0.5 - 10 + i * 8} ${legY + 12} l -3 8 l 8 -2 Z" fill="${HORN}" stroke="${HORN_DARK}" stroke-width="1"/>`);
  }

  // --- front wing ---
  if (s > 0) parts.push(wing(bodyCx + 12, bodyCy - bodyRy + 22, wingScale, wingCol, wingBone, false));
  else parts.push(`<path d="M${bodyCx + 14} ${bodyCy - bodyRy + 20} q 10 -18 22 -12 q -6 12 -18 16 Z" fill="${wingCol}" ${outline}/>`);

  // --- horns (drawn before head so the head overlaps their base) ---
  const hx = headCx + headR * 0.35, hy = headCy - headR * 0.75;
  const hornCol = E2 ? E2.light : HORN;
  const hornOutline = `stroke="${E2 ? E2.dark : HORN_DARK}" stroke-width="2" stroke-linejoin="round"`;
  const hs = [0.6, 0.85, 1][s];
  let horns = '';
  if (e1 === 'electric') horns = `<path d="M-6 0 L 2 -18 L -4 -18 L 8 -38 L 4 -22 L 10 -22 Z" fill="${E1.color}" stroke="${E1.dark}" stroke-width="2"/><path d="M10 6 L 18 -12 L 12 -12 L 24 -32 L 20 -16 L 26 -16 Z" fill="${E1.color}" stroke="${E1.dark}" stroke-width="2"/>`;
  else if (e1 === 'ice') horns = `<path d="M-6 2 L -2 -34 L 8 0 Z" fill="${E1.light}" stroke="${E1.dark}" stroke-width="2"/><path d="M10 6 L 20 -26 L 26 4 Z" fill="${E1.light}" stroke="${E1.dark}" stroke-width="2"/>`;
  else if (e1 === 'nature') horns = `<path d="M-4 2 Q -22 -14 -8 -34 Q 10 -18 -4 2 Z" fill="${E1.color}" stroke="${E1.dark}" stroke-width="2"/><path d="M12 4 Q 6 -18 24 -30 Q 30 -8 12 4 Z" fill="${E1.color}" stroke="${E1.dark}" stroke-width="2"/>`;
  else if (e1 === 'water') horns = `<path d="M-8 4 Q 4 -36 22 -30 Q 26 -8 12 6 Z" fill="${E1.light}" stroke="${E1.dark}" stroke-width="2"/><path d="M0 0 Q 10 -24 20 -22" fill="none" stroke="${E1.dark}" stroke-width="1.5"/>`;
  else if (e1 === 'fire') horns = `<path d="M-6 4 Q -14 -14 -2 -30 Q 2 -16 8 -22 Q 12 -8 6 4 Z" fill="${E1.light}" stroke="${E1.dark}" stroke-width="2"/><path d="M12 6 Q 8 -10 18 -26 Q 22 -12 28 -18 Q 30 -6 22 6 Z" fill="${E1.light}" stroke="${E1.dark}" stroke-width="2"/>`;
  else if (look.horn === 0) horns = `<path d="M-6 4 Q -4 -30 12 -34 Q 4 -18 8 2 Z" fill="${hornCol}" ${hornOutline}/><path d="M12 8 Q 16 -22 32 -26 Q 22 -12 24 6 Z" fill="${hornCol}" ${hornOutline}/>`;
  else if (look.horn === 1) horns = `<path d="M-6 2 L -4 -30 L 8 0 Z" fill="${hornCol}" ${hornOutline}/><path d="M10 6 L 18 -24 L 24 4 Z" fill="${hornCol}" ${hornOutline}/>`;
  else if (look.horn === 2) horns = `<circle cx="0" cy="-10" r="9" fill="${hornCol}" ${hornOutline}/><circle cx="18" cy="-4" r="8" fill="${hornCol}" ${hornOutline}/>`;
  else horns = `<path d="M-4 4 Q -26 -6 -14 -26 Q 0 -32 6 -14 Q 2 -4 -4 4 Z" fill="${hornCol}" ${hornOutline}/><path d="M14 8 Q -2 -2 8 -22 Q 22 -28 28 -10 Q 22 0 14 8 Z" fill="${hornCol}" ${hornOutline}/>`;
  parts.push(`<g transform="translate(${hx} ${hy}) scale(${hs})">${horns}</g>`);
  // ear
  parts.push(`<path d="M${headCx + headR * 0.7} ${headCy - headR * 0.3} l 16 -12 l -4 20 Z" fill="${body}" ${outline}/>`);

  // --- head ---
  parts.push(`<circle cx="${headCx}" cy="${headCy}" r="${headR}" fill="${body}" ${outline}/>`);
  parts.push(`<ellipse cx="${snoutCx}" cy="${snoutCy}" rx="${snoutRx}" ry="${snoutRy}" fill="${body}" ${outline}/>`);
  parts.push(`<ellipse cx="${snoutCx}" cy="${snoutCy + 3}" rx="${snoutRx - 4}" ry="${snoutRy - 5}" fill="${belly}"/>`);
  // mouth + nostril
  parts.push(`<path d="M${snoutCx - snoutRx + 4} ${snoutCy + 4} q 8 6 18 3" fill="none" stroke="${dark}" stroke-width="2" stroke-linecap="round"/>`);
  parts.push(`<circle cx="${snoutCx - snoutRx * 0.7}" cy="${snoutCy - 3}" r="2" fill="${dark}"/>`);
  if (look.snout === 1 && s === 2) parts.push(`<path d="M${snoutCx - 4} ${snoutCy + 9} l 3 6 l 3 -6 Z" fill="#fff" stroke="${dark}" stroke-width="1"/>`);

  // --- eye ---
  const ex = headCx - headR * 0.25, ey = headCy - headR * 0.2;
  const er = headR * [0.36, 0.32, 0.3][s];
  parts.push(`<ellipse cx="${ex}" cy="${ey}" rx="${er}" ry="${er * 1.1}" fill="#fff" stroke="${dark}" stroke-width="1.5"/>`);
  parts.push(`<circle cx="${ex - er * 0.15}" cy="${ey + er * 0.1}" r="${er * 0.62}" fill="${eye}"/>`);
  parts.push(`<circle cx="${ex - er * 0.2}" cy="${ey + er * 0.15}" r="${er * 0.32}" fill="#1a1020"/>`);
  parts.push(`<circle cx="${ex - er * 0.45}" cy="${ey - er * 0.35}" r="${er * 0.22}" fill="#fff"/>`);
  if (s === 2) parts.push(`<path d="M${ex - er * 1.2} ${ey - er * 1.25} q ${er * 1.1} -${er * 0.5} ${er * 2.1} ${er * 0.1}" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`);
  if (s === 0) parts.push(`<circle cx="${headCx - headR * 0.55}" cy="${headCy + headR * 0.35}" r="${headR * 0.16}" fill="#ff8aa0" opacity=".55"/>`);

  // --- element extras ---
  if (e1 === 'light' || (E2 && E2.id === 'light' && e1 !== 'legend')) {
    parts.push(`<ellipse cx="${headCx + 4}" cy="${headCy - headR - 10}" rx="${headR * 0.8}" ry="6" fill="none" stroke="#ffe27a" stroke-width="4" opacity=".9"/>`);
  }
  if (e1 === 'dark') {
    parts.push(`<circle cx="${ex - er * 0.15}" cy="${ey + er * 0.1}" r="${er * 0.9}" fill="${E1.color}" opacity=".18"/>`);
  }
  if (legendary) {
    parts.push(`<g transform="translate(${headCx + 6} ${headCy - headR - 2})"><path d="M-18 6 L -14 -14 L -6 -2 L 0 -18 L 6 -2 L 14 -14 L 18 6 Z" fill="#ffd54a" stroke="#b8860b" stroke-width="2"/><circle cx="0" cy="-8" r="3" fill="#ff5fa2"/></g>`);
  }

  const flip = opts.facing === 'right' ? `transform="translate(200 0) scale(-1 1)"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200"><g ${flip}>${parts.join('')}</g></svg>`;
}

export function eggSVG(speciesId, opts = {}) {
  const sp = DRAGONS[speciesId];
  const size = opts.size || 120;
  const E1 = ELEMENTS[sp.elements[0]];
  const E2 = sp.elements[1] ? ELEMENTS[sp.elements[1]] : null;
  const spots = E2 ? E2.color : E1.dark;
  const glow = sp.rarity === 'legendary' || sp.rarity === 'epic';
  const aura = glow ? `<ellipse cx="50" cy="66" rx="48" ry="56" fill="${RARITY[sp.rarity].color}" opacity=".35"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.2}" viewBox="0 0 100 120">${aura}
<path d="M50 6 C 24 6 10 40 10 70 C 10 96 28 114 50 114 C 72 114 90 96 90 70 C 90 40 76 6 50 6 Z" fill="${E1.color}" stroke="${E1.dark}" stroke-width="3"/>
<path d="M32 30 C 26 42 24 56 26 70" fill="none" stroke="${E1.light}" stroke-width="6" stroke-linecap="round" opacity=".7"/>
<circle cx="58" cy="44" r="8" fill="${spots}" opacity=".85"/><circle cx="40" cy="78" r="7" fill="${spots}" opacity=".85"/><circle cx="66" cy="84" r="5" fill="${spots}" opacity=".85"/><circle cx="52" cy="98" r="4" fill="${spots}" opacity=".85"/>
${sp.elements.length > 2 ? `<circle cx="70" cy="62" r="5" fill="${ELEMENTS[sp.elements[2]].color}"/><circle cx="34" cy="52" r="4" fill="${ELEMENTS[sp.elements[2]].color}"/>` : ''}
</svg>`;
}

// A mystery egg for undiscovered breeding results.
export function mysteryEggSVG(size = 120) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.2}" viewBox="0 0 100 120">
<path d="M50 6 C 24 6 10 40 10 70 C 10 96 28 114 50 114 C 72 114 90 96 90 70 C 90 40 76 6 50 6 Z" fill="#6c6f80" stroke="#3b3d4a" stroke-width="3"/>
<text x="50" y="80" text-anchor="middle" font-size="44" font-weight="700" fill="#e8e9f0" font-family="Arial">?</text></svg>`;
}
