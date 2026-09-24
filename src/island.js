// Isometric island renderer + touch input (pan, pinch-zoom, tap, build placement).
import { ISLAND_SIZE, ZONES, zoneAt, BUILDINGS } from './data/buildings.js';
import { TILE_W, TILE_H, TOP, buildingSVG, buildingKey, imageSize, lockSVG } from './art/buildings.js';
import { dragonSVG } from './art/dragon.js';
import { getImage, imageReady, setImageLoadCallback } from './art/cache.js';
import { DRAGONS } from './data/dragons.js';
import { dragonStage, habitatGoldCap } from './economy.js';
import { cellUnlocked, canPlace, buildingAt } from './actions.js';
import { now, clamp, fmt } from './util.js';

const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
const DRAGON_SLOTS = [[0.9, 2.0], [2.1, 1.1], [1.1, 0.9], [2.2, 2.2]];

const ICONS = {
  coin: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="34" r="24" fill="#b8860b"/><circle cx="32" cy="30" r="24" fill="#ffd54f" stroke="#b8860b" stroke-width="3"/><circle cx="32" cy="30" r="15" fill="none" stroke="#f9a825" stroke-width="3"/><text x="32" y="38" text-anchor="middle" font-family="Arial" font-weight="700" font-size="22" fill="#b8860b">G</text></svg>`,
  food: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M32 12 C 18 12 10 24 10 36 C 10 48 20 56 32 56 C 44 56 54 48 54 36 C 54 24 46 12 32 12 Z" fill="#ff7043" stroke="#bf360c" stroke-width="3"/><path d="M32 12 q 2 -8 8 -8" stroke="#558b2f" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M28 8 q -8 -2 -10 6 q 8 2 10 -6 Z" fill="#7cb342"/></svg>`,
  egg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M32 6 C 18 6 10 26 10 40 C 10 52 20 60 32 60 C 44 60 54 52 54 40 C 54 26 46 6 32 6 Z" fill="#fff3e0" stroke="#8d6e63" stroke-width="3"/><path d="M22 28 L 30 36 L 26 44 L 36 40 L 40 48" stroke="#8d6e63" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  heart: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M32 56 C 8 38 6 22 16 14 C 24 8 30 14 32 20 C 34 14 40 8 48 14 C 58 22 56 38 32 56 Z" fill="#ff4081" stroke="#880e4f" stroke-width="3"/></svg>`,
  alert: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#ff5252" stroke="#b71c1c" stroke-width="3"/><text x="32" y="44" text-anchor="middle" font-family="Arial" font-weight="700" font-size="36" fill="#fff">!</text></svg>`,
};

export class Island {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.cam = { x: 0, y: 0, zoom: 0.7 };
    this.pointers = new Map();
    this.pinch = null;
    this.drag = null;
    this.placement = null;
    this.selectedId = null;
    this.floaters = [];
    this.groundCanvas = null;
    this.groundKey = '';
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.lastFrame = 0;
    this.lockImg = getImage('lock', () => lockSVG(64));
    this.iconImgs = {};
    for (const k of Object.keys(ICONS)) this.iconImgs[k] = getImage(`icon_${k}`, () => ICONS[k]);
    setImageLoadCallback(() => (this.dirty = true));
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame((t) => this.frame(t));
  }

  get state() {
    return this.game.state;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.dirty = true;
  }

  // ---------- coordinate helpers ----------
  gridToWorld(gx, gy) {
    return [(gx - gy) * HALF_W, (gx + gy) * HALF_H];
  }

  worldToGrid(wx, wy) {
    return [(wx / HALF_W + wy / HALF_H) / 2, (wy / HALF_H - wx / HALF_W) / 2];
  }

  worldToScreen(wx, wy) {
    return [(wx - this.cam.x) * this.cam.zoom + this.w / 2, (wy - this.cam.y) * this.cam.zoom + this.h / 2];
  }

  screenToWorld(sx, sy) {
    return [(sx - this.w / 2) / this.cam.zoom + this.cam.x, (sy - this.h / 2) / this.cam.zoom + this.cam.y];
  }

  screenToGrid(sx, sy) {
    const [wx, wy] = this.screenToWorld(sx, sy);
    const [gx, gy] = this.worldToGrid(wx, wy);
    return [Math.floor(gx), Math.floor(gy)];
  }

  centerOnZone0() {
    const z = ZONES[0];
    const [wx, wy] = this.gridToWorld(z.x + z.w / 2, z.y + z.h / 2);
    this.cam.x = wx;
    this.cam.y = wy - 20;
    this.cam.zoom = clamp(this.w / (z.w * TILE_W * 1.05), 0.35, 1.2);
    this.dirty = true;
  }

  focusOn(gx, gy, size = 1) {
    const [wx, wy] = this.gridToWorld(gx + size / 2, gy + size / 2);
    this.cam.x = wx;
    this.cam.y = wy;
    this.dirty = true;
  }

  clampCamera() {
    const [minX] = this.gridToWorld(0, ISLAND_SIZE);
    const [maxX] = this.gridToWorld(ISLAND_SIZE, 0);
    const [, minY] = this.gridToWorld(0, 0);
    const [, maxY] = this.gridToWorld(ISLAND_SIZE, ISLAND_SIZE);
    this.cam.x = clamp(this.cam.x, minX, maxX);
    this.cam.y = clamp(this.cam.y, minY - 100, maxY + 100);
    this.cam.zoom = clamp(this.cam.zoom, 0.3, 2.2);
  }

  // ---------- input ----------
  bindInput() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => this.onDown(e));
    c.addEventListener('pointermove', (e) => this.onMove(e));
    c.addEventListener('pointerup', (e) => this.onUp(e));
    c.addEventListener('pointercancel', (e) => this.onUp(e));
    c.addEventListener('pointerleave', (e) => this.onUp(e));
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      this.zoomAt(e.clientX, e.clientY, factor);
    }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  }

  zoomAt(sx, sy, factor) {
    const rect = this.canvas.getBoundingClientRect();
    sx -= rect.left;
    sy -= rect.top;
    const [wx, wy] = this.screenToWorld(sx, sy);
    this.cam.zoom = clamp(this.cam.zoom * factor, 0.3, 2.2);
    const [nx, ny] = this.screenToWorld(sx, sy);
    this.cam.x += wx - nx;
    this.cam.y += wy - ny;
    this.clampCamera();
    this.dirty = true;
  }

  local(e) {
    const rect = this.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  onDown(e) {
    this.canvas.setPointerCapture && this.canvas.setPointerCapture(e.pointerId);
    const [x, y] = this.local(e);
    this.pointers.set(e.pointerId, { x, y });
    if (this.pointers.size === 1) {
      this.drag = { startX: x, startY: y, lastX: x, lastY: y, t: now(), moved: false, camX: this.cam.x, camY: this.cam.y };
      if (this.placement) {
        const [gx, gy] = this.screenToGrid(x, y);
        const p = this.placement;
        const inside = gx >= p.gx && gx < p.gx + p.size && gy >= p.gy && gy < p.gy + p.size;
        this.drag.ghost = inside;
        if (inside) this.drag.ghostOffset = [gx - p.gx, gy - p.gy];
      }
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: [(a.x + b.x) / 2, (a.y + b.y) / 2], zoom: this.cam.zoom };
      this.drag = null;
    }
  }

  onMove(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const [x, y] = this.local(e);
    this.pointers.set(e.pointerId, { x, y });
    if (this.pointers.size >= 2 && this.pinch) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      const [wx, wy] = this.screenToWorld(this.pinch.mid[0], this.pinch.mid[1]);
      this.cam.zoom = clamp(this.pinch.zoom * (dist / Math.max(1, this.pinch.dist)), 0.3, 2.2);
      const [nx, ny] = this.screenToWorld(mid[0], mid[1]);
      this.cam.x += wx - nx;
      this.cam.y += wy - ny;
      this.pinch.mid = mid;
      this.pinch.dist = dist;
      this.pinch.zoom = this.cam.zoom;
      this.clampCamera();
      this.dirty = true;
      return;
    }
    const d = this.drag;
    if (!d) return;
    const dx = x - d.startX, dy = y - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > 8) d.moved = true;
    if (!d.moved) return;
    if (d.ghost && this.placement) {
      const [gx, gy] = this.screenToGrid(x, y);
      this.setPlacementPos(gx - d.ghostOffset[0], gy - d.ghostOffset[1]);
    } else {
      this.cam.x = d.camX - dx / this.cam.zoom;
      this.cam.y = d.camY - dy / this.cam.zoom;
      this.clampCamera();
    }
    d.lastX = x;
    d.lastY = y;
    this.dirty = true;
  }

  onUp(e) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    const d = this.drag;
    if (d && this.pointers.size === 0) {
      this.drag = null;
      if (!d.moved && now() - d.t < 500) this.onTap(d.startX, d.startY);
    }
  }

  onTap(sx, sy) {
    const [gx, gy] = this.screenToGrid(sx, sy);
    if (this.placement) {
      // Tap moves the ghost so its centre lands where you tapped.
      const p = this.placement;
      const inside = gx >= p.gx && gx < p.gx + p.size && gy >= p.gy && gy < p.gy + p.size;
      if (!inside) this.setPlacementPos(gx - Math.floor(p.size / 2), gy - Math.floor(p.size / 2));
      return;
    }
    const b = this.hitBuilding(sx, sy);
    if (b) {
      this.game.onTapBuilding(b);
      return;
    }
    if (gx < 0 || gy < 0 || gx >= ISLAND_SIZE || gy >= ISLAND_SIZE) {
      this.game.onTapEmpty(null);
      return;
    }
    if (!cellUnlocked(this.state, gx, gy)) {
      this.game.onTapLocked(zoneAt(gx, gy));
      return;
    }
    this.game.onTapEmpty([gx, gy]);
  }

  // Hit test buildings by footprint first, then by image bounds so tall buildings are tappable.
  hitBuilding(sx, sy) {
    const [gx, gy] = this.screenToGrid(sx, sy);
    const direct = buildingAt(this.state, gx, gy);
    if (direct) return direct;
    const sorted = this.sortedBuildings().reverse();
    for (const b of sorted) {
      const r = this.buildingRect(b);
      const [x0, y0] = this.worldToScreen(r.x, r.y);
      const w = r.w * this.cam.zoom, h = r.h * this.cam.zoom;
      if (sx >= x0 && sx <= x0 + w && sy >= y0 + h * 0.2 && sy <= y0 + h) return b;
    }
    return null;
  }

  // ---------- placement mode ----------
  startPlacement(defId, building = null) {
    const def = BUILDINGS[defId];
    let gx, gy;
    if (building) {
      gx = building.x;
      gy = building.y;
    } else {
      const [cx, cy] = this.worldToGrid(this.cam.x, this.cam.y);
      gx = Math.round(cx - def.size / 2);
      gy = Math.round(cy - def.size / 2);
    }
    this.placement = { def: defId, size: def.size, gx, gy, building, valid: false };
    if (!building) {
      // Spiral out from the camera centre to find a free spot.
      const ignore = null;
      let found = null;
      for (let r = 0; r <= 8 && !found; r++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          for (let dy = -r; dy <= r && !found; dy++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            if (canPlace(this.state, def.size, gx + dx, gy + dy, ignore)) found = [gx + dx, gy + dy];
          }
        }
      }
      if (found) [gx, gy] = found;
    }
    this.setPlacementPos(gx, gy);
    this.selectedId = null;
  }

  setPlacementPos(gx, gy) {
    const p = this.placement;
    if (!p) return;
    p.gx = clamp(gx, 0, ISLAND_SIZE - p.size);
    p.gy = clamp(gy, 0, ISLAND_SIZE - p.size);
    p.valid = canPlace(this.state, p.size, p.gx, p.gy, p.building ? p.building.id : null);
    this.dirty = true;
    if (this.game.onPlacementChange) this.game.onPlacementChange(p);
  }

  cancelPlacement() {
    this.placement = null;
    this.dirty = true;
  }

  // ---------- floating text ----------
  floatText(gx, gy, text, color = '#ffd54f') {
    const [wx, wy] = this.gridToWorld(gx, gy);
    this.floaters.push({ wx, wy, text, color, t0: now() });
    this.dirty = true;
  }

  // ---------- rendering ----------
  frame(t) {
    requestAnimationFrame((tt) => this.frame(tt));
    if (document.hidden) return;
    if (t - this.lastFrame < 1000 / 60) return;
    this.lastFrame = t;
    this.render(t);
  }

  buildGround() {
    const key = this.state.island.zones.join(',');
    if (this.groundCanvas && this.groundKey === key) return;
    this.groundKey = key;
    const scale = 2;
    const [minX] = this.gridToWorld(0, ISLAND_SIZE);
    const [maxX] = this.gridToWorld(ISLAND_SIZE, 0);
    const [, minY] = this.gridToWorld(0, 0);
    const [, maxY] = this.gridToWorld(ISLAND_SIZE, ISLAND_SIZE);
    const pad = 40;
    const w = (maxX - minX + pad * 2), h = (maxY - minY + pad * 2 + 30);
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * scale);
    cv.height = Math.ceil(h * scale);
    const g = cv.getContext('2d');
    g.scale(scale, scale);
    g.translate(-minX + pad, -minY + pad);
    this.groundOrigin = [minX - pad, minY - pad];
    const unlocked = (x, y) => cellUnlocked(this.state, x, y);
    // cliff sides under unlocked tiles that border water on the bottom edges
    for (let gy = 0; gy < ISLAND_SIZE; gy++) {
      for (let gx = 0; gx < ISLAND_SIZE; gx++) {
        if (!unlocked(gx, gy)) continue;
        const [tx, ty] = this.gridToWorld(gx, gy);
        const depth = 22;
        if (!unlocked(gx, gy + 1)) {
          g.fillStyle = '#8b6b3e';
          g.beginPath();
          g.moveTo(tx - HALF_W, ty + HALF_H);
          g.lineTo(tx, ty + TILE_H);
          g.lineTo(tx, ty + TILE_H + depth);
          g.lineTo(tx - HALF_W, ty + HALF_H + depth);
          g.closePath();
          g.fill();
        }
        if (!unlocked(gx + 1, gy)) {
          g.fillStyle = '#6f5430';
          g.beginPath();
          g.moveTo(tx, ty + TILE_H);
          g.lineTo(tx + HALF_W, ty + HALF_H);
          g.lineTo(tx + HALF_W, ty + HALF_H + depth);
          g.lineTo(tx, ty + TILE_H + depth);
          g.closePath();
          g.fill();
        }
      }
    }
    for (let gy = 0; gy < ISLAND_SIZE; gy++) {
      for (let gx = 0; gx < ISLAND_SIZE; gx++) {
        const [tx, ty] = this.gridToWorld(gx, gy);
        const isUnlocked = unlocked(gx, gy);
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(tx + HALF_W, ty + HALF_H);
        g.lineTo(tx, ty + TILE_H);
        g.lineTo(tx - HALF_W, ty + HALF_H);
        g.closePath();
        if (isUnlocked) {
          const edge = !unlocked(gx, gy + 1) || !unlocked(gx + 1, gy) || !unlocked(gx - 1, gy) || !unlocked(gx, gy - 1);
          g.fillStyle = edge ? '#c9b46a' : (gx + gy) % 2 === 0 ? '#6fbf5a' : '#66b552';
          g.fill();
          g.strokeStyle = 'rgba(0,0,0,0.06)';
          g.lineWidth = 1;
          g.stroke();
        } else {
          g.fillStyle = (gx + gy) % 2 === 0 ? 'rgba(20,60,90,0.35)' : 'rgba(20,60,90,0.28)';
          g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.08)';
          g.lineWidth = 1;
          g.stroke();
        }
      }
    }
    this.groundCanvas = cv;
  }

  sortedBuildings() {
    return [...this.state.buildings].sort((a, b) => (a.x + a.y + a.size) - (b.x + b.y + b.size) || a.x - b.x);
  }

  buildingRect(b) {
    const { w, h } = imageSize(b.size);
    const [cx] = this.gridToWorld(b.x + b.size / 2, b.y + b.size / 2);
    const [, by] = this.gridToWorld(b.x + b.size, b.y + b.size);
    return { x: cx - w / 2, y: by - h, w, h };
  }

  buildingImage(b) {
    const st = this.state;
    const extra = {};
    if (b.type === 'farm') extra.farmState = b.growing ? (now() >= b.growing.doneAt ? 'ready' : 'growing') : 'empty';
    if (b.type === 'hatchery') extra.eggs = st.eggs.map((e) => DRAGONS[e.species]);
    if (b.type === 'breeding') extra.breedingActive = !!st.breeding;
    const key = 'bld|' + buildingKey(b, extra);
    return getImage(key, () => buildingSVG(b, extra));
  }

  dragonImage(dragon, facing) {
    const stage = dragonStage(dragon.level);
    return getImage(`drg|${dragon.species}|${stage}|${facing}`, () => dragonSVG(dragon.species, stage, { size: 160, facing }));
  }

  render(t) {
    const ctx = this.ctx;
    const st = this.state;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // water
    const grad = ctx.createLinearGradient(0, 0, 0, this.h);
    grad.addColorStop(0, '#2a7fbd');
    grad.addColorStop(1, '#155a91');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.w, this.h);
    // subtle waves
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    const wavePhase = (t / 900) % (Math.PI * 2);
    for (let i = 0; i < 6; i++) {
      const y = ((i * 97 + t * 0.01) % (this.h + 40)) - 20;
      ctx.beginPath();
      for (let x = 0; x <= this.w; x += 20) ctx.lineTo(x, y + Math.sin(x / 40 + wavePhase + i) * 3);
      ctx.stroke();
    }

    this.buildGround();
    ctx.save();
    ctx.translate(this.w / 2, this.h / 2);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-this.cam.x, -this.cam.y);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (this.groundCanvas) {
      ctx.drawImage(this.groundCanvas, this.groundOrigin[0], this.groundOrigin[1], this.groundCanvas.width / 2, this.groundCanvas.height / 2);
    }

    // lock icons + price on locked zones
    for (const z of ZONES) {
      if (st.island.zones.includes(z.id)) continue;
      const [wx, wy] = this.gridToWorld(z.x + z.w / 2, z.y + z.h / 2);
      if (imageReady(this.lockImg)) ctx.drawImage(this.lockImg, wx - 20, wy - 30, 40, 40);
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.strokeText(`${fmt(z.cost.gold)} gold`, wx, wy + 28);
      ctx.fillText(`${fmt(z.cost.gold)} gold`, wx, wy + 28);
    }

    // selection / placement footprint
    if (this.placement) {
      const p = this.placement;
      this.drawFootprint(ctx, p.gx, p.gy, p.size, p.valid ? 'rgba(80,255,120,0.45)' : 'rgba(255,80,80,0.5)');
    } else if (this.selectedId) {
      const b = st.buildings.find((x) => x.id === this.selectedId);
      if (b) this.drawFootprint(ctx, b.x, b.y, b.size, 'rgba(255,255,255,0.28)');
    }

    // buildings + dragons in depth order
    const bob = Math.sin(t / 350) * 3;
    for (const b of this.sortedBuildings()) {
      if (this.placement && this.placement.building && this.placement.building.id === b.id) continue;
      const img = this.buildingImage(b);
      const r = this.buildingRect(b);
      if (imageReady(img)) ctx.drawImage(img, r.x, r.y, r.w, r.h);
      if (b.type === 'habitat') this.drawDragons(ctx, b, t);
      this.drawIndicator(ctx, b, r, bob);
    }

    // placement ghost
    if (this.placement) {
      const p = this.placement;
      const ghost = p.building ? this.buildingImage(p.building) : getImage('bld|' + buildingKey({ def: p.def, level: 1 }, {}), () => buildingSVG({ def: p.def, level: 1 }, {}));
      const r = this.buildingRect({ x: p.gx, y: p.gy, size: p.size });
      ctx.globalAlpha = 0.75;
      if (imageReady(ghost)) ctx.drawImage(ghost, r.x, r.y, r.w, r.h);
      ctx.globalAlpha = 1;
    }

    // floating text
    const tn = now();
    this.floaters = this.floaters.filter((f) => tn - f.t0 < 1300);
    for (const f of this.floaters) {
      const k = (tn - f.t0) / 1300;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 4;
      ctx.strokeText(f.text, f.wx, f.wy - 20 - k * 50);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.wx, f.wy - 20 - k * 50);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawFootprint(ctx, gx, gy, size, color) {
    ctx.fillStyle = color;
    for (let dx = 0; dx < size; dx++) {
      for (let dy = 0; dy < size; dy++) {
        const [tx, ty] = this.gridToWorld(gx + dx, gy + dy);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + HALF_W, ty + HALF_H);
        ctx.lineTo(tx, ty + TILE_H);
        ctx.lineTo(tx - HALF_W, ty + HALF_H);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawDragons(ctx, b, t) {
    const st = this.state;
    b.dragons.forEach((id, i) => {
      const d = st.dragons.find((x) => x.id === id);
      if (!d) return;
      const slot = DRAGON_SLOTS[i % DRAGON_SLOTS.length];
      const facing = i % 2 === 0 ? 'left' : 'right';
      const img = this.dragonImage(d, facing);
      const stage = dragonStage(d.level);
      const size = stage === 'baby' ? 44 : stage === 'young' ? 54 : 64;
      const [wx, wy] = this.gridToWorld(b.x + slot[0], b.y + slot[1]);
      const phase = (b.x * 7 + b.y * 13 + i * 31) % 10;
      const hop = Math.abs(Math.sin(t / 420 + phase)) * 4;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(wx, wy + 2, size * 0.3, size * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      if (imageReady(img)) ctx.drawImage(img, wx - size / 2, wy - size * 0.92 - hop, size, size);
    });
  }

  drawIndicator(ctx, b, r, bob) {
    const st = this.state;
    let icon = null;
    let label = '';
    const tn = now();
    if (b.type === 'habitat' && b.gold >= 20) {
      icon = this.iconImgs.coin;
      label = fmt(b.gold);
    } else if (b.type === 'farm' && b.growing && tn >= b.growing.doneAt) icon = this.iconImgs.food;
    else if (b.type === 'hatchery' && st.eggs.some((e) => tn >= e.doneAt)) icon = this.iconImgs.egg;
    else if (b.type === 'breeding' && st.breeding && tn >= st.breeding.doneAt) icon = this.iconImgs.heart;
    if (!icon) return;
    const x = r.x + r.w / 2, y = r.y + r.h - b.size * TILE_H - 40 + bob;
    if (imageReady(icon)) ctx.drawImage(icon, x - 16, y - 32, 32, 32);
    if (label) {
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(label, x, y + 12);
      ctx.fillStyle = '#ffe082';
      ctx.fillText(label, x, y + 12);
    }
  }
}
