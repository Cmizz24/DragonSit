// Art dispatcher: 3D-rendered sprites (Three.js) with the SVG art as a fallback.
import { loadThree, sprite, spriteUrl, lookCamera, isoCamera, hasWebGL } from './three/engine.js';
import { buildDragon } from './three/dragonModel.js';
import { buildBuilding } from './three/buildingModel.js';
import { dragonSVG } from './dragon.js';
import { buildingSVG, buildingKey, imageSize } from './buildings.js';
import { getImage } from './cache.js';
import { BUILDINGS } from '../data/buildings.js';

export const art = { mode: 'svg', ready: false };
const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export async function initArt() {
  if (!hasWebGL()) return art.mode;
  try {
    const T = await loadThree();
    if (T) {
      art.mode = '3d';
      art.ready = true;
      startHydration();
    }
  } catch (err) {
    console.warn('3D art unavailable, using SVG', err);
  }
  return art.mode;
}

// ---------- dragons ----------
function dragonSpec(species, stage, facing, stars, size) {
  const d = buildDragon(species, stage, { stars, shadows: true });
  const target = d.bounds.center;
  const dist = (stage === 'baby' ? 7.2 : stage === 'young' ? 8.6 : 10.2);
  const az = facing === 'right' ? 50 : -50;
  const cam = lookCamera(size, size, [target[0] + 0.25, target[1] + 0.15, 0], dist, az, 14, 30);
  return { object: d.group, camera: cam, w: size, h: size, opts: { shadowPlane: true, shadowY: 0, lightFromCamera: true } };
}

// Image element for the canvas map.
export function dragonImage(species, stage, facing = 'left', stars = 0) {
  if (art.mode === '3d') return sprite(`d3|${species}|${stage}|${facing}|${stars}|192`, () => dragonSpec(species, stage, facing, stars, 192));
  return getImage(`drg|${species}|${stage}|${facing}`, () => dragonSVG(species, stage, { size: 160, facing }));
}

// HTML for lists and dialogs. In 3D mode the image is filled in lazily (see hydration below).
export function dragonImgHtml(species, stage, { size = 72, facing = 'left', cls = '', stars = 0, eager = false } = {}) {
  if (art.mode !== '3d') return dragonSVG(species, stage, { size, facing });
  const res = size > 100 ? 384 : 192;
  const key = `d3|${species}|${stage}|${facing}|${stars}|${res}`;
  if (eager) return `<img class="dimg ${cls}" width="${size}" height="${size}" src="${spriteUrl(key, () => dragonSpec(species, stage, facing, stars, res))}" alt="">`;
  return `<img class="dimg ${cls} pending" width="${size}" height="${size}" src="${PLACEHOLDER}" data-d3="${key}" alt="">`;
}

// ---------- buildings ----------
function buildingSpec(b, extra) {
  const def = BUILDINGS[b.def];
  const size = def.size;
  const { w, h } = imageSize(size);
  const scale = 2;
  const model = buildBuilding(b, extra);
  const worldWidth = size * Math.SQRT2;
  const worldHeight = worldWidth * (h / w);
  const shift = worldHeight / 2 - (size * Math.SQRT2) / 4 - 0.04;
  const cam = isoCamera(w * scale, h * scale, worldWidth, [0, 0, 0], shift);
  return { object: model, camera: cam, w: w * scale, h: h * scale, opts: { shadowPlane: true, shadowY: 0, lightFromCamera: true } };
}

export function buildingImage(b, extra = {}) {
  const key = buildingKey(b, extra);
  if (art.mode === '3d') return sprite('b3|' + key, () => buildingSpec(b, extra));
  return getImage('bld|' + key, () => buildingSVG(b, extra));
}

export function buildingImgHtml(b, extra = {}, { eager = false } = {}) {
  if (art.mode !== '3d') return buildingSVG(b, extra);
  const key = 'b3|' + buildingKey(b, extra);
  const { w, h } = imageSize(BUILDINGS[b.def].size);
  if (eager) return `<img class="bimg" src="${spriteUrl(key, () => buildingSpec(b, extra))}" width="${w}" height="${h}" alt="">`;
  return `<img class="bimg pending" src="${PLACEHOLDER}" width="${w}" height="${h}" data-b3="${JSON.stringify({ def: b.def, level: b.level || 1, extra }).replace(/"/g, '&quot;')}" alt="">`;
}

// ---------- lazy hydration of <img data-d3 / data-b3> ----------
let hydrating = false;
function startHydration() {
  if (hydrating) return;
  hydrating = true;
  const pending = new Set();
  const collect = (root) => {
    if (!root.querySelectorAll) return;
    root.querySelectorAll('img[data-d3], img[data-b3]').forEach((img) => pending.add(img));
    if (root.matches && (root.matches('img[data-d3]') || root.matches('img[data-b3]'))) pending.add(root);
  };
  const obs = new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes) collect(n);
    schedule();
  });
  obs.observe(document.body, { childList: true, subtree: true });
  collect(document.body);
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(step);
  };
  const step = () => {
    scheduled = false;
    let n = 0;
    for (const img of [...pending]) {
      if (!img.isConnected) { pending.delete(img); continue; }
      if (n >= 3) break;
      try {
        if (img.dataset.d3) {
          const [, species, stage, facing, stars, res] = img.dataset.d3.split('|');
          img.src = spriteUrl(img.dataset.d3, () => dragonSpec(species, stage, facing, +stars, +res));
        } else if (img.dataset.b3) {
          const spec = JSON.parse(img.dataset.b3);
          img.src = spriteUrl('b3|' + buildingKey({ def: spec.def, level: spec.level }, spec.extra), () => buildingSpec({ def: spec.def, level: spec.level }, spec.extra));
        }
      } catch (err) {
        console.warn('sprite failed', err);
      }
      img.classList.remove('pending');
      delete img.dataset.d3;
      delete img.dataset.b3;
      pending.delete(img);
      n++;
    }
    if (pending.size) schedule();
  };
  schedule();
}
