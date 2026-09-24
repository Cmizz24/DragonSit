// Procedural 3D buildings. Each model is centred on the origin with its footprint on the XZ plane,
// `size` world units per side (1 unit = 1 tile), y up.
import { three, taperedTube } from './engine.js';
import { ELEMENTS } from '../../data/elements.js';
import { BUILDINGS } from '../../data/buildings.js';
import { buildDragon } from './dragonModel.js';
import { mix, shade } from '../dragon.js';

const GROUND = {
  fire: '#4a2a22', earth: '#b0813f', water: '#e2cf96', nature: '#5cb85c', electric: '#c4a544', ice: '#eaf7ff', metal: '#7e8a96', dark: '#4a3070', light: '#f6f0dc', legend: '#d9a53a',
  farm: '#8d6e63', grass: '#6fbf5a', stone: '#c9c2b0', sand: '#c9a56b', rock: '#7d6b5d',
};
const SIDE = { fire: '#3a1d16', earth: '#7a5223', water: '#9a7d48', nature: '#5d4037', electric: '#7a6224', ice: '#8fbfd9', metal: '#4f5964', dark: '#2a1a45', light: '#c9bd98', legend: '#8a5a12', farm: '#5d4037', grass: '#7a5a3a', stone: '#8a8070', sand: '#8a6a3b', rock: '#4e3c30' };

function mat(T, color, opts = {}) {
  return new T.MeshPhongMaterial({ color, shininess: opts.shininess ?? 12, specular: new T.Color(opts.specular || 0x222222), emissive: new T.Color(opts.emissive || 0x000000), emissiveIntensity: opts.emissiveIntensity ?? 1, transparent: !!opts.transparent, opacity: opts.opacity ?? 1, flatShading: !!opts.flat, side: opts.side || T.FrontSide });
}

function platform(T, g, size, theme) {
  const h = 0.22;
  const top = mat(T, GROUND[theme] || GROUND.grass);
  const side = mat(T, SIDE[theme] || SIDE.grass);
  const box = new T.Mesh(new T.BoxGeometry(size - 0.06, h, size - 0.06), [side, side, top, side, side, side]);
  box.position.y = h / 2;
  box.castShadow = true;
  box.receiveShadow = true;
  g.add(box);
  // strata line
  const strata = new T.Mesh(new T.BoxGeometry(size - 0.04, 0.02, size - 0.04), mat(T, shade(SIDE[theme] || SIDE.grass, -35)));
  strata.position.y = h * 0.45;
  g.add(strata);
  return h;
}

const M = (T, g, mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };

function tree(T, g, x, z, y, sc = 1, leaf = '#4caf50', dark = '#1b5e20') {
  const trunk = new T.Mesh(new T.CylinderGeometry(0.05 * sc, 0.08 * sc, 0.5 * sc, 8), mat(T, '#6d4c41'));
  M(T, g, trunk, x, y + 0.25 * sc, z);
  const lm = mat(T, leaf, { shininess: 6 });
  const dm = mat(T, dark, { shininess: 6 });
  M(T, g, new T.SphereGeometry(0.34 * sc, 12, 10) && new T.Mesh(new T.SphereGeometry(0.34 * sc, 12, 10), dm), x, y + 0.62 * sc, z);
  M(T, g, new T.Mesh(new T.SphereGeometry(0.26 * sc, 12, 10), lm), x - 0.14 * sc, y + 0.8 * sc, z + 0.06 * sc);
  M(T, g, new T.Mesh(new T.SphereGeometry(0.26 * sc, 12, 10), lm), x + 0.15 * sc, y + 0.78 * sc, z - 0.08 * sc);
  M(T, g, new T.Mesh(new T.SphereGeometry(0.24 * sc, 12, 10), lm), x, y + 0.98 * sc, z);
}
function rock(T, g, x, z, y, sc = 1, col = '#8d8d99') {
  const r = new T.Mesh(new T.IcosahedronGeometry(0.22 * sc, 0), mat(T, col, { flat: true }));
  r.scale.set(1.2, 0.8, 1);
  r.rotation.y = x * 3 + z;
  M(T, g, r, x, y + 0.15 * sc, z);
}
function crystal(T, g, x, z, y, sc = 1, col = '#b388ff', glow = true) {
  const c = new T.Mesh(new T.OctahedronGeometry(0.16 * sc, 0), mat(T, col, { emissive: glow ? col : 0, emissiveIntensity: 0.35, transparent: true, opacity: 0.9, shininess: 120, specular: 0xffffff }));
  c.scale.set(0.7, 2.4, 0.7);
  c.rotation.y = x * 2 + z * 3;
  M(T, g, c, x, y + 0.36 * sc, z);
  if (glow) {
    const l = new T.PointLight(col, 0.6, 2.5);
    l.position.set(x, y + 0.6 * sc, z);
    g.add(l);
  }
}
function flower(T, g, x, z, y, col) {
  M(T, g, new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 0.16, 5), mat(T, '#33691e')), x, y + 0.08, z);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    M(T, g, new T.Mesh(new T.SphereGeometry(0.035, 6, 6), mat(T, col)), x + Math.cos(a) * 0.04, y + 0.17, z + Math.sin(a) * 0.04);
  }
  M(T, g, new T.Mesh(new T.SphereGeometry(0.025, 6, 6), mat(T, '#fff59d')), x, y + 0.18, z);
}
function bush(T, g, x, z, y, sc = 1, col = '#43a047') {
  const m = mat(T, col, { shininess: 6 });
  M(T, g, new T.Mesh(new T.SphereGeometry(0.16 * sc, 10, 8), m), x - 0.1 * sc, y + 0.12 * sc, z);
  M(T, g, new T.Mesh(new T.SphereGeometry(0.18 * sc, 10, 8), m), x + 0.1 * sc, y + 0.14 * sc, z + 0.05 * sc);
  M(T, g, new T.Mesh(new T.SphereGeometry(0.15 * sc, 10, 8), m), x, y + 0.22 * sc, z - 0.05 * sc);
}
function flag(T, g, x, z, y, col) {
  M(T, g, new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.7, 6), mat(T, '#5d4037')), x, y + 0.35, z);
  const f = new T.Mesh(new T.BoxGeometry(0.02, 0.18, 0.3), mat(T, col, { side: T.DoubleSide }));
  M(T, g, f, x, y + 0.6, z + 0.15);
}

function habitat(T, g, element, level) {
  const y = platform(T, g, 3, element);
  const E = ELEMENTS[element];
  switch (element) {
    case 'fire': {
      const lava = new T.Mesh(new T.CircleGeometry(0.75, 28), mat(T, '#ff7043', { emissive: 0xff5722, emissiveIntensity: 0.9, shininess: 80 }));
      lava.rotation.x = -Math.PI / 2;
      M(T, g, lava, 0.2, y + 0.011, 0.35);
      const core = new T.Mesh(new T.CircleGeometry(0.35, 20), mat(T, '#fff176', { emissive: 0xffee58, emissiveIntensity: 1 }));
      core.rotation.x = -Math.PI / 2;
      M(T, g, core, 0.1, y + 0.013, 0.25);
      const light = new T.PointLight(0xff7043, 1.4, 4);
      light.position.set(0.2, y + 0.6, 0.35);
      g.add(light);
      const vol = new T.Mesh(new T.ConeGeometry(0.62, 1.1, 10), mat(T, '#3e2723', { flat: true }));
      M(T, g, vol, -0.75, y + 0.55, -0.7);
      const crater = new T.Mesh(new T.CylinderGeometry(0.14, 0.2, 0.12, 10), mat(T, '#ff7043', { emissive: 0xff5722, emissiveIntensity: 0.8 }));
      M(T, g, crater, -0.75, y + 1.08, -0.7);
      const flame = new T.Mesh(new T.ConeGeometry(0.09, 0.4, 6), mat(T, '#ffd54f', { emissive: 0xffab00, emissiveIntensity: 1 }));
      M(T, g, flame, -0.75, y + 1.3, -0.7);
      rock(T, g, 1.0, 1.0, y, 0.9, '#4e342e');
      rock(T, g, -1.0, 0.9, y, 1.0, '#3e2723');
      break;
    }
    case 'earth': {
      rock(T, g, -0.7, -0.7, y, 1.6, '#8d6e63');
      rock(T, g, 0.9, -0.4, y, 1.1, '#a1887f');
      rock(T, g, -0.2, 0.9, y, 1.3, '#795548');
      const sand = new T.Mesh(new T.CircleGeometry(0.4, 16), mat(T, '#c6a15b'));
      sand.rotation.x = -Math.PI / 2;
      M(T, g, sand, 0.9, y + 0.01, 0.9);
      flower(T, g, 1.1, 1.0, y, '#ffca28');
      break;
    }
    case 'water': {
      const rim = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 0.05, 32), mat(T, '#f2e6c4'));
      M(T, g, rim, 0, y + 0.02, 0);
      const pool = new T.Mesh(new T.CylinderGeometry(1.0, 1.0, 0.04, 32), mat(T, '#29b6f6', { shininess: 140, specular: 0xffffff, transparent: true, opacity: 0.92 }));
      M(T, g, pool, 0, y + 0.06, 0);
      const deep = new T.Mesh(new T.CircleGeometry(0.55, 24), mat(T, '#0277bd'));
      deep.rotation.x = -Math.PI / 2;
      M(T, g, deep, -0.1, y + 0.085, -0.1);
      for (const [x, z] of [[0.5, 0.5], [-0.5, -0.3]]) {
        const lily = new T.Mesh(new T.CircleGeometry(0.16, 12), mat(T, '#66bb6a'));
        lily.rotation.x = -Math.PI / 2;
        M(T, g, lily, x, y + 0.09, z);
      }
      M(T, g, new T.Mesh(new T.SphereGeometry(0.05, 8, 8), mat(T, '#f06292')), 0.5, y + 0.13, 0.5);
      rock(T, g, 1.15, -1.05, y, 0.8, '#90a4ae');
      for (let i = 0; i < 3; i++) M(T, g, new T.Mesh(new T.CylinderGeometry(0.015, 0.02, 0.5, 5), mat(T, '#558b2f')), -1.15 + i * 0.08, y + 0.25, 1.1 - i * 0.05);
      break;
    }
    case 'nature': {
      tree(T, g, -0.75, -0.75, y, 1.1);
      tree(T, g, 0.8, -0.8, y, 0.9, '#66bb6a', '#2e7d32');
      tree(T, g, -0.2, 0.8, y, 1.0, '#8bc34a', '#558b2f');
      bush(T, g, 0.9, 0.9, y, 1);
      flower(T, g, 1.1, 0.1, y, '#ffee58');
      flower(T, g, -1.0, 0.5, y, '#ab47bc');
      flower(T, g, 0.3, 0.0, y, '#ec407a');
      break;
    }
    case 'electric': {
      const base = new T.Mesh(new T.CylinderGeometry(0.4, 0.5, 0.15, 12), mat(T, '#546e7a', { shininess: 60 }));
      M(T, g, base, 0, y + 0.07, 0);
      const pole = new T.Mesh(new T.CylinderGeometry(0.08, 0.12, 1.5, 10), mat(T, '#90a4ae', { shininess: 90, specular: 0xdddddd }));
      M(T, g, pole, 0, y + 0.85, 0);
      const ball = new T.Mesh(new T.SphereGeometry(0.3, 16, 12), mat(T, '#b0bec5', { shininess: 120, specular: 0xffffff }));
      M(T, g, ball, 0, y + 1.75, 0);
      const boltMat = mat(T, '#fff176', { emissive: 0xffd600, emissiveIntensity: 1 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const b = new T.Mesh(new T.BoxGeometry(0.04, 0.5, 0.04), boltMat);
        b.position.set(Math.cos(a) * 0.5, y + 1.9 + (i % 2) * 0.1, Math.sin(a) * 0.5);
        b.rotation.z = 0.6 * Math.cos(a);
        b.rotation.x = 0.6 * Math.sin(a);
        g.add(b);
      }
      const light = new T.PointLight(0xfff176, 1.2, 4);
      light.position.set(0, y + 2.0, 0);
      g.add(light);
      crystal(T, g, -0.9, 0.9, y, 0.9, '#ffe082');
      crystal(T, g, 0.9, -0.9, y, 0.8, '#ffd740');
      break;
    }
    case 'ice': {
      for (const [x, z, r] of [[-0.6, 0.7, 0.5], [0.7, -0.6, 0.4]]) {
        const s = new T.Mesh(new T.SphereGeometry(r, 14, 10), mat(T, '#ffffff', { shininess: 30 }));
        s.scale.y = 0.35;
        M(T, g, s, x, y, z);
      }
      crystal(T, g, 0, 0, y, 1.6, '#81d4fa');
      crystal(T, g, -0.8, -0.5, y, 1.0, '#4fc3f7');
      crystal(T, g, 0.9, 0.6, y, 1.1, '#b3e5fc');
      const pond = new T.Mesh(new T.CircleGeometry(0.42, 20), mat(T, '#b3e5fc', { shininess: 150, specular: 0xffffff }));
      pond.rotation.x = -Math.PI / 2;
      M(T, g, pond, 0.8, y + 0.011, 0.9);
      break;
    }
    case 'metal': {
      const plate = new T.Mesh(new T.BoxGeometry(2.2, 0.1, 2.2), mat(T, '#90a4ae', { shininess: 100, specular: 0xffffff }));
      M(T, g, plate, 0, y + 0.05, 0);
      const gearMat = mat(T, '#b0bec5', { shininess: 120, specular: 0xffffff });
      const gear = (x, z, r, h) => {
        const gg = new T.Group();
        gg.add(new T.Mesh(new T.CylinderGeometry(r, r, h, 10), gearMat));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const tooth = new T.Mesh(new T.BoxGeometry(0.16 * r, h, 0.35 * r), gearMat);
          tooth.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
          tooth.rotation.y = -a;
          gg.add(tooth);
        }
        gg.add(new T.Mesh(new T.CylinderGeometry(r * 0.3, r * 0.3, h + 0.02, 10), mat(T, '#37474f')));
        gg.rotation.x = Math.PI / 2;
        gg.position.set(x, y + 0.1 + r, z);
        gg.traverse((o) => { o.castShadow = true; });
        g.add(gg);
      };
      gear(0, 0, 0.5, 0.12);
      gear(0.85, -0.25, 0.3, 0.1);
      gear(-0.8, 0.25, 0.26, 0.1);
      const pipe = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 0.8, 8), mat(T, '#78909c', { shininess: 80 }));
      M(T, g, pipe, 0.95, y + 0.5, 0.95);
      M(T, g, new T.Mesh(new T.TorusGeometry(0.12, 0.05, 8, 16), mat(T, '#b0bec5', { shininess: 100 })), 0.95, y + 0.92, 0.95).rotation.x = Math.PI / 2;
      break;
    }
    case 'dark': {
      const circle = new T.Mesh(new T.CircleGeometry(0.7, 24), mat(T, '#2a1a45'));
      circle.rotation.x = -Math.PI / 2;
      M(T, g, circle, 0.1, y + 0.011, 0.1);
      crystal(T, g, 0, 0, y, 1.7, '#7e57c2');
      crystal(T, g, -0.9, 0.7, y, 1.0, '#9575cd');
      crystal(T, g, 0.9, -0.8, y, 1.1, '#5e35b1');
      const trunk = new T.Mesh(new T.CylinderGeometry(0.04, 0.08, 0.9, 6), mat(T, '#1a0f2e'));
      M(T, g, trunk, -0.8, y + 0.45, -0.8);
      for (const [rx, rz, ry] of [[0.6, 0, 0.9], [-0.5, 0.3, 1.05], [0.2, -0.6, 1.15]]) {
        const br = new T.Mesh(new T.CylinderGeometry(0.02, 0.035, 0.45, 5), mat(T, '#1a0f2e'));
        br.position.set(-0.8 + Math.sin(rx) * 0.15, y + ry, -0.8 + Math.sin(rz) * 0.15);
        br.rotation.z = rx;
        br.rotation.x = rz;
        g.add(br);
      }
      break;
    }
    case 'light': {
      const pm = mat(T, '#fffdf5', { shininess: 40 });
      for (const [x, z] of [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]]) {
        M(T, g, new T.Mesh(new T.CylinderGeometry(0.12, 0.14, 1.4, 12), pm), x, y + 0.7, z);
        M(T, g, new T.Mesh(new T.BoxGeometry(0.36, 0.1, 0.36), pm), x, y + 1.45, z);
        M(T, g, new T.Mesh(new T.BoxGeometry(0.34, 0.08, 0.34), pm), x, y + 0.04, z);
      }
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.2, 0.26, 0.5, 12), pm), 0, y + 0.25, 0);
      const orb = new T.Mesh(new T.SphereGeometry(0.4, 20, 16), mat(T, '#fff59d', { emissive: 0xffe082, emissiveIntensity: 0.9, shininess: 120 }));
      M(T, g, orb, 0, y + 1.05, 0);
      const light = new T.PointLight(0xffe082, 1.5, 5);
      light.position.set(0, y + 1.4, 0);
      g.add(light);
      break;
    }
    case 'legend': {
      const gold = mat(T, '#f6c453', { shininess: 130, specular: 0xffffff });
      M(T, g, new T.Mesh(new T.BoxGeometry(2.4, 0.12, 2.4), gold), 0, y + 0.06, 0);
      crystal(T, g, 0, 0, y + 0.12, 2.1, '#ffb300');
      crystal(T, g, -0.9, 0.8, y + 0.12, 1.0, '#ffca28');
      crystal(T, g, 0.9, -0.9, y + 0.12, 1.0, '#ffca28');
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M(T, g, new T.Mesh(new T.SphereGeometry(0.1, 10, 8), mat(T, '#fff8e1', { emissive: 0xffe082, emissiveIntensity: 0.5 })), x, y + 0.2, z);
      break;
    }
  }
  if (level >= 2) flag(T, g, -1.3, 1.3, y, E.color);
  if (level >= 3) flag(T, g, 1.3, -1.3, y, E.color);
}

function farm(T, g, level, state) {
  const y = platform(T, g, 2, 'farm');
  for (let i = 0; i < 4; i++) {
    M(T, g, new T.Mesh(new T.BoxGeometry(0.28, 0.08, 1.6), mat(T, '#4e342e')), -0.7 + i * 0.45, y + 0.04, 0.1);
    if (state === 'growing' || state === 'ready') {
      for (let j = 0; j < 3; j++) {
        const z = -0.45 + j * 0.55;
        if (state === 'growing') M(T, g, new T.Mesh(new T.ConeGeometry(0.07, 0.22, 5), mat(T, '#7cb342')), -0.7 + i * 0.45, y + 0.18, z);
        else {
          M(T, g, new T.Mesh(new T.SphereGeometry(0.11, 8, 6), mat(T, '#66bb6a')), -0.7 + i * 0.45, y + 0.2, z);
          M(T, g, new T.Mesh(new T.SphereGeometry(0.06, 8, 6), mat(T, ['#ff7043', '#ffca28', '#ef5350'][(i + j) % 3], { shininess: 60 })), -0.7 + i * 0.45 + 0.05, y + 0.3, z - 0.04);
        }
      }
    }
  }
  const barn = new T.Mesh(new T.BoxGeometry(0.5, 0.45, 0.45), mat(T, '#c62828'));
  M(T, g, barn, 0.7, y + 0.225, -0.75);
  const roof = new T.Mesh(new T.ConeGeometry(0.42, 0.3, 4), mat(T, '#8e1c1c'));
  roof.rotation.y = Math.PI / 4;
  M(T, g, roof, 0.7, y + 0.6, -0.75);
  if (level >= 2) M(T, g, new T.Mesh(new T.BoxGeometry(0.05, 0.25, 1.8), mat(T, '#a1887f')), -0.98, y + 0.12, 0.05);
  if (level >= 3) {
    M(T, g, new T.Mesh(new T.CylinderGeometry(0.02, 0.03, 0.7, 6), mat(T, '#795548')), -0.8, y + 0.35, 0.85);
    M(T, g, new T.Mesh(new T.SphereGeometry(0.12, 8, 6), mat(T, '#ffe082')), -0.8, y + 0.78, 0.85);
  }
  if (level >= 4) tree(T, g, 0.75, 0.75, y, 0.7, '#ffd54f', '#f9a825');
}

function breeding(T, g, active) {
  const y = platform(T, g, 3, 'grass');
  const mtn = new T.Mesh(new T.ConeGeometry(1.25, 1.9, 7), mat(T, '#7d6b5d', { flat: true }));
  M(T, g, mtn, 0, y + 0.95, 0);
  const snow = new T.Mesh(new T.ConeGeometry(0.5, 0.75, 7), mat(T, '#fafafa', { flat: true }));
  M(T, g, snow, 0, y + 1.55, 0);
  const cave = new T.Mesh(new T.CylinderGeometry(0.28, 0.32, 0.3, 10), mat(T, '#1c1410'));
  cave.rotation.x = Math.PI / 2;
  M(T, g, cave, 0.55, y + 0.3, 0.95);
  const heart = new T.Shape();
  heart.moveTo(0, -0.25);
  heart.bezierCurveTo(-0.5, 0.15, -0.3, 0.5, 0, 0.25);
  heart.bezierCurveTo(0.3, 0.5, 0.5, 0.15, 0, -0.25);
  const hm = new T.Mesh(new T.ExtrudeGeometry(heart, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 }), mat(T, active ? '#ff4081' : '#c2708a', { emissive: active ? 0xff4081 : 0x000000, emissiveIntensity: 0.5, shininess: 90 }));
  hm.scale.setScalar(0.9);
  hm.rotation.y = Math.PI / 4;
  M(T, g, hm, 0.55, y + 1.1, 0.55);
  if (active) {
    const l = new T.PointLight(0xff4081, 1.2, 3);
    l.position.set(0.7, y + 1.4, 0.7);
    g.add(l);
  }
  for (const [x, z] of [[-1.0, 1.0], [1.0, -1.0]]) {
    M(T, g, new T.Mesh(new T.TorusGeometry(0.28, 0.08, 8, 16), mat(T, '#8d6e63')), x, y + 0.06, z).rotation.x = Math.PI / 2;
  }
  tree(T, g, 1.1, 1.1, y, 0.75);
  bush(T, g, -1.1, -0.6, y, 0.9);
  flower(T, g, -1.15, 0.2, y, '#f06292');
}

function hatchery(T, g, eggs, level) {
  const y = platform(T, g, 2, 'sand');
  const nest = new T.Mesh(new T.TorusGeometry(0.62, 0.2, 10, 24), mat(T, '#8d6e63'));
  nest.rotation.x = Math.PI / 2;
  M(T, g, nest, 0, y + 0.14, 0);
  const inner = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 0.12, 24), mat(T, '#a1887f'));
  M(T, g, inner, 0, y + 0.06, 0);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const straw = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 0.5, 4), mat(T, '#d7b98a'));
    straw.position.set(Math.cos(a) * 0.62, y + 0.32, Math.sin(a) * 0.62);
    straw.rotation.z = Math.PI / 2 * Math.cos(a) * 0.9;
    straw.rotation.x = Math.PI / 2 * Math.sin(a) * 0.9 + 0.3;
    g.add(straw);
  }
  const slots = [[-0.3, 0.2], [0.3, 0.15], [0.02, -0.3], [0, 0.42]];
  eggs.slice(0, 4).forEach((E, i) => {
    const egg = new T.Mesh(new T.SphereGeometry(0.2, 14, 12), mat(T, E.color, { shininess: 70, specular: 0x999999 }));
    egg.scale.set(0.85, 1.15, 0.85);
    M(T, g, egg, slots[i][0], y + 0.34, slots[i][1]);
    for (const [dx, dy, dz] of [[0.1, 0.05, 0.14], [-0.12, -0.05, 0.12]]) M(T, g, new T.Mesh(new T.SphereGeometry(0.045, 6, 6), mat(T, E.dark)), slots[i][0] + dx, y + 0.34 + dy, slots[i][1] + dz);
  });
  const lamp = (x, z) => {
    M(T, g, new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 1.0, 8), mat(T, '#6d4c41')), x, y + 0.5, z);
    M(T, g, new T.Mesh(new T.SphereGeometry(0.15, 12, 10), mat(T, '#ff8a65', { emissive: 0xff7043, emissiveIntensity: 0.9 })), x, y + 1.1, z);
    const l = new T.PointLight(0xff9800, 1.0, 3);
    l.position.set(x, y + 1.1, z);
    g.add(l);
  };
  lamp(0.8, -0.8);
  if (level >= 2) lamp(-0.8, 0.8);
}

function mine(T, g, level) {
  const y = platform(T, g, 2, 'rock');
  const hill = new T.Mesh(new T.SphereGeometry(0.95, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(T, '#6d5c50', { flat: true }));
  M(T, g, hill, -0.1, y, -0.1);
  const tunnel = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 0.5, 12, 1, false, 0, Math.PI), mat(T, '#150e0a'));
  tunnel.rotation.z = Math.PI / 2;
  tunnel.rotation.y = Math.PI / 2;
  M(T, g, tunnel, 0.5, y + 0.02, 0.6);
  for (const [x, z] of [[0.2, 0.6], [0.8, 0.6]]) M(T, g, new T.Mesh(new T.BoxGeometry(0.08, 0.5, 0.08), mat(T, '#a1774a')), x, y + 0.25, z + 0.1);
  M(T, g, new T.Mesh(new T.BoxGeometry(0.75, 0.08, 0.08), mat(T, '#a1774a')), 0.5, y + 0.52, 0.7);
  crystal(T, g, -0.85, 0.75, y, 0.9, '#b388ff');
  crystal(T, g, 0.8, -0.75, y, 0.8, '#f48fb1');
  if (level >= 2) crystal(T, g, -0.75, -0.75, y, 1.1, '#80d8ff');
  if (level >= 3) crystal(T, g, 0.3, -0.3, y + 0.6, 1.0, '#ffd740');
  const cart = new T.Mesh(new T.BoxGeometry(0.4, 0.22, 0.28), mat(T, '#5d4037'));
  M(T, g, cart, 0.6, y + 0.2, -0.2);
  for (const dx of [-0.13, 0.13]) for (const dz of [-0.16, 0.16]) M(T, g, new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.03, 10), mat(T, '#263238')), 0.6 + dx, y + 0.07, -0.2 + dz).rotation.x = Math.PI / 2;
  M(T, g, new T.Mesh(new T.SphereGeometry(0.09, 8, 6), mat(T, '#b388ff', { emissive: 0xb388ff, emissiveIntensity: 0.4 })), 0.55, y + 0.36, -0.2);
}

function temple(T, g, tier) {
  const cols = ['#ffe082', '#80deea', '#ce93d8', '#ffab91', '#f48fb1'][tier - 1];
  const y = platform(T, g, 2, 'stone');
  const pm = mat(T, '#fffbf0', { shininess: 30 });
  M(T, g, new T.Mesh(new T.BoxGeometry(1.7, 0.1, 1.7), mat(T, '#f5f0e1')), 0, y + 0.05, 0);
  for (const [x, z] of [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62]]) M(T, g, new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 1.3, 10), pm), x, y + 0.75, z);
  M(T, g, new T.Mesh(new T.BoxGeometry(1.7, 0.1, 1.7), mat(T, '#d7ccc8')), 0, y + 1.45, 0);
  const roof = new T.Mesh(new T.ConeGeometry(1.3, 0.9, 4), mat(T, cols, { shininess: 50 }));
  roof.rotation.y = Math.PI / 4;
  M(T, g, roof, 0, y + 1.95, 0);
  M(T, g, new T.Mesh(new T.SphereGeometry(0.14, 12, 10), mat(T, '#fff59d', { emissive: 0xffd54f, emissiveIntensity: 0.9 })), 0, y + 2.5, 0);
}

function deco(T, g, id) {
  switch (id) {
    case 'deco_tree': tree(T, g, 0, 0, 0, 1.0); break;
    case 'deco_flowers': {
      const bed = new T.Mesh(new T.CylinderGeometry(0.42, 0.45, 0.06, 16), mat(T, '#43a047'));
      M(T, g, bed, 0, 0.03, 0);
      for (const [x, z, c] of [[-0.18, -0.15, '#ec407a'], [0.2, -0.1, '#ffee58'], [-0.05, 0.22, '#42a5f5'], [0.22, 0.2, '#ff7043'], [0, 0, '#ab47bc']]) flower(T, g, x, z, 0.06, c);
      break;
    }
    case 'deco_lantern': {
      M(T, g, new T.Mesh(new T.BoxGeometry(0.4, 0.12, 0.4), mat(T, '#9e9e9e')), 0, 0.06, 0);
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 0.9, 8), mat(T, '#bdbdbd')), 0, 0.55, 0);
      M(T, g, new T.Mesh(new T.BoxGeometry(0.36, 0.3, 0.36), mat(T, '#fff59d', { emissive: 0xfff176, emissiveIntensity: 0.8 })), 0, 1.15, 0);
      const cap = new T.Mesh(new T.ConeGeometry(0.34, 0.24, 4), mat(T, '#616161'));
      cap.rotation.y = Math.PI / 4;
      M(T, g, cap, 0, 1.42, 0);
      const l = new T.PointLight(0xfff176, 1.0, 3);
      l.position.set(0, 1.2, 0);
      g.add(l);
      break;
    }
    case 'deco_fountain': {
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.95, 1.0, 0.18, 24), mat(T, '#90a4ae', { shininess: 40 })), 0, 0.09, 0);
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.85, 0.85, 0.06, 24), mat(T, '#4fc3f7', { shininess: 150, specular: 0xffffff, transparent: true, opacity: 0.9 })), 0, 0.2, 0);
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 0.6, 10), mat(T, '#b0bec5')), 0, 0.5, 0);
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.45, 0.4, 0.1, 20), mat(T, '#90a4ae')), 0, 0.82, 0);
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.04, 20), mat(T, '#81d4fa', { shininess: 150, specular: 0xffffff })), 0, 0.89, 0);
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 0.4, 8), mat(T, '#b0bec5')), 0, 1.1, 0);
      M(T, g, new T.Mesh(new T.SphereGeometry(0.1, 10, 8), mat(T, '#e1f5fe', { transparent: true, opacity: 0.8 })), 0, 1.35, 0);
      break;
    }
    case 'deco_statue': {
      M(T, g, new T.Mesh(new T.BoxGeometry(1.4, 0.35, 1.4), mat(T, '#cfd8dc', { shininess: 40 })), 0, 0.175, 0);
      const d = buildDragon('legend', 'adult', { shadows: true });
      const gold = mat(T, '#f6c453', { shininess: 130, specular: 0xffffff });
      d.group.traverse((o) => { if (o.isMesh) o.material = gold; if (o.isLight) o.visible = false; });
      d.group.scale.setScalar(0.3);
      d.group.position.set(0, 0.35, 0);
      d.group.rotation.y = -Math.PI / 4;
      g.add(d.group);
      break;
    }
    case 'deco_crystal': crystal(T, g, 0, 0, 0, 1.4, '#b388ff'); break;
    case 'deco_bonfire': {
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 0.05, 16), mat(T, '#5d4037')), 0, 0.025, 0);
      for (const a of [0.4, 1.6]) { const log = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.7, 8), mat(T, '#4e342e')); log.rotation.z = Math.PI / 2; log.rotation.y = a; M(T, g, log, 0, 0.1, 0); }
      M(T, g, new T.Mesh(new T.ConeGeometry(0.22, 0.7, 7), mat(T, '#ff7043', { emissive: 0xff3d00, emissiveIntensity: 0.9, transparent: true, opacity: 0.9 })), 0, 0.45, 0);
      M(T, g, new T.Mesh(new T.ConeGeometry(0.12, 0.45, 6), mat(T, '#ffd54f', { emissive: 0xffc400, emissiveIntensity: 1 })), 0.03, 0.4, 0);
      const l = new T.PointLight(0xff7043, 1.3, 3);
      l.position.set(0, 0.6, 0);
      g.add(l);
      break;
    }
    case 'deco_pond': {
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.98, 1.0, 0.06, 24), mat(T, '#c9b46a')), 0, 0.03, 0);
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.85, 0.85, 0.05, 24), mat(T, '#29b6f6', { shininess: 150, specular: 0xffffff, transparent: true, opacity: 0.92 })), 0, 0.08, 0);
      const lily = new T.Mesh(new T.CircleGeometry(0.15, 12), mat(T, '#66bb6a'));
      lily.rotation.x = -Math.PI / 2;
      M(T, g, lily, 0.3, 0.11, 0.3);
      M(T, g, new T.Mesh(new T.SphereGeometry(0.05, 8, 8), mat(T, '#f06292')), 0.3, 0.15, 0.3);
      for (let i = 0; i < 3; i++) M(T, g, new T.Mesh(new T.CylinderGeometry(0.015, 0.02, 0.5, 5), mat(T, '#7cb342')), -0.7 + i * 0.08, 0.3, -0.7 + i * 0.05);
      break;
    }
    case 'deco_windmill': {
      M(T, g, new T.Mesh(new T.CylinderGeometry(0.4, 0.5, 1.2, 8), mat(T, '#efebe9')), 0, 0.6, 0);
      const roof = new T.Mesh(new T.ConeGeometry(0.5, 0.5, 8), mat(T, '#8d6e63'));
      M(T, g, roof, 0, 1.45, 0);
      const hub = new T.Group();
      hub.position.set(0, 1.3, 0.5);
      for (let i = 0; i < 4; i++) {
        const blade = new T.Mesh(new T.BoxGeometry(0.16, 1.0, 0.03), mat(T, '#fff8e1', { side: T.DoubleSide }));
        blade.position.y = 0.5;
        const holder = new T.Group();
        holder.rotation.z = (i / 4) * Math.PI * 2 + 0.4;
        holder.add(blade);
        hub.add(holder);
      }
      hub.add(new T.Mesh(new T.SphereGeometry(0.08, 8, 8), mat(T, '#4e342e')));
      hub.traverse((o) => { o.castShadow = true; });
      g.add(hub);
      break;
    }
    case 'deco_arch': {
      const bands = ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0'];
      bands.forEach((col, i) => {
        const t = new T.Mesh(new T.TorusGeometry(1.0 - i * 0.09, 0.045, 8, 32, Math.PI), mat(T, col, { emissive: col, emissiveIntensity: 0.3 }));
        t.rotation.y = -Math.PI / 4;
        M(T, g, t, 0, 0.1, 0);
      });
      for (const s of [1, -1]) { const cl = new T.Mesh(new T.SphereGeometry(0.22, 10, 8), mat(T, '#ffffff')); cl.scale.y = 0.5; M(T, g, cl, s * 0.7, 0.1, -s * 0.7); }
      break;
    }
    case 'deco_totem': {
      const wood = mat(T, '#8d6e63');
      M(T, g, new T.Mesh(new T.BoxGeometry(0.45, 1.6, 0.45), wood), 0, 0.8, 0);
      for (const [yy, col] of [[1.35, '#ffd54f'], [0.85, '#80deea'], [0.35, '#f48fb1']]) {
        for (const s of [1, -1]) M(T, g, new T.Mesh(new T.SphereGeometry(0.06, 8, 6), mat(T, col, { emissive: col, emissiveIntensity: 0.4 })), s * 0.12, yy, 0.23);
        M(T, g, new T.Mesh(new T.BoxGeometry(0.5, 0.05, 0.5), mat(T, '#3e2723')), 0, yy - 0.25, 0);
      }
      const cap = new T.Mesh(new T.ConeGeometry(0.4, 0.35, 4), mat(T, '#ff7043'));
      cap.rotation.y = Math.PI / 4;
      M(T, g, cap, 0, 1.75, 0);
      break;
    }
    case 'deco_obelisk': {
      const ob = new T.Mesh(new T.CylinderGeometry(0.02, 0.28, 2.2, 4), mat(T, '#37474f', { shininess: 60 }));
      ob.rotation.y = Math.PI / 4;
      M(T, g, ob, 0, 1.1, 0);
      for (let i = 0; i < 4; i++) M(T, g, new T.Mesh(new T.BoxGeometry(0.16, 0.05, 0.02), mat(T, '#80deea', { emissive: 0x80deea, emissiveIntensity: 1 })), 0, 0.5 + i * 0.35, 0.2 - i * 0.03);
      const l = new T.PointLight(0x80deea, 0.8, 3);
      l.position.set(0, 1.4, 0.4);
      g.add(l);
      break;
    }
  }
}

export function buildBuilding(b, extra = {}) {
  const T = three();
  const def = BUILDINGS[b.def];
  const g = new T.Group();
  if (def.type === 'habitat') habitat(T, g, def.element, b.level || 1);
  else if (def.type === 'farm') farm(T, g, b.level || 1, extra.farmState || 'empty');
  else if (def.type === 'breeding') breeding(T, g, !!extra.breedingActive);
  else if (def.type === 'hatchery') hatchery(T, g, (extra.eggs || []).map((sp) => ELEMENTS[sp.elements[0]]), b.level || 1);
  else if (def.type === 'temple') temple(T, g, +def.id.split('_')[1]);
  else if (def.type === 'mine') mine(T, g, b.level || 1);
  else if (def.type === 'deco') deco(T, g, def.id);
  return g;
}
