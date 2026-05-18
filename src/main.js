import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MODEL_REGISTRY } from './modelRegistry.js';

const $ = (id) => document.getElementById(id);
const root = $('threeRoot');
const app = $('app');
const startBtn = $('startBtn');
const audioLabel = $('audioLabel');
const livePill = $('livePill');
const modeLabel = $('modeLabel');
const graphState = $('graphState');
const graphLine = $('graphLine');
const nodesEl = $('nodes');
const meters = {
  temp: [$('tempVal'), $('tempMeter')],
  ph: [$('phVal'), $('phMeter')],
  o2: [$('o2Val'), $('o2Meter')],
  nh3: [$('nh3Val'), $('nh3Meter')]
};

const state = {
  started: false,
  time: 0,
  clock: new THREE.Clock(),
  quality: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'battery' : 'conference',
  action: 'biofilter',
  hot: 5,
  feed: 0,
  oxygen: 0,
  shade: 0,
  scan: 0,
  biofilter: 0,
  speciesSet: 0,
  telemetry: { temp: 21.6, ph: 7.12, o2: 8.2, nh3: 0.03 },
  inhabitants: [],
  bubbles: [],
  pellets: [],
  modelTier: 'loading'
};

for (const label of ['P0','P1','P2','P3','P4','P5','P6','P7']) {
  const node = document.createElement('div');
  node.className = 'node';
  node.textContent = label;
  nodesEl.appendChild(node);
}
const nodeEls = [...nodesEl.children];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x031014);
scene.fog = new THREE.FogExp2(0x06242d, 0.035);

const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 140);
camera.position.set(0, 7.2, 26);
camera.lookAt(0, 1.3, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

const gltfLoader = new GLTFLoader();
const modelCache = new Map();

const tank = {
  w: 24, h: 11, d: 12,
  minX: -10.8, maxX: 10.8,
  minY: -3.8, maxY: 4.7,
  minZ: -4.8, maxZ: 4.8
};

const world = new THREE.Group();
scene.add(world);

const amb = new THREE.HemisphereLight(0x9afaff, 0x051114, 1.45);
scene.add(amb);
const sun = new THREE.DirectionalLight(0xcffcff, 2.1);
sun.position.set(-7, 12, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
const rim = new THREE.PointLight(0x8e55ff, 3.5, 60, 1.8);
rim.position.set(10, 4, -5);
scene.add(rim);
const mint = new THREE.PointLight(0x00ff9c, 2.5, 44, 1.7);
mint.position.set(-9, -1, 5);
scene.add(mint);

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function mat(color, roughness = 0.55, metalness = 0.02, transparent = false, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent, opacity, depthWrite: !transparent });
}

function makeTank() {
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x72f7ff, roughness: 0.05, transparent: true,
    opacity: 0.17, transmission: 0.35, thickness: 0.12,
    side: THREE.DoubleSide, depthWrite: false
  });
  const edgeMat = mat(0x1ee8ff, 0.18, 0.1, true, 0.42);
  const bottomMat = mat(0x071a17, 0.75, 0.02);
  const parts = [
    [tank.w, tank.h, 0.08, 0, 0.2, -tank.d / 2, glassMat],
    [tank.w, tank.h, 0.08, 0, 0.2, tank.d / 2, glassMat],
    [0.08, tank.h, tank.d, -tank.w / 2, 0.2, 0, glassMat],
    [0.08, tank.h, tank.d, tank.w / 2, 0.2, 0, glassMat],
    [tank.w, 0.22, tank.d, 0, -tank.h / 2 + 0.05, 0, bottomMat]
  ];
  for (const p of parts) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(p[0], p[1], p[2]), p[6]);
    mesh.position.set(p[3], p[4], p[5]);
    mesh.receiveShadow = true;
    world.add(mesh);
  }
  const edges = [
    [tank.w, .08, .08, 0, tank.h/2+.2, tank.d/2], [tank.w, .08, .08, 0, tank.h/2+.2, -tank.d/2],
    [tank.w, .08, .08, 0, -tank.h/2+.2, tank.d/2], [tank.w, .08, .08, 0, -tank.h/2+.2, -tank.d/2],
    [.08, tank.h, .08, -tank.w/2, .2, tank.d/2], [.08, tank.h, .08, tank.w/2, .2, tank.d/2],
    [.08, tank.h, .08, -tank.w/2, .2, -tank.d/2], [.08, tank.h, .08, tank.w/2, .2, -tank.d/2]
  ];
  for (const e of edges) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(e[0], e[1], e[2]), edgeMat);
    mesh.position.set(e[3], e[4], e[5]);
    world.add(mesh);
  }
}

const waterUniforms = {
  time: { value: 0 }, shade: { value: 0 }, oxygen: { value: 0 }, biofilter: { value: 0 }
};
const waterMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: waterUniforms,
  vertexShader: `varying vec2 vUv; uniform float time; void main(){vUv=uv; vec3 p=position; p.z += sin(p.x*.55+time*.7)*.09 + sin(p.y*.4+time*.35)*.04; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
  fragmentShader: `varying vec2 vUv; uniform float time; uniform float shade; uniform float oxygen; uniform float biofilter; void main(){float wave=sin(vUv.x*26.0+time*.55)*sin(vUv.y*13.0-time*.3); vec3 c=mix(vec3(.02,.26,.31),vec3(.09,.77,.86),smoothstep(.15,1.,wave)); c += vec3(0.,.45,.22)*biofilter*.22 + vec3(.2,.7,.9)*oxygen*.18; c *= 1.0 - shade*.32; gl_FragColor=vec4(c,.38);}`
});
function makeWater() {
  const top = new THREE.Mesh(new THREE.PlaneGeometry(tank.w * .96, tank.d * .96, 64, 32), waterMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = tank.maxY - .4;
  top.renderOrder = 4;
  world.add(top);
  const volume = new THREE.Mesh(new THREE.BoxGeometry(tank.w * .94, tank.h * .86, tank.d * .94), new THREE.MeshBasicMaterial({ color: 0x0b6676, transparent: true, opacity: .105, depthWrite: false }));
  volume.position.y = .1;
  volume.renderOrder = 1;
  world.add(volume);
}

function makeEnvironment() {
  const rockMat = mat(0x1a4a55, .88, .05);
  const plantMat = mat(0x08aa76, .65, .02);
  const violetPlant = mat(0x875dff, .65, .02);
  for (let i = 0; i < 26; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.18, .55), 0), rockMat);
    r.position.set(rand(tank.minX, tank.maxX), tank.minY + rand(.02, .35), rand(tank.minZ, tank.maxZ));
    r.scale.set(rand(1, 1.9), rand(.45, .9), rand(.8, 1.7));
    r.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    r.castShadow = true; r.receiveShadow = true;
    world.add(r);
  }
  for (let i = 0; i < 32; i++) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.025, .055, rand(1.0, 3.3), 5), i % 5 === 0 ? violetPlant : plantMat);
    stem.position.set(rand(tank.minX, tank.maxX), tank.minY + stem.geometry.parameters.height / 2, rand(tank.minZ, tank.maxZ));
    stem.rotation.z = rand(-.25, .25);
    world.add(stem);
  }
  const woodMat = mat(0x4b2a18, .78, .02);
  for (let i = 0; i < 4; i++) {
    const branch = new THREE.Mesh(new THREE.CapsuleGeometry(.16, rand(2.8, 5.2), 6, 12), woodMat);
    branch.position.set(rand(-6, 6), tank.minY + rand(.35, 1.0), rand(-3.5, 3.5));
    branch.rotation.set(rand(.9, 1.5), rand(0, 6.28), rand(.7, 1.3));
    branch.castShadow = true;
    world.add(branch);
  }
}

function tintModel(rootMesh, color) {
  rootMesh.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.material) {
        obj.material = obj.material.clone();
        if (obj.material.color) obj.material.color.multiplyScalar(1.08).lerp(new THREE.Color(color), 0.16);
        obj.material.roughness = Math.min(0.75, obj.material.roughness ?? 0.45);
      }
    }
  });
}

function emergencyMesh(role, color = 0x55eaff) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), mat(color, .42, .05));
  body.scale.set(role === 'chuco' ? 2.2 : 1.55, role === 'cleaner' ? .24 : .44, role === 'cleaner' ? .24 : .32);
  g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.55, 1.0, 3), mat(0x9b72ff, .45, .02, true, .75));
  tail.position.x = -1.35;
  tail.rotation.z = Math.PI / 2;
  g.add(tail);
  g.userData.tail = tail;
  return g;
}

async function loadRegistryModel(key, color) {
  const entry = MODEL_REGISTRY[key];
  if (!entry) return emergencyMesh('fish', color);
  try {
    if (modelCache.has(key)) return modelCache.get(key).clone(true);
    const gltf = await gltfLoader.loadAsync(entry.path);
    const model = gltf.scene || gltf.scenes[0];
    model.scale.setScalar(entry.scale || 1);
    model.rotation.y = entry.rotationY || 0;
    tintModel(model, color);
    model.userData.modelSource = entry.path;
    modelCache.set(key, model);
    state.modelTier = 'committed-base-gltf';
    livePill.textContent = 'BASE GLTF';
    return model.clone(true);
  } catch (err) {
    console.warn('Model load failed, using emergency mesh:', key, err);
    state.modelTier = 'procedural-emergency';
    livePill.textContent = '3D FALLBACK';
    return emergencyMesh(entry.role || 'fish', color);
  }
}

function addInhabitant(kind, mesh, opts) {
  const item = {
    kind, mesh,
    pos: new THREE.Vector3(opts.x, opts.y, opts.z),
    vel: new THREE.Vector3(rand(-.18, .18), rand(-.04, .04), rand(-.08, .08)),
    target: new THREE.Vector3(opts.x, opts.y, opts.z),
    zoneY: opts.zoneY,
    speed: opts.speed,
    phase: rand(0, Math.PI * 2),
    feedable: opts.feedable,
    bio: opts.bio,
    bottom: opts.bottom
  };
  mesh.position.copy(item.pos);
  world.add(mesh);
  state.inhabitants.push(item);
}

async function resetInhabitants() {
  for (const item of state.inhabitants) world.remove(item.mesh);
  state.inhabitants.length = 0;
  const palettes = [
    [0x4eeaff, 0x8f5cff, 7, 'fish_schooling'],
    [0xffa51f, 0x00ffcc, 5, 'fish_cichlid'],
    [0x47ffd4, 0x8c5cff, 6, 'fish_schooling']
  ];
  const p = palettes[state.speciesSet % palettes.length];
  for (let i = 0; i < p[2]; i++) {
    const model = await loadRegistryModel(p[3], p[0]);
    addInhabitant('fish', model, {
      x: rand(tank.minX + 1, tank.maxX - 1), y: rand(-.8, 3.2), z: rand(tank.minZ + .5, tank.maxZ - .5),
      zoneY: rand(-.6, 3.4), speed: rand(.95, 1.35), feedable: true
    });
  }
  addInhabitant('chuco', await loadRegistryModel('chuco_guardian', 0x7fffe6), { x: -5.8, y: -2.25, z: 1.8, zoneY: -2.0, speed: .72, feedable: false, bio: true });
  addInhabitant('cleaner', await loadRegistryModel('bottom_cleaner', 0xc29cff), { x: 6.5, y: -3.28, z: -2.6, zoneY: -3.3, speed: .25, feedable: false, bottom: true });
}

function spawnBubbles(n = 28) {
  const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xbdfbff, transparent: true, opacity: .55 });
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rand(.035, .11), 8, 6), bubbleMat);
    b.position.set(rand(7, 9.6), tank.minY + rand(.1, .8), rand(-3.8, 3.8));
    world.add(b);
    state.bubbles.push({ mesh: b, speed: rand(.7, 1.8), wobble: rand(0, 6.28) });
  }
}

function spawnPellets(n = 14) {
  const pelletMat = mat(0xb67a39, .75, 0);
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), pelletMat);
    p.position.set(rand(-1.8, 2.2), tank.maxY - .35, rand(-2.5, 2.5));
    world.add(p);
    state.pellets.push({ mesh: p, vel: new THREE.Vector3(rand(-.05,.05), -rand(.35,.65), rand(-.05,.05)), ttl: 10 });
  }
}

async function initScene() {
  makeTank();
  makeWater();
  makeEnvironment();
  await resetInhabitants();
  spawnBubbles(16);
  livePill.textContent = state.modelTier === 'committed-base-gltf' ? 'BASE GLTF' : 'REAL 3D';
}

let audio = null;
function startAudio() {
  if (audio) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const main = ctx.createGain(); main.gain.value = .13; main.connect(ctx.destination);
  const drone = ctx.createOscillator(); drone.frequency.value = 54;
  const lfo = ctx.createOscillator(); lfo.frequency.value = .07;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 14;
  lfo.connect(lfoGain); lfoGain.connect(drone.frequency); drone.connect(main);
  const ping = ctx.createOscillator(); ping.type = 'triangle'; ping.frequency.value = 164;
  const pingGain = ctx.createGain(); pingGain.gain.value = .001;
  const filter = ctx.createBiquadFilter(); filter.frequency.value = 720;
  ping.connect(filter); filter.connect(pingGain); pingGain.connect(main);
  drone.start(); lfo.start(); ping.start();
  audio = { ctx, pingGain, filter };
  audioLabel.textContent = 'On';
}
function actionSound(type) {
  if (!audio) return;
  const n = audio.ctx.currentTime;
  audio.pingGain.gain.cancelScheduledValues(n);
  audio.pingGain.gain.setValueAtTime(.001, n);
  audio.pingGain.gain.exponentialRampToValueAtTime(type === 'oxygen' ? .18 : .08, n + .04);
  audio.pingGain.gain.exponentialRampToValueAtTime(.001, n + .58);
  audio.filter.frequency.setTargetAtTime(type === 'biofilter' ? 980 : 520, n, .05);
}

async function trigger(action) {
  state.action = action;
  state.hot = { feed:2, oxygen:3, shade:4, biofilter:5, scan:6, species:7 }[action] ?? 0;
  graphState.textContent = 'S:' + action[0].toUpperCase() + action.slice(1);
  const lines = {
    feed: 'P2 magnitude rises: fish steer toward pellet field.',
    oxygen: 'P3 distribution shifts: bubble column increases dissolved oxygen.',
    shade: 'P5 locality cools: water column dims and temperature drops.',
    biofilter: 'P7 selection: Chuco patrols the algae/biofilter edge.',
    scan: 'P6 recursion visible: NUMARA trace scans the tank volume.',
    species: 'P1 relation remaps: committed base models rotate by role.'
  };
  graphLine.textContent = lines[action] || graphLine.textContent;
  if (action === 'feed') { state.feed = 1; state.telemetry.nh3 += .012; spawnPellets(); }
  if (action === 'oxygen') { state.oxygen = 1; state.telemetry.o2 = Math.min(9.7, state.telemetry.o2 + .55); spawnBubbles(24); }
  if (action === 'shade') { state.shade = 1; state.telemetry.temp = Math.max(19.2, state.telemetry.temp - .28); }
  if (action === 'biofilter') { state.biofilter = 1; state.telemetry.nh3 = Math.max(.005, state.telemetry.nh3 - .025); }
  if (action === 'scan') state.scan = 1;
  if (action === 'species') { state.speciesSet += 1; await resetInhabitants(); }
  document.querySelectorAll('.controls button').forEach((b) => b.classList.toggle('active', b.dataset.action === action));
  actionSound(action);
  fetch('/api/telemetry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, telemetry: state.telemetry, time: Date.now(), modelTier: state.modelTier }) }).catch(() => {});
}

function steer(item, dt) {
  const t = state.time;
  let desired = item.target.clone();
  if (t % 5 < dt || item.pos.distanceTo(item.target) < 1.2) {
    desired.set(rand(tank.minX, tank.maxX), item.bottom ? rand(tank.minY + .2, tank.minY + 1.1) : rand(tank.minY + 1.6, tank.maxY - 1.1), rand(tank.minZ, tank.maxZ));
    if (item.bio && state.biofilter > .1) desired.set(rand(tank.minX, tank.minX + 3.6), rand(tank.minY + .7, tank.minY + 2.2), rand(-3, 3));
    if (item.feedable && state.feed > .1) desired.set(rand(-2.5, 2.5), rand(.6, 3.6), rand(-2.2, 2.2));
    item.target.copy(desired);
  }
  const acc = desired.sub(item.pos).normalize().multiplyScalar(item.speed * dt * .55);
  item.vel.add(acc).multiplyScalar(.987);
  item.vel.x += Math.sin(t * .65 + item.phase) * dt * .02;
  item.vel.z += Math.cos(t * .49 + item.phase) * dt * .016;
  item.vel.clampLength(0, item.speed * .08);
  item.pos.addScaledVector(item.vel, dt * 4.4);
  item.pos.x = clamp(item.pos.x, tank.minX, tank.maxX);
  item.pos.y = clamp(item.pos.y, tank.minY + .15, tank.maxY - .7);
  item.pos.z = clamp(item.pos.z, tank.minZ, tank.maxZ);
  item.mesh.position.copy(item.pos);
  const yaw = Math.atan2(-item.vel.z, item.vel.x || .001);
  item.mesh.rotation.y = yaw;
  item.mesh.rotation.z = Math.sin(t * 1.8 + item.phase) * .035;
}

function update(dt) {
  state.time += dt;
  state.feed = Math.max(0, state.feed - dt * .35);
  state.oxygen = Math.max(0, state.oxygen - dt * .55);
  state.shade = Math.max(0, state.shade - dt * .25);
  state.scan = Math.max(0, state.scan - dt * .62);
  state.biofilter = Math.max(0, state.biofilter - dt * .32);
  waterUniforms.time.value = state.time;
  waterUniforms.oxygen.value = state.oxygen;
  waterUniforms.shade.value = state.shade;
  waterUniforms.biofilter.value = state.biofilter;
  const tel = state.telemetry;
  tel.temp += (21.7 - tel.temp) * dt * .018;
  tel.ph += (7.12 - tel.ph) * dt * .015;
  tel.o2 += (8.15 - tel.o2) * dt * .025;
  tel.nh3 = Math.max(.002, Math.min(.24, tel.nh3 + (.035 - tel.nh3) * dt * .02 - state.biofilter * dt * .02));
  for (const item of state.inhabitants) steer(item, dt);
  for (let i = state.bubbles.length - 1; i >= 0; i--) {
    const b = state.bubbles[i];
    b.mesh.position.y += b.speed * dt;
    b.mesh.position.x += Math.sin(state.time * 2 + b.wobble) * dt * .08;
    if (b.mesh.position.y > tank.maxY - .4) { world.remove(b.mesh); state.bubbles.splice(i, 1); }
  }
  for (let i = state.pellets.length - 1; i >= 0; i--) {
    const p = state.pellets[i];
    p.mesh.position.addScaledVector(p.vel, dt);
    p.ttl -= dt;
    if (p.mesh.position.y < tank.minY + .25 || p.ttl <= 0) { world.remove(p.mesh); state.pellets.splice(i, 1); }
  }
  if (state.bubbles.length < 10) spawnBubbles(4);
  nodeEls.forEach((e, i) => e.classList.toggle('hot', i === state.hot));
  modeLabel.textContent = root.clientWidth > 2500 ? '65 Display' : 'Conference';
}

let hudTimer = 0;
function updateHud(dt) {
  hudTimer += dt;
  if (hudTimer < .12) return;
  hudTimer = 0;
  const t = state.telemetry;
  meters.temp[0].textContent = t.temp.toFixed(1) + 'C'; meters.temp[1].value = t.temp;
  meters.ph[0].textContent = t.ph.toFixed(2); meters.ph[1].value = t.ph;
  meters.o2[0].textContent = t.o2.toFixed(1); meters.o2[1].value = t.o2;
  meters.nh3[0].textContent = t.nh3.toFixed(3); meters.nh3[1].value = t.nh3;
}

function resize() {
  const w = Math.max(1, root.clientWidth);
  const h = Math.max(1, root.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const cap = state.quality === 'battery' ? 1.0 : 1.55;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
}
window.addEventListener('resize', resize, { passive: true });

startBtn.addEventListener('click', () => {
  state.started = true;
  app.classList.add('started');
  startAudio();
  trigger('scan');
});
document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!state.started) { state.started = true; app.classList.add('started'); startAudio(); }
    trigger(button.dataset.action);
  });
});

function animate() {
  const dt = Math.min(.05, state.clock.getDelta());
  update(dt);
  updateHud(dt);
  camera.position.x = Math.sin(state.time * .08) * .75;
  camera.lookAt(0, .6, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

await initScene();
resize();
animate();
