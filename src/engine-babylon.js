import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight, Color3, Color4, MeshBuilder, StandardMaterial, PBRMaterial, GlowLayer, TransformNode } from '@babylonjs/core';

const $ = (id) => document.getElementById(id);
const root = $('threeRoot');
const app = $('app');
const pill = $('livePill');
const modeLabel = $('modeLabel');
const audioLabel = $('audioLabel');
const graphState = $('graphState');
const graphLine = $('graphLine');
const startBtn = $('startBtn');
const nodesEl = $('nodes');
const meters = {
  temp: [$('tempVal'), $('tempMeter')],
  ph: [$('phVal'), $('phMeter')],
  o2: [$('o2Val'), $('o2Meter')],
  nh3: [$('nh3Val'), $('nh3Meter')]
};

for (const label of ['P0','P1','P2','P3','P4','P5','P6','P7']) {
  const n = document.createElement('div');
  n.className = 'node';
  n.textContent = label;
  nodesEl.appendChild(n);
}
const nodeEls = [...nodesEl.children];

const canvas = document.createElement('canvas');
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.display = 'block';
canvas.setAttribute('aria-label', 'Babylon.js real-time aquaponics tank');
root.appendChild(canvas);

const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: false,
  antialias: true,
  powerPreference: 'high-performance'
});
engine.setHardwareScalingLevel(Math.max(1, Math.min(window.devicePixelRatio || 1, 1.45)));

const scene = new Scene(engine);
scene.clearColor = new Color4(0.005, 0.025, 0.032, 1);
scene.fogMode = Scene.FOGMODE_EXP2;
scene.fogDensity = 0.025;
scene.fogColor = new Color3(0.02, 0.16, 0.18);

const camera = new ArcRotateCamera('camera', Math.PI / 2, 1.18, 24, new Vector3(0, 0.2, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 16;
camera.upperRadiusLimit = 32;
camera.lowerBetaLimit = 0.86;
camera.upperBetaLimit = 1.45;
camera.wheelPrecision = 55;
camera.panningSensibility = 0;

const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
hemi.intensity = 1.15;
hemi.groundColor = new Color3(0.02, 0.08, 0.08);
const key = new DirectionalLight('key', new Vector3(-0.55, -0.8, -0.35), scene);
key.intensity = 1.9;
const glow = new GlowLayer('glow', scene, { blurKernelSize: 48 });
glow.intensity = 0.45;

const state = {
  action: 'biofilter', hot: 5, t: 0, feed: 0, oxygen: 0, shade: 0, biofilter: 0, species: 0,
  telemetry: { temp: 21.6, ph: 7.12, o2: 8.2, nh3: 0.03 },
  fish: [], pellets: [], bubbles: [], algaeTarget: new Vector3(-8.5, -2.3, -1.5)
};

function mat(name, color, alpha = 1, emissive = 0) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(color);
  m.specularColor = new Color3(0.25, 0.42, 0.45);
  m.emissiveColor = m.diffuseColor.scale(emissive);
  m.alpha = alpha;
  m.useAlphaFromDiffuseTexture = false;
  return m;
}
const mats = {
  cyan: mat('iridescent cyan', '#39eaff', 1, 0.08),
  gold: mat('gold species', '#ff9a26', 1, 0.06),
  violet: mat('violet fins', '#9b6dff', 0.72, 0.05),
  chuco: mat('chuco skin', '#74ffe4', 1, 0.10),
  eye: mat('wet eye', '#05070b', 1, 0.02),
  plant: mat('aquatic plant', '#0bbf78', 0.92, 0.03),
  purplePlant: mat('purple plant', '#7d55ff', 0.90, 0.03),
  rock: mat('basalt rock', '#1b4c58', 1, 0.00),
  wood: mat('driftwood', '#4a2a18', 1, 0.00),
  pellet: mat('feed pellet', '#b57a38', 1, 0.00),
  bubble: mat('bubble', '#bdfbff', 0.38, 0.25)
};
const waterMat = new PBRMaterial('water volume', scene);
waterMat.albedoColor = new Color3(0.03, 0.45, 0.52);
waterMat.alpha = 0.30;
waterMat.metallic = 0;
waterMat.roughness = 0.18;
waterMat.emissiveColor = new Color3(0.0, 0.08, 0.10);
const glassMat = new PBRMaterial('tank glass', scene);
glassMat.albedoColor = new Color3(0.45, 0.95, 1.0);
glassMat.alpha = 0.16;
glassMat.metallic = 0;
glassMat.roughness = 0.02;

function buildTank() {
  const floor = MeshBuilder.CreateBox('tank floor', { width: 24, height: 0.16, depth: 12 }, scene);
  floor.position.y = -4.05;
  floor.material = mat('dark substrate', '#061713');
  const water = MeshBuilder.CreateBox('water volume', { width: 23.2, height: 8.3, depth: 11.2 }, scene);
  water.position.y = 0.08;
  water.material = waterMat;
  const surface = MeshBuilder.CreateGround('water surface', { width: 23.2, height: 11.2, subdivisions: 32 }, scene);
  surface.position.y = 4.28;
  surface.material = mat('water surface glow', '#04d5ef', 0.34, 0.12);
  for (const [x,z] of [[0,6],[0,-6],[-12,0],[12,0]]) {
    const wall = Math.abs(x) > 0
      ? MeshBuilder.CreateBox('glass side', { width: 0.08, height: 9.2, depth: 12 }, scene)
      : MeshBuilder.CreateBox('glass face', { width: 24, height: 9.2, depth: 0.08 }, scene);
    wall.position.set(x, 0.25, z);
    wall.material = glassMat;
  }
  for (let i = 0; i < 30; i++) {
    const r = MeshBuilder.CreatePolyhedron('rock', { type: 2, size: 0.38 + Math.random() * 0.45 }, scene);
    r.position.set(-10 + Math.random() * 20, -3.75 + Math.random() * 0.45, -5 + Math.random() * 10);
    r.scaling.set(1 + Math.random() * 1.2, 0.45 + Math.random() * 0.55, 0.8 + Math.random() * 0.9);
    r.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    r.material = mats.rock;
  }
  for (let i = 0; i < 34; i++) {
    const p = MeshBuilder.CreateCylinder('plant', { height: 0.8 + Math.random() * 2.6, diameterTop: 0.03, diameterBottom: 0.12, tessellation: 5 }, scene);
    p.position.set(-10.5 + Math.random() * 21, -3.7 + p.getBoundingInfo().boundingBox.extendSize.y, -5.2 + Math.random() * 10.4);
    p.rotation.z = -0.25 + Math.random() * 0.5;
    p.material = i % 5 ? mats.plant : mats.purplePlant;
  }
  for (let i = 0; i < 4; i++) {
    const w = MeshBuilder.CreateCylinder('driftwood', { height: 3.2 + Math.random() * 2.8, diameter: 0.22, tessellation: 7 }, scene);
    w.position.set(-6 + Math.random() * 12, -3.15 + Math.random() * 0.6, -3.8 + Math.random() * 7.6);
    w.rotation.set(1.2, Math.random() * 6.28, 1.0 + Math.random());
    w.material = mats.wood;
  }
}

function makeFin(name, parent, localPos, rot, scale) {
  const fin = MeshBuilder.CreatePlane(name, { width: 1, height: 1 }, scene);
  fin.parent = parent;
  fin.position = localPos;
  fin.rotation = rot;
  fin.scaling = scale;
  fin.material = mats.violet;
  return fin;
}
function makeFish(name, colorMat, kind = 'fish') {
  const root = new TransformNode(name, scene);
  const body = MeshBuilder.CreateSphere(name + ' body', { segments: 24, diameter: 1 }, scene);
  body.parent = root;
  body.scaling.set(kind === 'chuco' ? 2.1 : 1.45, kind === 'cleaner' ? 0.24 : 0.36, kind === 'cleaner' ? 0.22 : 0.28);
  body.material = colorMat;
  const head = MeshBuilder.CreateSphere(name + ' head', { segments: 18, diameter: 1 }, scene);
  head.parent = root;
  head.position.x = kind === 'chuco' ? 1.72 : 1.16;
  head.scaling.set(kind === 'chuco' ? 0.62 : 0.42, kind === 'chuco' ? 0.46 : 0.30, kind === 'chuco' ? 0.36 : 0.23);
  head.material = colorMat;
  const tail = makeFin(name + ' fork tail', root, new Vector3(kind === 'chuco' ? -1.9 : -1.28, 0, 0), new Vector3(0, Math.PI / 2, 0), new Vector3(kind === 'chuco' ? 1.25 : 0.85, kind === 'chuco' ? 0.95 : 0.70, 1));
  const dorsal = makeFin(name + ' dorsal', root, new Vector3(-0.05, 0.38, 0), new Vector3(Math.PI / 2, 0, 0), new Vector3(0.9, 0.42, 1));
  const p1 = makeFin(name + ' pectoral l', root, new Vector3(0.35, -0.04, 0.30), new Vector3(0.3, 0.2, -0.7), new Vector3(0.44, 0.24, 1));
  const p2 = makeFin(name + ' pectoral r', root, new Vector3(0.35, -0.04, -0.30), new Vector3(-0.3, -0.2, -0.7), new Vector3(0.44, 0.24, 1));
  const eye = MeshBuilder.CreateSphere(name + ' eye', { segments: 10, diameter: 0.12 }, scene);
  eye.parent = root;
  eye.position.set(kind === 'chuco' ? 2.18 : 1.47, 0.13, 0.21);
  eye.material = mats.eye;
  const gills = [];
  if (kind === 'chuco') {
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      gills.push(makeFin(name + ' gill', root, new Vector3(1.86, 0.18 - i * 0.17, side * 0.42), new Vector3(side * 0.55, Math.PI / 2, side * 0.3), new Vector3(0.22, 0.55, 1)));
    }
  }
  return { root, body, head, tail, fins: [tail, dorsal, p1, p2, ...gills], kind, velocity: new Vector3(), target: new Vector3(), speed: 1, phase: Math.random() * 6.28, feedable: kind === 'fish', bio: kind === 'chuco', bottom: kind === 'cleaner' };
}
function resetSpecies() {
  for (const f of state.fish) f.root.dispose();
  state.fish.length = 0;
  const palette = state.species % 3 === 1 ? mats.gold : state.species % 3 === 2 ? mats.chuco : mats.cyan;
  const count = state.species % 3 === 1 ? 5 : 7;
  for (let i = 0; i < count; i++) {
    const f = makeFish('school fish ' + i, palette, 'fish');
    f.root.position.set(-9 + Math.random() * 18, -0.9 + Math.random() * 4.0, -4 + Math.random() * 8);
    f.velocity.set(-0.06 + Math.random() * 0.12, -0.02 + Math.random() * 0.04, -0.05 + Math.random() * 0.1);
    f.target.copyFrom(f.root.position);
    f.speed = 0.9 + Math.random() * 0.55;
    state.fish.push(f);
  }
  const chuco = makeFish('Chuco guardian', mats.chuco, 'chuco');
  chuco.root.position.set(-5.7, -2.25, 1.6);
  chuco.target.copyFrom(chuco.root.position);
  chuco.speed = 0.72;
  state.fish.push(chuco);
  const cleaner = makeFish('bottom cleaner', mats.violet, 'cleaner');
  cleaner.root.position.set(6.3, -3.25, -2.6);
  cleaner.target.copyFrom(cleaner.root.position);
  cleaner.speed = 0.28;
  state.fish.push(cleaner);
}
function spawnPellets() {
  for (let i = 0; i < 16; i++) {
    const p = MeshBuilder.CreateSphere('pellet', { segments: 8, diameter: 0.11 }, scene);
    p.position.set(-2 + Math.random() * 4, 3.8, -2.5 + Math.random() * 5);
    p.material = mats.pellet;
    state.pellets.push({ mesh: p, v: new Vector3(-0.02 + Math.random() * 0.04, -0.32 - Math.random() * 0.3, -0.02 + Math.random() * 0.04), ttl: 8 });
  }
}
function spawnBubbles(n = 20) {
  for (let i = 0; i < n; i++) {
    const b = MeshBuilder.CreateSphere('bubble', { segments: 8, diameter: 0.08 + Math.random() * 0.10 }, scene);
    b.position.set(7.3 + Math.random() * 2.2, -3.5 + Math.random() * 0.7, -4 + Math.random() * 8);
    b.material = mats.bubble;
    state.bubbles.push({ mesh: b, speed: 0.7 + Math.random() * 1.5, phase: Math.random() * 6.28 });
  }
}

function steerFish(f, dt) {
  const p = f.root.position;
  if (Math.random() < dt * 0.28 || Vector3.Distance(p, f.target) < 1.1) {
    f.target.set(-10 + Math.random() * 20, f.bottom ? -3.35 + Math.random() * 0.7 : -2.0 + Math.random() * 5.2, -4.7 + Math.random() * 9.4);
    if (f.feedable && state.feed > 0.1) f.target.set(-1.7 + Math.random() * 3.4, 0.4 + Math.random() * 3.2, -1.8 + Math.random() * 3.6);
    if (f.bio && state.biofilter > 0.1) f.target.copyFrom(state.algaeTarget);
  }
  const desired = f.target.subtract(p).normalize().scale(f.speed * dt * 0.09);
  f.velocity.addInPlace(desired).scaleInPlace(0.988);
  f.velocity.x += Math.sin(state.t * 0.8 + f.phase) * dt * 0.015;
  f.velocity.z += Math.cos(state.t * 0.6 + f.phase) * dt * 0.012;
  p.addInPlace(f.velocity.scale(dt * 5.0));
  p.x = Math.max(-10.8, Math.min(10.8, p.x));
  p.y = Math.max(-3.6, Math.min(3.8, p.y));
  p.z = Math.max(-4.8, Math.min(4.8, p.z));
  const yaw = Math.atan2(-f.velocity.z, f.velocity.x || 0.001);
  f.root.rotation.y = yaw;
  f.root.rotation.z = Math.sin(state.t * 1.7 + f.phase) * 0.035;
  f.tail.rotation.z = Math.sin(state.t * 7.0 + f.phase) * 0.28;
}
function updateWorld(dt) {
  state.t += dt;
  state.feed = Math.max(0, state.feed - dt * 0.35);
  state.oxygen = Math.max(0, state.oxygen - dt * 0.55);
  state.shade = Math.max(0, state.shade - dt * 0.28);
  state.biofilter = Math.max(0, state.biofilter - dt * 0.32);
  key.intensity = 1.9 - state.shade * 0.85;
  waterMat.emissiveColor = new Color3(0, 0.08 + state.oxygen * 0.12, 0.10 + state.oxygen * 0.10);
  const tel = state.telemetry;
  tel.temp += (21.7 - tel.temp) * dt * 0.018;
  tel.ph += (7.12 - tel.ph) * dt * 0.015;
  tel.o2 += (8.15 - tel.o2) * dt * 0.025;
  tel.nh3 = Math.max(0.002, Math.min(0.24, tel.nh3 + (0.035 - tel.nh3) * dt * 0.02 - state.biofilter * dt * 0.02));
  for (const f of state.fish) steerFish(f, dt);
  for (let i = state.pellets.length - 1; i >= 0; i--) {
    const p = state.pellets[i];
    p.mesh.position.addInPlace(p.v.scale(dt));
    p.ttl -= dt;
    if (p.mesh.position.y < -3.7 || p.ttl < 0) { p.mesh.dispose(); state.pellets.splice(i, 1); }
  }
  for (let i = state.bubbles.length - 1; i >= 0; i--) {
    const b = state.bubbles[i];
    b.mesh.position.y += b.speed * dt;
    b.mesh.position.x += Math.sin(state.t * 2.2 + b.phase) * dt * 0.08;
    if (b.mesh.position.y > 4.25) { b.mesh.dispose(); state.bubbles.splice(i, 1); }
  }
  if (state.bubbles.length < 10) spawnBubbles(4);
}
function updateHud() {
  const t = state.telemetry;
  meters.temp[0].textContent = t.temp.toFixed(1) + 'C'; meters.temp[1].value = t.temp;
  meters.ph[0].textContent = t.ph.toFixed(2); meters.ph[1].value = t.ph;
  meters.o2[0].textContent = t.o2.toFixed(1); meters.o2[1].value = t.o2;
  meters.nh3[0].textContent = t.nh3.toFixed(3); meters.nh3[1].value = t.nh3;
  nodeEls.forEach((n, i) => n.classList.toggle('hot', i === state.hot));
  modeLabel.textContent = root.clientWidth > 2500 ? '65 Display' : 'Conference';
}
function setAction(action) {
  state.action = action;
  state.hot = { feed: 2, oxygen: 3, shade: 4, biofilter: 5, scan: 6, species: 7 }[action] ?? 0;
  graphState.textContent = 'S:' + action[0].toUpperCase() + action.slice(1);
  const lines = {
    feed: 'P2 magnitude rises: fish steer toward a visible pellet field.',
    oxygen: 'P3 distribution shifts: bubble column raises oxygen and water glow.',
    shade: 'P5 locality cools: light intensity drops and temperature decays.',
    biofilter: 'P7 selection: Chuco targets the algae/biofilter edge.',
    scan: 'P6 recursion: camera orbit and NUMARA trace stabilize runtime state.',
    species: 'P1 relation remaps: active species mesh/material set rotates.'
  };
  graphLine.textContent = lines[action] || graphLine.textContent;
  if (action === 'feed') { state.feed = 1; state.telemetry.nh3 += 0.012; spawnPellets(); }
  if (action === 'oxygen') { state.oxygen = 1; state.telemetry.o2 = Math.min(9.7, state.telemetry.o2 + 0.55); spawnBubbles(32); }
  if (action === 'shade') { state.shade = 1; state.telemetry.temp = Math.max(19.2, state.telemetry.temp - 0.28); }
  if (action === 'biofilter') { state.biofilter = 1; state.telemetry.nh3 = Math.max(0.005, state.telemetry.nh3 - 0.025); }
  if (action === 'species') { state.species += 1; resetSpecies(); }
  document.querySelectorAll('.controls button').forEach((b) => b.classList.toggle('active', b.dataset.action === action));
  fetch('/api/telemetry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, telemetry: state.telemetry, runtime: 'babylon-composed-engine', time: Date.now() }) }).catch(() => {});
}
let audio = null;
function startAudio() {
  if (audio) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const gain = ctx.createGain();
  gain.gain.value = 0.10;
  gain.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.frequency.value = 54;
  osc.connect(gain);
  osc.start();
  audio = { ctx, gain, osc };
  audioLabel.textContent = 'On';
}

startBtn.addEventListener('click', () => { app.classList.add('started'); startAudio(); setAction('scan'); });
document.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => { app.classList.add('started'); startAudio(); setAction(b.dataset.action); }));

buildTank();
resetSpecies();
spawnBubbles(16);
pill.textContent = 'BABYLON ENGINE';
let hudTimer = 0;
engine.runRenderLoop(() => {
  const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
  updateWorld(dt);
  hudTimer += dt;
  if (hudTimer > 0.12) { hudTimer = 0; updateHud(); }
  scene.render();
});
window.addEventListener('resize', () => engine.resize(), { passive: true });