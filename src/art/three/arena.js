// 3D battle arena: both dragons on a lit stage with lunge, hit, enter and faint animations.
import { three, addLights, disposeObject } from './engine.js';
import { buildDragon } from './dragonModel.js';
import { dragonStage } from '../../economy.js';

const SLOTS = { player: { pos: [-2.3, 0, 1.4], rot: 0.15 }, enemy: { pos: [2.4, 0, -1.3], rot: Math.PI - 0.15 } };

export class Arena {
  constructor(canvas, theme = 'grass') {
    const T = three();
    this.canvas = canvas;
    this.renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.scene = new T.Scene();
    this.scene.fog = new T.Fog(0x101c30, 14, 30);
    this.lights = addLights(this.scene, { shadows: true, shadowSize: 8, key: 1.7 });
    // stage: a big disc with a radial gradient texture and a grid of subtle rings
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    const cols = theme === 'ember' ? ['#6b3a2a', '#3a1d16', '#1a0c08'] : theme === 'sky' ? ['#a9dcb0', '#6fae7c', '#3d6b52'] : ['#6fbf5a', '#3f7a3a', '#22402a'];
    grad.addColorStop(0, cols[0]); grad.addColorStop(0.6, cols[1]); grad.addColorStop(1, cols[2]);
    g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2;
    for (let r = 60; r < 260; r += 50) { g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke(); }
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const ground = new T.Mesh(new T.CircleGeometry(9, 48), new T.MeshPhongMaterial({ map: tex, shininess: 5 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const rim = new T.Mesh(new T.RingGeometry(8.9, 9.6, 48), new T.MeshBasicMaterial({ color: 0x0b1424, transparent: true, opacity: 0.6, side: T.DoubleSide }));
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.01;
    this.scene.add(rim);
    this.camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0.3, 5.2, 14.5);
    this.camera.lookAt(0.2, 1.1, 0);
    this.units = { player: null, enemy: null };
    this.tweens = [];
    this.running = true;
    this.start = performance.now();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement || canvas);
    this.loop = (t) => {
      if (!this.running) return;
      requestAnimationFrame(this.loop);
      const now = performance.now();
      const time = (t - this.start) / 1000;
      for (const side of ['player', 'enemy']) {
        const u = this.units[side];
        if (u && !u.fainted) u.model.animate(time + (side === 'enemy' ? 1.7 : 0));
      }
      this.tweens = this.tweens.filter((tw) => {
        const k = Math.min(1, (now - tw.start) / tw.dur);
        tw.fn(k);
        if (k >= 1 && tw.done) tw.done();
        return k < 1;
      });
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(this.loop);
  }

  resize() {
    const el = this.canvas.parentElement || this.canvas;
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep both dragons in frame on narrow (portrait) screens
    this.camera.fov = w / h < 0.9 ? 40 : 30;
    this.camera.updateProjectionMatrix();
  }

  // Screen position (CSS px, relative to the canvas) of a unit's chest, for damage popups.
  screenPos(side) {
    const u = this.units[side];
    if (!u) return null;
    const T = three();
    const v = new T.Vector3(u.base[0], 1.4 * u.scale, u.base[2]).project(this.camera);
    const el = this.canvas.parentElement || this.canvas;
    return { x: ((v.x + 1) / 2) * el.clientWidth, y: ((1 - v.y) / 2) * el.clientHeight };
  }

  tween(dur, fn, done) {
    this.tweens.push({ start: performance.now(), dur, fn, done });
  }

  setUnit(side, unit, enter = false) {
    const cur = this.units[side];
    if (cur) {
      this.scene.remove(cur.model.group);
      disposeObject(cur.model.group);
    }
    const model = buildDragon(unit.species, dragonStage(unit.level), { stars: unit.stars || 0, shadows: true });
    const slot = SLOTS[side];
    const g = model.group;
    g.position.set(...slot.pos);
    g.rotation.y = slot.rot;
    const sc = side === 'player' ? 0.92 : 0.88;
    g.scale.setScalar(sc);
    this.scene.add(g);
    const u = { model, unit, fainted: unit.hp <= 0, base: [...slot.pos], scale: sc };
    this.units[side] = u;
    if (u.fainted) this.applyFaint(u, 1);
    else if (enter) {
      g.scale.setScalar(0.01);
      g.position.y = 1.5;
      this.tween(500, (k) => { const e = 1 - Math.pow(1 - k, 3); g.scale.setScalar(sc * e); g.position.y = 1.5 * (1 - e); });
    }
    return u;
  }

  lunge(side) {
    const u = this.units[side];
    if (!u) return;
    const g = u.model.group;
    const dir = side === 'player' ? 1 : -1;
    this.tween(520, (k) => {
      const s = Math.sin(k * Math.PI);
      g.position.x = u.base[0] + dir * 1.9 * s;
      g.position.z = u.base[2] - dir * 0.9 * s;
      g.position.y = 0.5 * Math.sin(Math.min(1, k * 1.2) * Math.PI);
      g.rotation.z = -dir * 0.25 * s;
    }, () => { g.position.set(...u.base); g.rotation.z = 0; });
  }

  hit(side, strong = false) {
    const u = this.units[side];
    if (!u) return;
    const g = u.model.group;
    const T = three();
    const flash = new T.PointLight(strong ? 0xffd54f : 0xff5252, 3, 5);
    flash.position.set(u.base[0], 1.6, u.base[2] + 0.5);
    this.scene.add(flash);
    this.tween(420, (k) => {
      g.position.z = u.base[2] + Math.sin(k * 40) * 0.12 * (1 - k);
      g.position.x = u.base[0] + (side === 'player' ? -0.3 : 0.3) * Math.sin(k * Math.PI);
      flash.intensity = 3 * (1 - k);
    }, () => { g.position.set(...u.base); this.scene.remove(flash); });
  }

  applyFaint(u, k) {
    const g = u.model.group;
    g.rotation.z = (u.base[0] < 0 ? -1 : 1) * 1.3 * k;
    g.position.y = -0.4 * k;
    g.scale.setScalar(u.scale * (1 - 0.15 * k));
  }

  faint(side) {
    const u = this.units[side];
    if (!u) return;
    u.fainted = true;
    this.tween(650, (k) => this.applyFaint(u, 1 - Math.pow(1 - k, 2)));
  }

  dispose() {
    this.running = false;
    if (this.ro) this.ro.disconnect();
    for (const side of ['player', 'enemy']) if (this.units[side]) disposeObject(this.units[side].model.group);
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.renderer.dispose();
    try { this.renderer.forceContextLoss(); } catch (err) { /* ignore */ }
  }
}
