// Procedural 3D dragon models built from primitives and tapered tubes.
// The dragon faces +X, stands on y = 0 and is roughly 4 units long.
import { three, taperedTube, capSphere, flatShape, skinMaterial } from './engine.js';
import { ELEMENTS } from '../../data/elements.js';
import { DRAGONS } from '../../data/dragons.js';
import { mix, shade } from '../dragon.js';

const STAGES = {
  baby: { head: 1.3, neck: 0.55, body: 0.62, wing: 0.3, tail: 0.6, leg: 0.55, legW: 1.4, spines: 0.5, crest: 0.6, horn: 0.55 },
  young: { head: 1.2, neck: 0.8, body: 0.86, wing: 0.7, tail: 0.85, leg: 0.85, legW: 1.1, spines: 0.8, crest: 0.85, horn: 0.8 },
  adult: { head: 1.0, neck: 1.0, body: 1.0, wing: 1.0, tail: 1.0, leg: 1.0, legW: 1.0, spines: 1.0, crest: 1.0, horn: 1.0 },
};

function palette(sp) {
  const E1 = ELEMENTS[sp.elements[0]];
  const E2 = sp.elements[1] ? ELEMENTS[sp.elements[1]] : null;
  const E3 = sp.elements[2] ? ELEMENTS[sp.elements[2]] : null;
  const E4 = sp.elements[3] ? ELEMENTS[sp.elements[3]] : null;
  return {
    E1, E2, E3, E4,
    body: E1.color, belly: mix(E1.light, '#fff4dc', 0.4), dark: E1.dark,
    wing: E2 ? E2.color : mix(E1.color, E1.dark, 0.4), wingDark: E2 ? E2.dark : E1.dark,
    horn: E2 ? mix(E2.light, E2.color, 0.4) : '#efe3c2', hornDark: E2 ? E2.dark : '#a68d5b',
    eye: E1.eye, mark: E3 ? E3.color : null, mark2: E4 ? E4.color : null,
    accent: E2 ? E2.color : E1.light,
  };
}

// Builds the model. Returns { group, animate(t), parts }.
export function buildDragon(speciesId, stage = 'adult', opts = {}) {
  const T = three();
  const sp = DRAGONS[speciesId];
  const P = palette(sp);
  const st = STAGES[stage] || STAGES.adult;
  const look = sp.look;
  const e1 = P.E1.id, e2 = P.E2 ? P.E2.id : e1;
  const rarity = sp.rarity;
  const legendary = rarity === 'legendary' || rarity === 'mythic';
  const bodyKind = [0, 1, 2].includes(look.body) ? look.body : 0;
  const stars = opts.stars || 0;

  const group = new T.Group();
  const parts = {};
  const shadow = opts.shadows !== false;
  const meshes = [];
  const M = (geo, mat) => {
    const m = new T.Mesh(geo, mat);
    m.castShadow = shadow;
    m.receiveShadow = false;
    meshes.push(m);
    return m;
  };

  // materials
  const skin = skinMaterial(P.body, { shininess: e1 === 'metal' ? 90 : e1 === 'water' || e1 === 'ice' ? 55 : 22, specular: e1 === 'metal' ? 0x999999 : 0x333333 });
  const bellyMat = skinMaterial(P.belly, { shininess: 15, bumpScale: 0.006, scales: false });
  const wingMat = new T.MeshPhongMaterial({ color: P.wing, side: T.DoubleSide, transparent: true, opacity: e2 === 'water' || e2 === 'ice' ? 0.8 : 0.94, shininess: 40, specular: new T.Color(0x333333) });
  const boneMat = new T.MeshPhongMaterial({ color: P.wingDark, shininess: 30 });
  const hornMat = new T.MeshPhongMaterial({ color: P.horn, shininess: 70, specular: new T.Color(0x666666) });
  const clawMat = new T.MeshPhongMaterial({ color: '#efe3c2', shininess: 80 });
  const eyeWhite = new T.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });
  const irisMat = new T.MeshPhongMaterial({ color: P.eye, emissive: new T.Color(P.eye), emissiveIntensity: e1 === 'dark' ? 0.9 : 0.35, shininess: 100 });
  const pupilMat = new T.MeshBasicMaterial({ color: 0x0a0612 });
  const darkMat = new T.MeshPhongMaterial({ color: shade(P.dark, -40), shininess: 10 });

  // ---------- body ----------
  const bodyScale = st.body * [1, 1.12, 0.9][bodyKind];
  const bodyY = 0.3 + 0.78 * st.leg;
  const bodyYS = 0.6 * bodyScale * [1, 1.08, 0.92][bodyKind];
  const body = M(new T.SphereGeometry(1, 28, 20), skin);
  body.scale.set(0.84 * bodyScale, bodyYS, 0.56 * bodyScale);
  body.position.set(0, bodyY, 0);
  body.rotation.z = 0.12;
  group.add(body);
  const chest = M(new T.SphereGeometry(1, 20, 14), skin);
  chest.scale.set(0.5 * bodyScale, 0.5 * bodyScale, 0.5 * bodyScale);
  chest.position.set(0.45 * bodyScale, bodyY + 0.12 * bodyScale, 0);
  group.add(chest);
  const belly = M(new T.SphereGeometry(1, 20, 14), bellyMat);
  belly.scale.set(0.72 * bodyScale, 0.46 * bodyScale, 0.44 * bodyScale);
  belly.position.set(0.1 * bodyScale, bodyY - 0.15 * bodyScale, 0);
  belly.rotation.z = 0.12;
  group.add(belly);
  // markings: spots or stripes for hybrids
  if (P.mark || (P.E2 && !['metal', 'earth'].includes(e2))) {
    const cols = P.mark ? [P.mark, P.mark2 || P.mark] : [P.accent, P.accent];
    const spotMat = new T.MeshPhongMaterial({ color: cols[0], shininess: 20 });
    const spotMat2 = new T.MeshPhongMaterial({ color: cols[1], shininess: 20 });
    const spots = [[0.3, 0.45, 0.55], [-0.2, 0.55, 0.5], [0.55, 0.2, 0.62], [-0.5, 0.3, 0.55], [0.1, 0.65, 0.3]];
    spots.forEach(([fx, fy, fz], i) => {
      for (const side of [1, -1]) {
        const s = M(new T.SphereGeometry(0.1 * bodyScale, 10, 8), i % 2 ? spotMat2 : spotMat);
        s.scale.set(1, 0.7, 0.35);
        s.position.set(fx * 0.84 * bodyScale, bodyY + fy * bodyYS, side * fz * 0.56 * bodyScale);
        s.lookAt(new T.Vector3(fx * 2, bodyY + fy * 2, side * fz * 2));
        group.add(s);
      }
    });
  }
  // armour plates for metal / rocks for earth
  if (e1 === 'metal' || e2 === 'metal') {
    const plateMat = new T.MeshPhongMaterial({ color: 0xb0bec5, shininess: 120, specular: new T.Color(0xcccccc) });
    for (let i = 0; i < 4; i++) {
      const pl = M(new T.BoxGeometry(0.3 * bodyScale, 0.09, 0.44 * bodyScale), plateMat);
      pl.position.set((0.4 - i * 0.3) * bodyScale, bodyY + bodyYS * 0.96 - i * 0.03, 0);
      pl.rotation.z = -0.15 + i * 0.1;
      group.add(pl);
    }
  }
  if (e1 === 'earth' || e2 === 'earth') {
    const rockMat = new T.MeshPhongMaterial({ color: 0x8d6e63, shininess: 8, flatShading: true });
    for (let i = 0; i < 4; i++) {
      const r = M(new T.IcosahedronGeometry(0.14 * bodyScale, 0), rockMat);
      r.position.set((0.45 - i * 0.3) * bodyScale, bodyY + bodyYS * 0.92, (i % 2 ? 0.14 : -0.1) * bodyScale);
      group.add(r);
    }
  }

  // ---------- neck & head ----------
  const neckStart = [0.6 * bodyScale, bodyY + 0.22 * bodyScale, 0];
  const n = st.neck;
  const neckPts = [neckStart, [neckStart[0] + 0.32 * n, neckStart[1] + 0.38 * n, 0], [neckStart[0] + 0.5 * n, neckStart[1] + 0.78 * n, 0], [neckStart[0] + 0.55 * n, neckStart[1] + 1.0 * n, 0]];
  const neckR0 = 0.3 * bodyScale * [1, 1.15, 0.85][bodyKind], neckR1 = 0.23 * Math.max(bodyScale, 0.8);
  const neck = taperedTube(neckPts, (t) => neckR0 * (1 - t) + neckR1 * t, 14, 12);
  group.add(M(neck.geometry, skin));
  // throat plates
  const throat = taperedTube(neckPts.map((p) => [p[0] + 0.05, p[1] - 0.03, p[2]]), (t) => (neckR0 * (1 - t) + neckR1 * t) * 0.82, 14, 12);
  const throatMesh = M(throat.geometry, bellyMat);
  throatMesh.position.set(0.08, -0.04, 0);
  group.add(throatMesh);

  const headBase = neckPts[3];
  const head = new T.Group();
  head.position.set(headBase[0] + 0.05, headBase[1] + 0.02, headBase[2]);
  const hs = st.head * (0.85 + 0.15 * bodyScale) * 1.18;
  head.scale.setScalar(hs);
  group.add(head);
  parts.head = head;
  const sn = stage === 'baby' ? 0.9 : look.snout ? 1.18 : 1;
  const cranium = M(new T.SphereGeometry(0.36, 24, 18), skin);
  cranium.scale.set(1.15, 0.92, 0.95);
  cranium.position.set(0.05, 0.05, 0);
  head.add(cranium);
  const snout = M(new T.SphereGeometry(0.3, 20, 14), skin);
  snout.scale.set(1.35 * sn, 0.58, 0.74);
  snout.position.set(0.36 * sn, -0.06, 0);
  head.add(snout);
  const jaw = M(new T.SphereGeometry(0.27, 18, 12), skin);
  jaw.scale.set(1.2 * sn, 0.3, 0.62);
  jaw.position.set(0.3 * sn, -0.22, 0);
  jaw.rotation.z = 0.14;
  head.add(jaw);
  const chin = M(new T.SphereGeometry(0.24, 16, 12), bellyMat);
  chin.scale.set(1.05 * sn, 0.22, 0.52);
  chin.position.set(0.28 * sn, -0.27, 0);
  chin.rotation.z = 0.14;
  head.add(chin);
  // mouth interior
  const mouth = M(new T.BoxGeometry(0.45 * sn, 0.06, 0.42), darkMat);
  mouth.position.set(0.48 * sn, -0.12, 0);
  head.add(mouth);
  // teeth
  const toothGeo = new T.ConeGeometry(0.022, 0.07, 6);
  for (const x of [0.44, 0.55, 0.66]) {
    for (const z of [-0.13, 0.13]) {
      const tooth = M(toothGeo, clawMat);
      tooth.position.set(x * sn, -0.1, z);
      tooth.rotation.x = Math.PI;
      head.add(tooth);
    }
  }
  // eyes
  for (const side of [1, -1]) {
    const eye = M(new T.SphereGeometry(0.085, 14, 12), eyeWhite);
    eye.position.set(0.24, 0.1, side * 0.24);
    head.add(eye);
    const iris = M(new T.SphereGeometry(0.056, 12, 10), irisMat);
    iris.position.set(0.28, 0.1, side * 0.28);
    head.add(iris);
    const pupil = M(new T.SphereGeometry(0.03, 8, 8), pupilMat);
    pupil.scale.set(1, 1.6, 0.6);
    pupil.position.set(0.32, 0.1, side * 0.3);
    head.add(pupil);
    const brow = M(new T.BoxGeometry(0.22, 0.06, 0.12), skin);
    brow.position.set(0.22, 0.2, side * 0.25);
    brow.rotation.z = -0.35;
    brow.rotation.x = side * 0.3;
    head.add(brow);
    const nostril = M(new T.SphereGeometry(0.025, 6, 6), darkMat);
    nostril.position.set(0.74 * sn, -0.01, side * 0.11);
    head.add(nostril);
    // ear frill
    const ear = flatShape([[0, 0], [0.32, 0.32], [0.14, -0.05]], wingMat, false, 0.015);
    ear.position.set(-0.22, 0.12, side * 0.3);
    ear.rotation.y = side * 0.9;
    ear.rotation.z = 0.5;
    ear.castShadow = shadow;
    head.add(ear);
    // cheek spike
    const spike = M(new T.ConeGeometry(0.04, 0.16, 6), hornMat);
    spike.position.set(-0.05, -0.1, side * 0.36);
    spike.rotation.x = side * Math.PI / 2;
    head.add(spike);
  }
  // horns
  addHorns(T, head, e2, look, P, hornMat, st.horn, M);
  // crest
  addCrest(T, head, e1, P, st.crest, M);
  if (e1 === 'light' || (e2 === 'light' && e1 !== 'legend')) {
    const halo = M(new T.TorusGeometry(0.34, 0.035, 8, 32), new T.MeshPhongMaterial({ color: 0xffe27a, emissive: new T.Color(0xffd54f), emissiveIntensity: 0.9 }));
    halo.position.set(0.05, 0.62, 0);
    halo.rotation.x = Math.PI / 2;
    head.add(halo);
  }
  if (legendary) {
    const crownMat = new T.MeshPhongMaterial({ color: rarity === 'mythic' ? 0xff7ae0 : 0xffd54f, emissive: new T.Color(rarity === 'mythic' ? 0xff4fd8 : 0xffb300), emissiveIntensity: 0.35, shininess: 120, specular: new T.Color(0xffffff) });
    const band = M(new T.TorusGeometry(0.3, 0.05, 8, 24), crownMat);
    band.position.set(0.02, 0.4, 0);
    band.rotation.x = Math.PI / 2;
    head.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const pk = M(new T.ConeGeometry(0.05, 0.22, 6), crownMat);
      pk.position.set(0.02 + Math.cos(a) * 0.3, 0.5, Math.sin(a) * 0.3);
      head.add(pk);
    }
    const gem = M(new T.OctahedronGeometry(0.07, 0), new T.MeshPhongMaterial({ color: 0xff5fa2, emissive: new T.Color(0xff2e9a), emissiveIntensity: 0.6 }));
    gem.position.set(0.34, 0.42, 0);
    head.add(gem);
  }

  // ---------- wings ----------
  const wingRootY = bodyY + 0.32 * bodyScale;
  const wingPivots = [];
  for (const side of [1, -1]) {
    const pivot = new T.Group();
    pivot.position.set(0.05 * bodyScale, wingRootY, side * 0.42 * bodyScale);
    const inner = new T.Group();
    inner.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; // local +X -> outward (±Z)
    inner.rotation.x = 0;
    pivot.add(inner);
    if (st.wing < 0.4) {
      const nub = M(new T.SphereGeometry(0.16, 12, 10), wingMat);
      nub.scale.set(1.4, 0.7, 0.5);
      nub.position.set(0.15, 0.1, 0);
      inner.add(nub);
    } else {
      buildWing(T, inner, st.wing * 1.2 * bodyScale, look, P, wingMat, boneMat, hornMat, M, side);
    }
    pivot.rotation.x = side * -0.35; // resting angle: raised
    pivot.rotation.z = 0.15;
    group.add(pivot);
    wingPivots.push({ pivot, side });
  }
  parts.wings = wingPivots;

  // ---------- tail ----------
  const tailRoot = [-0.7 * bodyScale, bodyY - 0.12 * bodyScale, 0];
  const tl = st.tail;
  const tailPts = [tailRoot, [tailRoot[0] - 0.7 * tl, tailRoot[1] - 0.2 * tl, 0.1 * tl], [tailRoot[0] - 1.35 * tl, tailRoot[1] - 0.05 * tl, 0.05 * tl], [tailRoot[0] - 1.75 * tl, tailRoot[1] + 0.5 * tl, -0.05 * tl], [tailRoot[0] - 1.85 * tl, tailRoot[1] + 1.0 * tl, 0]];
  const tailGroup = new T.Group();
  tailGroup.position.set(tailRoot[0], tailRoot[1], tailRoot[2]);
  const tailLocal = tailPts.map((p) => [p[0] - tailRoot[0], p[1] - tailRoot[1], p[2] - tailRoot[2]]);
  const tail = taperedTube(tailLocal, (t) => 0.24 * bodyScale * (1 - t) * (1 - t) + 0.05 * (1 - (1 - t) * (1 - t)), 22, 12);
  tailGroup.add(M(tail.geometry, skin));
  tailGroup.add(capSphere(tailLocal[0], 0.24 * bodyScale, skin));
  const tipPt = tailLocal[tailLocal.length - 1];
  const tipDir = tail.curve.getTangentAt(1);
  addTailTip(T, tailGroup, e2, P, tipPt, tipDir, st.tail, hornMat, wingMat, M);
  // tail spines
  if (st.spines > 0.5) {
    for (let i = 1; i <= 6; i++) {
      const t = i / 8;
      const p = tail.curve.getPointAt(t);
      const s = M(new T.ConeGeometry(0.05 * st.spines, (0.22 - i * 0.02) * st.spines, 6), hornMat);
      s.position.set(p.x, p.y + 0.24 * bodyScale * (1 - t) * (1 - t) + 0.05, p.z);
      tailGroup.add(s);
    }
  }
  group.add(tailGroup);
  parts.tail = tailGroup;

  // ---------- back spines ----------
  if (st.spines > 0.5) {
    for (let i = 0; i < 5; i++) {
      const x = (0.45 - i * 0.28) * bodyScale;
      const y = bodyY + Math.sqrt(Math.max(0, 1 - (x / (0.84 * bodyScale)) ** 2)) * bodyYS + x * 0.12;
      const s = M(new T.ConeGeometry(0.065 * st.spines, (0.28 - i * 0.03) * st.spines, 6), hornMat);
      s.position.set(x, y + 0.06, 0);
      s.rotation.z = -0.2 + i * 0.1;
      group.add(s);
    }
    for (let i = 1; i <= 3; i++) {
      const p = neck.curve.getPointAt(i / 4);
      const s = M(new T.ConeGeometry(0.05 * st.spines, 0.18 * st.spines, 6), hornMat);
      s.position.set(p.x - 0.12, p.y + neckR0 * 0.7, p.z);
      s.rotation.z = 0.4;
      group.add(s);
    }
  }

  // ---------- legs ----------
  const legW = st.legW;
  const legY = bodyY - 0.28 * bodyScale;
  const buildLeg = (hip, hind, side) => {
    const g = new T.Group();
    const kneeX = hind ? -0.12 : 0.08, ankleX = hind ? -0.18 : 0.02;
    const pts = [[hip[0], hip[1], hip[2]], [hip[0] + kneeX, hip[1] - legY * 0.5, hip[2] + side * 0.05], [hip[0] + ankleX, 0.16, hip[2] + side * 0.03]];
    const r0 = (hind ? 0.19 : 0.16) * bodyScale * legW, r1 = 0.1 * bodyScale * legW;
    const tube = taperedTube(pts, (t) => r0 * (1 - t) + r1 * t, 10, 10);
    g.add(M(tube.geometry, skin));
    if (hind) {
      const thigh = M(new T.SphereGeometry(0.28 * bodyScale * legW, 14, 12), skin);
      thigh.scale.set(0.9, 1.05, 0.55);
      thigh.position.set(hip[0], hip[1] - 0.05, hip[2]);
      g.add(thigh);
    }
    g.add(capSphere(pts[2], r1, skin));
    const foot = M(new T.SphereGeometry(0.2 * legW, 14, 10), skin);
    foot.scale.set(1.25, 0.42, 0.85);
    foot.position.set(pts[2][0] + 0.1, 0.08, pts[2][2]);
    g.add(foot);
    for (let i = -1; i <= 1; i++) {
      const claw = M(new T.ConeGeometry(0.035, 0.14, 6), clawMat);
      claw.position.set(pts[2][0] + 0.3, 0.06, pts[2][2] + i * 0.1);
      claw.rotation.z = -Math.PI / 2;
      claw.rotation.y = i * 0.25;
      g.add(claw);
    }
    return g;
  };
  for (const side of [1, -1]) {
    group.add(buildLeg([0.42 * bodyScale, legY, side * 0.33 * bodyScale], false, side));
    group.add(buildLeg([-0.42 * bodyScale, legY + 0.05, side * 0.36 * bodyScale], true, side));
  }

  // ---------- rarity aura ----------
  if (legendary || rarity === 'epic') {
    const auraCol = rarity === 'mythic' ? 0xffffff : rarity === 'legendary' ? P.E1.light : (P.mark || P.E1.light);
    const aura = new T.Mesh(new T.SphereGeometry(2.6 * bodyScale, 24, 16), new T.MeshBasicMaterial({ color: auraCol, transparent: true, opacity: rarity === 'mythic' ? 0.16 : 0.1, side: T.BackSide, depthWrite: false }));
    aura.position.set(-0.2, bodyY + 0.4, 0);
    group.add(aura);
    parts.aura = aura;
  }
  if (stars > 0) {
    const starMat = new T.MeshBasicMaterial({ color: 0xffd54f });
    for (let i = 0; i < stars; i++) {
      const s = new T.Mesh(new T.OctahedronGeometry(0.07, 0), starMat);
      s.position.set(0.9 - i * 0.45, bodyY + 1.9 * bodyScale + 1.0, 0);
      group.add(s);
    }
  }

  // ---------- element ambience (small emissive particles) ----------
  const ambient = [];
  const addParticle = (color, x, y, z, r) => {
    const p = new T.Mesh(new T.SphereGeometry(r, 6, 6), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    p.position.set(x, y, z);
    p.userData.base = [x, y, z];
    group.add(p);
    ambient.push(p);
  };
  if (e1 === 'fire') for (let i = 0; i < 5; i++) addParticle(0xffab40, 1.2 - i * 0.7, 1.2 + (i % 3) * 0.6, (i % 2 ? 0.8 : -0.7), 0.035);
  if (e1 === 'ice') for (let i = 0; i < 5; i++) addParticle(0xe1f5fe, 1.0 - i * 0.6, 1.4 + (i % 2) * 0.7, (i % 2 ? 0.7 : -0.6), 0.03);
  if (e1 === 'light' || rarity === 'mythic') for (let i = 0; i < 6; i++) addParticle(0xffffff, 1.3 - i * 0.6, 1.0 + (i % 3) * 0.7, (i % 2 ? 0.9 : -0.8), 0.03);
  if (e1 === 'electric') for (let i = 0; i < 4; i++) addParticle(0xfff176, 1.0 - i * 0.7, 1.5 + (i % 2) * 0.5, (i % 2 ? 0.6 : -0.6), 0.03);
  if (e1 === 'nature') for (let i = 0; i < 4; i++) addParticle(0x8bc34a, 1.1 - i * 0.7, 1.3 + (i % 2) * 0.6, (i % 2 ? 0.7 : -0.7), 0.035);
  if (e1 === 'dark') for (let i = 0; i < 4; i++) addParticle(0x7e57c2, 1.0 - i * 0.7, 1.2 + (i % 2) * 0.7, (i % 2 ? 0.7 : -0.7), 0.05);

  const bounds = { length: 4.2 * Math.max(st.tail, 0.7), height: headBase[1] + 0.9 * hs, center: [-0.2 * bodyScale, bodyY + 0.35 + 0.25 * st.neck, 0] };

  function animate(t, mood = 'idle') {
    group.position.y = Math.sin(t * 2.1) * 0.025;
    for (const { pivot, side } of wingPivots) pivot.rotation.x = side * (-0.35 - Math.sin(t * 2.4) * 0.16);
    tailGroup.rotation.y = Math.sin(t * 1.6) * 0.1;
    tailGroup.rotation.z = Math.sin(t * 1.1) * 0.03;
    head.rotation.z = Math.sin(t * 1.3) * 0.05;
    head.rotation.y = Math.sin(t * 0.7) * 0.08;
    body.scale.y = bodyYS * (1 + Math.sin(t * 2.1) * 0.015);
    ambient.forEach((p, i) => {
      const [x, y, z] = p.userData.base;
      p.position.set(x + Math.sin(t * 1.5 + i) * 0.1, y + ((t * 0.4 + i * 0.3) % 1.2), z + Math.cos(t * 1.2 + i) * 0.1);
      p.material.opacity = 0.9 - ((t * 0.4 + i * 0.3) % 1.2) * 0.7;
    });
    if (parts.aura) parts.aura.material.opacity = (rarity === 'mythic' ? 0.16 : 0.1) + Math.sin(t * 2) * 0.03;
  }

  return { group, animate, parts, bounds, meshes };
}

function addHorns(T, head, el, look, P, hornMat, hs, M) {
  const mk = (pts, r0, r1, mat) => {
    const base = pts[0];
    const scaled = pts.map((p, i) => (i === 0 ? p : [base[0] + (p[0] - base[0]) * hs, base[1] + (p[1] - base[1]) * hs, base[2] + (p[2] - base[2]) * hs]));
    const tube = taperedTube(scaled, (t) => r0 * (1 - t) + r1 * t, 10, 8);
    const m = M(tube.geometry, mat);
    return m;
  };
  const z = 0.16;
  if (el === 'ice') {
    const mat = new T.MeshPhongMaterial({ color: 0xb3e5fc, emissive: new T.Color(0x4fc3f7), emissiveIntensity: 0.4, transparent: true, opacity: 0.85, shininess: 120 });
    for (const s of [1, -1]) {
      const c = M(new T.OctahedronGeometry(0.16, 0), mat);
      c.scale.set(0.5 * hs, 2.2 * hs, 0.5 * hs);
      c.position.set(-0.15, 0.25 + 0.2 * hs, s * z);
      c.rotation.z = 0.5;
      c.rotation.x = s * -0.3;
      head.add(c);
    }
    return;
  }
  if (el === 'electric') {
    const mat = new T.MeshPhongMaterial({ color: 0xfff176, emissive: new T.Color(0xffd600), emissiveIntensity: 0.6, shininess: 80 });
    for (const s of [1, -1]) {
      const bolt = flatShape([[0, 0], [-0.08, 0.2], [0.02, 0.2], [-0.12, 0.5], [-0.02, 0.28], [-0.1, 0.28], [0.06, 0]], mat, false, 0.04);
      bolt.position.set(-0.12, 0.25, s * z);
      bolt.scale.setScalar(hs);
      bolt.rotation.y = s * 0.4;
      head.add(bolt);
    }
    return;
  }
  if (el === 'nature') {
    const mat = new T.MeshPhongMaterial({ color: 0x66bb6a, side: T.DoubleSide, shininess: 30 });
    for (const s of [1, -1]) {
      const leaf = flatShape([[0, 0], [-0.18, 0.2], [-0.12, 0.5], [0.06, 0.34], [0.1, 0.1]], mat, false, 0.02);
      leaf.position.set(-0.12, 0.25, s * z);
      leaf.scale.setScalar(hs);
      leaf.rotation.y = s * 0.5;
      leaf.rotation.z = -0.3;
      head.add(leaf);
    }
    return;
  }
  if (el === 'earth') {
    const mat = new T.MeshPhongMaterial({ color: 0x8d6e63, flatShading: true, shininess: 5 });
    for (const s of [1, -1]) {
      const c = M(new T.ConeGeometry(0.09 * hs, 0.45 * hs, 5), mat);
      c.position.set(-0.18, 0.25 + 0.15 * hs, s * z);
      c.rotation.z = 0.55;
      c.rotation.x = s * -0.25;
      head.add(c);
    }
    return;
  }
  if (el === 'water') {
    const mat = new T.MeshPhongMaterial({ color: mix(P.wing, '#b3e5fc', 0.3), side: T.DoubleSide, transparent: true, opacity: 0.8, shininess: 90 });
    const fin = flatShape([[0, 0], [-0.25, 0.2], [-0.35, 0.55], [-0.05, 0.5], [0.25, 0.15]], mat, false, 0.02);
    fin.position.set(-0.05, 0.25, 0);
    fin.scale.setScalar(hs);
    head.add(fin);
    for (const s of [1, -1]) {
      const f2 = flatShape([[0, 0], [-0.25, 0.1], [-0.3, 0.35], [0, 0.25]], mat, false, 0.02);
      f2.position.set(-0.2, 0.05, s * 0.3);
      f2.rotation.y = s * 1.0;
      f2.scale.setScalar(hs * 0.8);
      head.add(f2);
    }
    return;
  }
  if (el === 'metal') {
    const mat = new T.MeshPhongMaterial({ color: 0xb0bec5, shininess: 130, specular: new T.Color(0xffffff) });
    for (const s of [1, -1]) head.add(mk([[-0.15, 0.25, s * z], [-0.35, 0.5, s * z * 1.4], [-0.5, 0.8, s * z * 1.7]], 0.07 * hs, 0.015, mat));
    return;
  }
  if (el === 'dark') {
    const mat = new T.MeshPhongMaterial({ color: 0x2a1650, shininess: 40 });
    for (const s of [1, -1]) head.add(mk([[-0.15, 0.25, s * z], [-0.2, 0.55, s * z * 1.5], [-0.05, 0.85, s * z * 2.0]], 0.07 * hs, 0.012, mat));
    return;
  }
  if (el === 'legend') {
    const mat = new T.MeshPhongMaterial({ color: 0xffd54f, emissive: new T.Color(0xffb300), emissiveIntensity: 0.25, shininess: 120, specular: new T.Color(0xffffff) });
    for (const s of [1, -1]) head.add(mk([[-0.15, 0.25, s * z], [-0.4, 0.55, s * z * 1.5], [-0.65, 0.95, s * z * 1.6]], 0.075 * hs, 0.015, mat));
    return;
  }
  // generic horn variants
  const v = look.horn;
  for (const s of [1, -1]) {
    let pts;
    if (v === 1) pts = [[-0.12, 0.25, s * z], [-0.1, 0.55, s * z * 1.2], [-0.05, 0.85, s * z * 1.3]];
    else if (v === 2) pts = [[-0.15, 0.25, s * z], [-0.4, 0.4, s * z * 1.5], [-0.55, 0.7, s * z * 1.7]];
    else if (v === 3) pts = [[-0.15, 0.25, s * z], [-0.45, 0.45, s * z * 1.8], [-0.35, 0.8, s * z * 2.2], [-0.1, 0.85, s * z * 2.0]];
    else pts = [[-0.15, 0.25, s * z], [-0.4, 0.55, s * z * 1.4], [-0.6, 0.9, s * z * 1.5]];
    head.add(mk(pts, 0.075 * hs, 0.014, hornMat));
  }
}

function addCrest(T, head, el, P, cs, M) {
  if (el === 'fire') {
    const mat = new T.MeshPhongMaterial({ color: 0xff9100, emissive: new T.Color(0xff3d00), emissiveIntensity: 0.8, transparent: true, opacity: 0.92 });
    const mat2 = new T.MeshPhongMaterial({ color: 0xffee58, emissive: new T.Color(0xffc400), emissiveIntensity: 0.9, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 4; i++) {
      const f = M(new T.ConeGeometry(0.09 - i * 0.012, (0.42 - i * 0.05) * cs, 7), i % 2 ? mat2 : mat);
      f.position.set(0.05 - i * 0.16, 0.42 + i * 0.02, 0);
      f.rotation.z = 0.55 + i * 0.12;
      head.add(f);
    }
  } else if (el === 'dark') {
    const mat = new T.MeshPhongMaterial({ color: 0x4a2a8a, transparent: true, opacity: 0.85, shininess: 10 });
    for (let i = 0; i < 3; i++) {
      const f = M(new T.ConeGeometry(0.06, 0.35 * cs, 5), mat);
      f.position.set(-0.05 - i * 0.14, 0.42, 0);
      f.rotation.z = 0.7 + i * 0.15;
      head.add(f);
    }
  } else if (el === 'light') {
    const mat = new T.MeshPhongMaterial({ color: 0xfff8e1, emissive: new T.Color(0xffe082), emissiveIntensity: 0.5 });
    for (let i = 0; i < 3; i++) {
      const f = M(new T.ConeGeometry(0.05, 0.3 * cs, 6), mat);
      f.position.set(-0.05 - i * 0.14, 0.42, 0);
      f.rotation.z = 0.6 + i * 0.15;
      head.add(f);
    }
  } else if (el === 'legend') {
    // handled by the crown
  } else if (el === 'water' || el === 'nature' || el === 'ice' || el === 'electric') {
    // horns already carry the element look
  } else if (el === 'earth' || el === 'metal') {
    const mat = new T.MeshPhongMaterial({ color: el === 'metal' ? 0xb0bec5 : 0x8d6e63, shininess: el === 'metal' ? 120 : 5, flatShading: el === 'earth' });
    const ridge = M(new T.BoxGeometry(0.5, 0.08, 0.16), mat);
    ridge.position.set(-0.1, 0.38, 0);
    ridge.rotation.z = 0.2;
    head.add(ridge);
  }
}

function addTailTip(T, tailGroup, el, P, tip, dir, ts, hornMat, wingMat, M) {
  const g = new T.Group();
  g.position.set(tip[0], tip[1], tip[2]);
  const target = new T.Vector3(tip[0] + dir.x, tip[1] + dir.y, tip[2] + dir.z);
  g.lookAt(target); // local +Z along the tail direction
  const s = 0.6 + 0.4 * ts;
  g.scale.setScalar(s);
  let mesh;
  if (el === 'fire') {
    const mat = new T.MeshPhongMaterial({ color: 0xff9100, emissive: new T.Color(0xff3d00), emissiveIntensity: 0.8, transparent: true, opacity: 0.92 });
    mesh = M(new T.ConeGeometry(0.14, 0.5, 7), mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = 0.2;
    g.add(mesh);
    const m2 = M(new T.ConeGeometry(0.08, 0.32, 6), new T.MeshPhongMaterial({ color: 0xffee58, emissive: new T.Color(0xffc400), emissiveIntensity: 0.9 }));
    m2.rotation.x = Math.PI / 2;
    m2.position.set(0.05, 0.05, 0.28);
    g.add(m2);
  } else if (el === 'water') {
    mesh = flatShape([[0, -0.05], [0.4, -0.35], [0.28, 0], [0.4, 0.35]], wingMat, false, 0.02);
    mesh.rotation.y = -Math.PI / 2;
    mesh.rotation.z = Math.PI / 2;
    g.add(mesh);
  } else if (el === 'nature') {
    mesh = flatShape([[0, 0], [0.2, -0.16], [0.5, -0.08], [0.55, 0.05], [0.2, 0.16]], new T.MeshPhongMaterial({ color: 0x66bb6a, side: T.DoubleSide }), false, 0.02);
    mesh.rotation.y = -Math.PI / 2;
    g.add(mesh);
  } else if (el === 'earth') {
    mesh = M(new T.IcosahedronGeometry(0.2, 0), new T.MeshPhongMaterial({ color: 0x8d6e63, flatShading: true, shininess: 5 }));
    mesh.position.z = 0.15;
    g.add(mesh);
  } else if (el === 'electric') {
    mesh = flatShape([[0, 0], [0.22, -0.14], [0.14, -0.04], [0.5, -0.1], [0.24, 0.08], [0.34, 0.16], [0, 0.06]], new T.MeshPhongMaterial({ color: 0xfff176, emissive: new T.Color(0xffd600), emissiveIntensity: 0.6, side: T.DoubleSide }), false, 0.04);
    mesh.rotation.y = -Math.PI / 2;
    g.add(mesh);
  } else if (el === 'ice') {
    mesh = M(new T.OctahedronGeometry(0.18, 0), new T.MeshPhongMaterial({ color: 0xb3e5fc, emissive: new T.Color(0x4fc3f7), emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }));
    mesh.scale.set(0.6, 0.6, 1.8);
    mesh.position.z = 0.25;
    g.add(mesh);
  } else if (el === 'metal') {
    mesh = M(new T.ConeGeometry(0.12, 0.55, 4), new T.MeshPhongMaterial({ color: 0xb0bec5, shininess: 130, specular: new T.Color(0xffffff) }));
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = 0.25;
    g.add(mesh);
  } else if (el === 'dark') {
    mesh = flatShape([[0, 0], [0.22, -0.2], [0.5, 0], [0.22, 0.2]], new T.MeshPhongMaterial({ color: 0x2a1650, side: T.DoubleSide }), false, 0.03);
    mesh.rotation.y = -Math.PI / 2;
    g.add(mesh);
  } else if (el === 'light') {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, r = i % 2 ? 0.12 : 0.28;
      pts.push([Math.cos(a) * r + 0.25, Math.sin(a) * r]);
    }
    mesh = flatShape(pts, new T.MeshPhongMaterial({ color: 0xfff8e1, emissive: new T.Color(0xffe082), emissiveIntensity: 0.6, side: T.DoubleSide }), false, 0.03);
    mesh.rotation.y = -Math.PI / 2;
    g.add(mesh);
  } else if (el === 'legend') {
    mesh = flatShape([[0, 0], [0.25, -0.22], [0.55, 0], [0.25, 0.22]], new T.MeshPhongMaterial({ color: 0xffd54f, emissive: new T.Color(0xffb300), emissiveIntensity: 0.3, side: T.DoubleSide, shininess: 120 }), false, 0.04);
    mesh.rotation.y = -Math.PI / 2;
    g.add(mesh);
  } else {
    mesh = flatShape([[0, 0], [0.2, -0.18], [0.45, 0], [0.2, 0.18]], hornMat, false, 0.03);
    mesh.rotation.y = -Math.PI / 2;
    g.add(mesh);
  }
  tailGroup.add(g);
}

function buildWing(T, parent, sc, look, P, wingMat, boneMat, hornMat, M, side) {
  // Local coordinates: +X outward from the body, +Y up. Arm root at origin, wrist joint, four fingers.
  const wrist = [0.55, 0.85];
  const tips = [[1.0, 1.75], [1.55, 1.5], [1.9, 0.9], [1.7, 0.2]];
  const feather = look.wing === 1;
  const dip = (a, b, k) => { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; return [m[0] + (wrist[0] - m[0]) * k, m[1] + (wrist[1] - m[1]) * k]; };
  const k = feather ? 0.15 : 0.42;
  const shape = new T.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.2, 0.5, wrist[0], wrist[1]);
  shape.quadraticCurveTo(0.75, 1.35, tips[0][0], tips[0][1]);
  const c1 = dip(tips[0], tips[1], k), c2 = dip(tips[1], tips[2], k), c3 = dip(tips[2], tips[3], k);
  shape.quadraticCurveTo(c1[0], c1[1], tips[1][0], tips[1][1]);
  shape.quadraticCurveTo(c2[0], c2[1], tips[2][0], tips[2][1]);
  shape.quadraticCurveTo(c3[0], c3[1], tips[3][0], tips[3][1]);
  shape.quadraticCurveTo(0.9, -0.05, 0, 0);
  const membrane = new T.Mesh(new T.ShapeGeometry(shape, 12), wingMat);
  membrane.castShadow = true;
  membrane.scale.setScalar(sc);
  parent.add(membrane);
  // arm + finger bones
  const bone = (a, b, r0, r1) => {
    const tube = taperedTube([[a[0] * sc, a[1] * sc, 0], [((a[0] + b[0]) / 2) * sc, ((a[1] + b[1]) / 2) * sc, 0], [b[0] * sc, b[1] * sc, 0]], (t) => r0 * (1 - t) + r1 * t, 4, 8);
    parent.add(M(tube.geometry, boneMat));
  };
  bone([0, 0], wrist, 0.07 * sc, 0.05 * sc);
  for (const t of tips) bone(wrist, t, 0.045 * sc, 0.018 * sc);
  parent.add(capSphere([wrist[0] * sc, wrist[1] * sc, 0], 0.07 * sc, boneMat));
  const claw = M(new T.ConeGeometry(0.03 * sc, 0.16 * sc, 6), hornMat);
  claw.position.set(wrist[0] * sc - 0.06 * sc, wrist[1] * sc + 0.1 * sc, 0);
  claw.rotation.z = 0.6;
  parent.add(claw);
  if (P.mark2) {
    const spotMat = new T.MeshPhongMaterial({ color: P.mark2, side: T.DoubleSide });
    for (const [x, y] of [[1.1, 1.1], [1.45, 0.7]]) {
      const s = new T.Mesh(new T.CircleGeometry(0.08 * sc, 12), spotMat);
      s.position.set(x * sc, y * sc, 0.005);
      parent.add(s);
    }
  }
}
