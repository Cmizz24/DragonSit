// Three.js bootstrap: lazy loading, shared helpers (tapered tubes, materials, lights) and a
// sprite rasterizer that turns 3D models into cached images for the 2D isometric map and lists.
let THREE = null;
let loadPromise = null;
let webglOk = null;

export function hasWebGL() {
  if (webglOk !== null) return webglOk;
  try {
    const c = document.createElement('canvas');
    webglOk = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (err) {
    webglOk = false;
  }
  return webglOk;
}

export function loadThree() {
  if (THREE) return Promise.resolve(THREE);
  if (!loadPromise) {
    loadPromise = hasWebGL()
      ? import('../../../vendor/three.module.min.js').then((m) => { THREE = m; return m; }).catch((err) => { console.warn('three.js failed to load', err); webglOk = false; return null; })
      : Promise.resolve(null);
  }
  return loadPromise;
}

export function three() {
  return THREE;
}

export function ready() {
  return !!THREE;
}

// ---------- geometry helpers ----------

// Tapered tube along a Catmull-Rom curve through `points` with radius r(t).
export function taperedTube(points, radiusFn, segments = 16, radial = 10, closedEnds = true) {
  const T = THREE;
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)), false, 'catmullrom', 0.5);
  const frames = curve.computeFrenetFrames(segments, false);
  const pos = [], norm = [], uv = [], idx = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const r = Math.max(0.001, radiusFn(t));
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const cx = Math.cos(a), sy = Math.sin(a);
      const nx = cx * n.x + sy * b.x, ny = cx * n.y + sy * b.y, nz = cx * n.z + sy * b.z;
      pos.push(p.x + nx * r, p.y + ny * r, p.z + nz * r);
      norm.push(nx, ny, nz);
      uv.push(j / radial, t * 4);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(norm, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  if (closedEnds) {
    // cap ends with spheres for a smooth look (added by caller via capSphere); geometry stays open.
  }
  return { geometry: g, curve };
}

export function capSphere(point, r, material) {
  const T = THREE;
  const m = new T.Mesh(new T.SphereGeometry(r, 12, 10), material);
  m.position.set(...point);
  return m;
}

// A flat shape (in local XY) extruded very slightly, for fins, leaves, crests, wing membranes.
export function flatShape(points2d, material, curved = false, thickness = 0.02) {
  const T = THREE;
  const shape = new T.Shape();
  points2d.forEach((p, i) => {
    if (i === 0) shape.moveTo(p[0], p[1]);
    else if (curved && p.length === 4) shape.quadraticCurveTo(p[0], p[1], p[2], p[3]);
    else shape.lineTo(p[0], p[1]);
  });
  shape.closePath();
  const geo = thickness > 0 ? new T.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false }) : new T.ShapeGeometry(shape, 8);
  return new T.Mesh(geo, material);
}

// Procedural scale texture used as a bump map on dragon skin.
let scaleTex = null;
export function scaleBumpTexture() {
  if (scaleTex) return scaleTex;
  const T = THREE;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 16; row++) {
    for (let col = -1; col < 9; col++) {
      const x = col * 16 + (row % 2) * 8, y = row * 8;
      const grad = g.createRadialGradient(x, y + 6, 1, x, y + 6, 9);
      grad.addColorStop(0, '#a8a8a8');
      grad.addColorStop(0.8, '#707070');
      grad.addColorStop(1, '#404040');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y + 6, 8.5, Math.PI, 0);
      g.fill();
    }
  }
  scaleTex = new T.CanvasTexture(c);
  scaleTex.wrapS = scaleTex.wrapT = T.RepeatWrapping;
  scaleTex.repeat.set(3, 3);
  return scaleTex;
}

// Visible scale pattern multiplied with the skin colour.
let scaleColorTex = null;
export function scaleColorTexture() {
  if (scaleColorTex) return scaleColorTex;
  const T = THREE;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f2f2';
  g.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 16; row++) {
    for (let col = -1; col < 9; col++) {
      const x = col * 16 + (row % 2) * 8, y = row * 8;
      const grad = g.createRadialGradient(x, y + 6, 1, x, y + 6, 9);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.75, '#e6e6e6');
      grad.addColorStop(1, '#a8a8a8');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y + 6, 8.5, Math.PI, 0);
      g.fill();
    }
  }
  scaleColorTex = new T.CanvasTexture(c);
  scaleColorTex.wrapS = scaleColorTex.wrapT = T.RepeatWrapping;
  scaleColorTex.repeat.set(4, 4);
  scaleColorTex.colorSpace = T.SRGBColorSpace;
  return scaleColorTex;
}

export function skinMaterial(color, opts = {}) {
  const T = THREE;
  return new T.MeshPhongMaterial({
    color, shininess: opts.shininess ?? 22, specular: new T.Color(opts.specular || 0x2a2a2a),
    map: opts.scales === false ? null : scaleColorTexture(),
    bumpMap: opts.bump === false ? null : scaleBumpTexture(), bumpScale: opts.bumpScale ?? 0.02,
    emissive: new T.Color(opts.emissive || 0x000000), emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent, opacity: opts.opacity ?? 1, side: opts.side ?? T.FrontSide,
  });
}

export function addLights(scene, opts = {}) {
  const T = THREE;
  const hemi = new T.HemisphereLight(opts.sky || 0xdff3ff, opts.ground || 0x3b2a1a, opts.hemi ?? 0.9);
  scene.add(hemi);
  const key = new T.DirectionalLight(0xfff1dc, opts.key ?? 1.6);
  key.position.set(-4, 7, 5);
  key.castShadow = !!opts.shadows;
  if (opts.shadows) {
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    const s = opts.shadowSize || 6;
    key.shadow.camera.left = -s; key.shadow.camera.right = s; key.shadow.camera.top = s; key.shadow.camera.bottom = -s;
    key.shadow.bias = -0.0015;
  }
  scene.add(key);
  const rim = new T.DirectionalLight(0x8fb8ff, opts.rim ?? 0.7);
  rim.position.set(4, 3, -5);
  scene.add(rim);
  const fill = new T.DirectionalLight(0xffffff, opts.fill ?? 0.35);
  fill.position.set(3, 1, 4);
  scene.add(fill);
  return { hemi, key, rim, fill };
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m.dispose();
    }
  });
}

// ---------- sprite rasterizer ----------
let spriteRenderer = null;
let spriteScene = null;
let spriteLights = null;
const spriteCache = new Map();

function ensureSpriteRenderer() {
  const T = THREE;
  if (spriteRenderer) return;
  const canvas = document.createElement('canvas');
  spriteRenderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
  spriteRenderer.setPixelRatio(1);
  spriteRenderer.shadowMap.enabled = true;
  spriteRenderer.shadowMap.type = T.PCFSoftShadowMap;
  spriteRenderer.outputColorSpace = T.SRGBColorSpace;
  spriteScene = new T.Scene();
  spriteLights = addLights(spriteScene, { shadows: true, shadowSize: 4, hemi: 1.1, fill: 0.55 });
}

// Render `object` with a given camera into a PNG data URL of w×h pixels.
export function rasterize(object, camera, w, h, opts = {}) {
  ensureSpriteRenderer();
  const T = THREE;
  spriteRenderer.setSize(w, h, false);
  spriteScene.add(object);
  if (opts.lightFromCamera) {
    // key light up and to the left of the camera, rim light behind the subject
    const dir = camera.position.clone().normalize();
    const left = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), dir).normalize();
    spriteLights.key.position.copy(dir.clone().multiplyScalar(8).add(left.multiplyScalar(5)).add(new T.Vector3(0, 7, 0)));
    spriteLights.rim.position.copy(dir.clone().multiplyScalar(-6).add(new T.Vector3(0, 4, 0)));
    spriteLights.fill.position.copy(dir.clone().multiplyScalar(6).add(new T.Vector3(0, 1, 0)));
  }
  if (opts.shadowPlane) {
    const plane = new T.Mesh(new T.PlaneGeometry(40, 40), new T.ShadowMaterial({ opacity: 0.28 }));
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = opts.shadowY || 0;
    plane.receiveShadow = true;
    spriteScene.add(plane);
    spriteRenderer.render(spriteScene, camera);
    spriteScene.remove(plane);
    plane.geometry.dispose();
    plane.material.dispose();
  } else {
    spriteRenderer.render(spriteScene, camera);
  }
  spriteScene.remove(object);
  return spriteRenderer.domElement.toDataURL('image/png');
}

// Cached sprite image. build() must return { object, camera, w, h, opts }.
export function sprite(key, build) {
  let img = spriteCache.get(key);
  if (img) return img;
  const spec = build();
  const url = rasterize(spec.object, spec.camera, spec.w, spec.h, spec.opts || {});
  disposeObject(spec.object);
  img = new Image();
  img.onload = () => { img.__ready = true; if (onSpriteLoad) onSpriteLoad(); };
  img.src = url;
  spriteCache.set(key, img);
  return img;
}

export function spriteUrl(key, build) {
  return sprite(key, build).src;
}

let onSpriteLoad = null;
export function setSpriteLoadCallback(fn) {
  onSpriteLoad = fn;
}

// Perspective camera looking at `target` from a 3/4 angle. azimuth in degrees around Y (0 = from +X side).
export function lookCamera(w, h, target, distance, azimuthDeg, elevationDeg, fov = 28) {
  const T = THREE;
  const cam = new T.PerspectiveCamera(fov, w / h, 0.1, 100);
  const az = (azimuthDeg * Math.PI) / 180, el = (elevationDeg * Math.PI) / 180;
  cam.position.set(target[0] + Math.cos(el) * Math.cos(az) * distance, target[1] + Math.sin(el) * distance, target[2] + Math.cos(el) * Math.sin(az) * distance);
  cam.lookAt(new T.Vector3(...target));
  return cam;
}

// Orthographic dimetric camera matching the 2:1 isometric grid: azimuth 45°, elevation 30°.
// `worldWidth` is the horizontal extent in world units that maps to the full image width.
export function isoCamera(w, h, worldWidth, center, verticalShift = 0) {
  const T = THREE;
  const worldHeight = worldWidth * (h / w);
  const cam = new T.OrthographicCamera(-worldWidth / 2, worldWidth / 2, worldHeight / 2, -worldHeight / 2, -50, 50);
  const az = Math.PI / 4, el = Math.PI / 6;
  const d = 20;
  cam.position.set(center[0] + Math.cos(el) * Math.cos(az) * d, center[1] + Math.sin(el) * d, center[2] + Math.cos(el) * Math.sin(az) * d);
  cam.lookAt(new T.Vector3(...center));
  cam.updateMatrixWorld();
  // shift the view vertically (in world units along the camera's up axis)
  if (verticalShift) {
    const up = new T.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    cam.position.addScaledVector(up, verticalShift);
    cam.lookAt(new T.Vector3(center[0] + up.x * verticalShift, center[1] + up.y * verticalShift, center[2] + up.z * verticalShift));
  }
  cam.updateProjectionMatrix();
  return cam;
}
