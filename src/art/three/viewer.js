// Live 3D dragon viewer for the dragon page: auto-rotates, drag to spin, idle animation.
import { three, addLights, disposeObject } from './engine.js';
import { buildDragon } from './dragonModel.js';

export class DragonViewer {
  constructor(container, species, stage, opts = {}) {
    const T = three();
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'viewer-canvas';
    container.appendChild(this.canvas);
    this.renderer = new T.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.scene = new T.Scene();
    this.lights = addLights(this.scene, { shadows: true, shadowSize: 5 });
    const plane = new T.Mesh(new T.PlaneGeometry(30, 30), new T.ShadowMaterial({ opacity: 0.3 }));
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);
    const disc = new T.Mesh(new T.CircleGeometry(2.6, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.005;
    this.scene.add(disc);
    this.camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
    this.rot = -0.9;
    this.autoRotate = true;
    this.lastInteract = 0;
    this.model = null;
    this.running = true;
    this.set(species, stage, opts.stars || 0);
    this.bindInput();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.start = performance.now();
    this.loop = (t) => {
      if (!this.running) return;
      requestAnimationFrame(this.loop);
      const time = (t - this.start) / 1000;
      if (this.model) {
        this.model.animate(time);
        if (this.autoRotate && performance.now() - this.lastInteract > 2500) this.rot += 0.006;
        this.model.group.rotation.y = this.rot;
      }
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(this.loop);
  }

  set(species, stage, stars = 0) {
    if (this.model) {
      this.scene.remove(this.model.group);
      disposeObject(this.model.group);
    }
    this.model = buildDragon(species, stage, { stars, shadows: true });
    this.scene.add(this.model.group);
    const c = this.model.bounds.center;
    const dist = stage === 'baby' ? 7.2 : stage === 'young' ? 8.6 : 10.0;
    this.camera.position.set(0, c[1] + 2.4, dist);
    this.camera.lookAt(0, c[1] + 0.1, 0);
    this.model.group.position.x = -c[0] * 0.5;
  }

  bindInput() {
    let dragging = false, lastX = 0;
    const c = this.canvas;
    c.style.touchAction = 'pan-y';
    c.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; this.lastInteract = performance.now(); c.setPointerCapture && c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => { if (!dragging) return; this.rot += (e.clientX - lastX) * 0.012; lastX = e.clientX; this.lastInteract = performance.now(); });
    const up = () => { dragging = false; };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.running = false;
    if (this.ro) this.ro.disconnect();
    if (this.model) disposeObject(this.model.group);
    this.renderer.dispose();
    try { this.renderer.forceContextLoss(); } catch (err) { /* ignore */ }
    this.canvas.remove();
  }
}
