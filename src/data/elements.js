// Element definitions: colours drive the procedural art, `strong` drives battle damage.

export const ELEMENT_ORDER = ['fire', 'earth', 'water', 'nature', 'electric', 'ice', 'metal', 'dark', 'light', 'legend'];

export const ELEMENTS = {
  fire: {
    id: 'fire', name: 'Fire', color: '#ff6a2f', light: '#ffc49a', dark: '#a8290c', eye: '#ffe066',
    strong: ['nature', 'ice'], unlock: 1, desc: 'Hot-headed and fierce. Strong against Nature and Ice.',
  },
  earth: {
    id: 'earth', name: 'Earth', color: '#c9903f', light: '#f0d3a0', dark: '#7a4f1c', eye: '#5ad35a',
    strong: ['electric', 'metal'], unlock: 1, desc: 'Sturdy and calm. Strong against Electric and Metal.',
  },
  water: {
    id: 'water', name: 'Water', color: '#3f9dff', light: '#bfe3ff', dark: '#174f9e', eye: '#ffe9a8',
    strong: ['fire', 'earth'], unlock: 2, desc: 'Playful and swift. Strong against Fire and Earth.',
  },
  nature: {
    id: 'nature', name: 'Nature', color: '#57c24a', light: '#c7f2b0', dark: '#2a7020', eye: '#ffd54a',
    strong: ['water', 'electric'], unlock: 3, desc: 'Gentle growers. Strong against Water and Electric.',
  },
  electric: {
    id: 'electric', name: 'Electric', color: '#ffd53a', light: '#fff4b8', dark: '#b58a00', eye: '#4fc3ff',
    strong: ['water', 'metal'], unlock: 4, desc: 'Buzzing with energy. Strong against Water and Metal.',
  },
  ice: {
    id: 'ice', name: 'Ice', color: '#8fe4ff', light: '#e6fbff', dark: '#2f8fb8', eye: '#5a4bff',
    strong: ['nature', 'earth'], unlock: 5, desc: 'Cool and collected. Strong against Nature and Earth.',
  },
  metal: {
    id: 'metal', name: 'Metal', color: '#aab5c3', light: '#e4e9ef', dark: '#5a6674', eye: '#ff7a3a',
    strong: ['ice', 'nature'], unlock: 6, desc: 'Armoured and proud. Strong against Ice and Nature.',
  },
  dark: {
    id: 'dark', name: 'Dark', color: '#8a5cf0', light: '#d4c2ff', dark: '#3d2380', eye: '#ff4d6d',
    strong: ['light', 'electric'], unlock: 7, desc: 'Mysterious night-dwellers. Strong against Light and Electric.',
  },
  light: {
    id: 'light', name: 'Light', color: '#fff0a6', light: '#fffce6', dark: '#c9a83a', eye: '#3a8bff',
    strong: ['dark', 'metal'], unlock: 8, desc: 'Radiant and kind. Strong against Dark and Metal.',
  },
  legend: {
    id: 'legend', name: 'Legend', color: '#ffb02e', light: '#ffe7b0', dark: '#9a5a00', eye: '#ff2e9a',
    strong: ['fire', 'earth', 'water', 'nature', 'electric', 'ice', 'metal', 'dark', 'light'], unlock: 10,
    desc: 'Mythical beings of immense power. Strong against every element.',
  },
};

export function el(id) {
  return ELEMENTS[id];
}

// Damage multiplier of an attack element against a defender's element list.
export function elementMultiplier(attackEl, defenderEls) {
  const atk = ELEMENTS[attackEl];
  if (!atk) return 1;
  if (attackEl === 'legend') {
    return defenderEls.includes('legend') ? 1 : 1.5;
  }
  if (defenderEls.some((d) => atk.strong.includes(d))) return 2;
  if (defenderEls.some((d) => ELEMENTS[d] && ELEMENTS[d].strong.includes(attackEl))) return 0.5;
  return 1;
}

function gearPath() {
  const pts = [];
  const teeth = 8;
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? 10 : 7.5;
    const a1 = (i / (teeth * 2)) * Math.PI * 2 - Math.PI / 2;
    const a2 = ((i + 1) / (teeth * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(12 + Math.cos(a1) * r).toFixed(2)},${(12 + Math.sin(a1) * r).toFixed(2)}`);
    pts.push(`${(12 + Math.cos(a2) * r).toFixed(2)},${(12 + Math.sin(a2) * r).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z M12,9 a3,3 0 1,0 0.001,0 Z`;
}

const ICON_PATHS = {
  fire: '<path d="M12 22c-4.2 0-7-2.9-7-6.8 0-2.9 1.7-4.9 3-7 .2 1.9 1 3 2.2 3.3C10 8.4 10.8 5 14 2c-.8 3 .2 4.9 1.9 6.8C17.3 10.3 19 12.4 19 15.2 19 19.1 16.2 22 12 22z"/>',
  earth: '<path d="M3 19l3.5-8.5L11 5l6 2.5 3 5.5 1 6z"/><path d="M8 19l2.5-6 4-1.5L17 19z" opacity=".35" fill="#000"/>',
  water: '<path d="M12 2C8.5 7.5 6 10.7 6 14.3A6 6 0 0 0 18 14.3C18 10.7 15.5 7.5 12 2z"/>',
  nature: '<path d="M4 20C4 10.5 10.5 4 21 3.5 20.5 14 14 20 4 20z"/><path d="M5 19L17 7" stroke="#000" stroke-opacity=".35" stroke-width="1.6" fill="none"/>',
  electric: '<path d="M13.5 2 4 14h6.5L9 22l10-12.5h-6.3z"/>',
  ice: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M9 4l3 2 3-2M9 20l3-2 3 2M4 10l3-1 .5 3M20 10l-3-1-.5 3M4 14l3 1 .5-3M20 14l-3 1-.5-3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  metal: `<path fill-rule="evenodd" d="${gearPath()}"/>`,
  dark: '<path d="M14.5 2.5A9.5 9.5 0 1 0 21.5 15 7.5 7.5 0 0 1 14.5 2.5z"/>',
  light: '<path d="M12 1.5l2.6 6.9 7.4.5-5.7 4.7 1.9 7.1L12 16.8l-6.2 3.9 1.9-7.1L2 8.9l7.4-.5z"/>',
  legend: '<path d="M2.5 18.5h19L23 6.5l-5.5 4.5L12 3 6.5 11 1 6.5z"/><path d="M2.5 19.5h19v2h-19z"/>',
};

// Inline SVG icon for an element. `size` in px.
export function elementIcon(id, size = 18, color) {
  const e = ELEMENTS[id];
  const fill = color || (e ? e.color : '#fff');
  return `<svg class="elicon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" style="color:${fill}" aria-label="${e ? e.name : id}">${ICON_PATHS[id] || ''}</svg>`;
}

export function elementBadge(id, size = 18) {
  const e = ELEMENTS[id];
  return `<span class="elbadge" style="--el:${e.color}" title="${e.name}">${elementIcon(id, size, '#fff')}</span>`;
}
