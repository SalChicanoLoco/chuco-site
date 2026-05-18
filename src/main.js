import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
  clock: new THREE.Clock(),
  time: 0,
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
  pellets: []
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

const loadingManager = new THREE.LoadingManager();
const gltfLoader = new GLTFLoader(loadingManager);
const glbCache = new Map();

const tank = {
  w: 24,
  h: 11,
  d: 12,
  minX: -10.8,
  maxX: 10.8,
  minY: -3.8,
  maxY: 4.7,
  minZ: -4.8,
  maxZ: 4.8
};

const world = new THREE.Group();
scene.add(world);

function material(color, roughness = 0.55, metalness = 0.02, transparent = false, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent, opacity, depthWrite: !transparent });
}

const amb = new THREE.HemisphereLight(0x9afaff, 0x051114, 1.45);
scene.add(amb);
const sun = new THREE.DirectionalLight(0xcffcff, 2.25);
sun.position.set(-7, 12, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
const rim = new THREE.PointLight(0x8e55ff, 4, 60, 1.8);
rim.position.set(10, 4, -5);
scene.add(rim);
const mint = new THREE.PointLight(0x00ff9c, 2.7, 44, 1.7);
mint.position.set(-9, -1, 5);
scene.add(mint);

function makeTank() {
  const g = new THREE.Group();
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x72f7ff,
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.18,
    transmission: 0.45,
    thickness: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const edgeMat = material(0x1ee8ff, 0.18, 0.1, true, 0.42);
  const bottomMat = material(0x071a17, 0.75, 0.02);
  const back = new THREE.Mesh(new THREE.BoxGeometry(tank.w, tank.h, 0.08), glassMat);
  back.position.set(0, 0.2, -tank.d / 2);
  const front = new THREE.Mesh(new THREE.BoxGeometry(tank.w, tank.h, 0.08), glassMat);
  front.position.set(0, 0.2, tank.d / 2);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.08, tank.h, tank.d), glassMat);
  left.position.set(-tank.w / 2, 0.2, 0);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.08, tank.h, tank.d), glassMat);
  right.position.set(tank.w / 2, 0.2, 0);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(tank.w, 0.22, tank.d), bottomMat);
  floor.position.y = -tank.h / 2 + 0.05;
  floor.receiveShadow = true;
  const edges = [
    [tank.w, .08, .08, 0, tank.h/2+.2, tank.d/2], [tank.w, .08, .08, 0, tank.h/2+.2, -tank.d/2],
    [tank.w, .08, .08, 0, -tank.h/2+.2, tank.d/2], [tank.w, .08, .08, 0, -tank.h/2+.2, -tank.d/2],
    [.08, tank.h, .08, -tank.w/2, .2, tank.d/2], [.08, tank.h, .08, tank.w/2, .2, tank.d/2],
    [.08, tank.h, .08, -tank.w/2, .2, -tank.d/2], [.08, tank.h, .08, tank.w/2, .2, -tank.d/2]
  ];
  for (const e of edges) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(e[0], e[1], e[2]), edgeMat);
    m.position.set(e[3], e[4], e[5]);
    g.add(m);
  }
  g.add(back, front, left, right, floor);
  world.add(g);
}

const waterUniforms = {
  time: { value: 0 },
  shade: { value: 0 },
  oxygen: { value: 0 },
  biofilter: { value: 0 }
};
const waterMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: waterUniforms,
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
  const rockMat = material(0x1a4a55, .88, .05);
  const plantMat = material(0x08aa76, .65, .02);
  const violetPlant = material(0x875dff, .65, .02);
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
    for (let j = 0; j < 3; j++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 4), stem.material);
      leaf.scale.set(.35, .08, .9);
      leaf.position.set(stem.position.x + rand(-.18, .18), stem.position.y + rand(.2, 1.2), stem.position.z + rand(-.18, .18));
      leaf.rotation.set(rand(-.5,.5), rand(0,6.28), rand(-.5,.5));
      world.add(leaf);
    }
  }
  const woodMat = material(0x4b2a18, .78, .02);
  for (let i = 0; i < 4; i++) {
    const branch = new THREE.Mesh(new THREE.CapsuleGeometry(.16, rand(2.8, 5.2), 6, 12), woodMat);
    branch.position.set(rand(-6, 6), tank.minY + rand(.35, 1.0), rand(-3.5, 3.5));
    branch.rotation.set(rand(.9, 1.5), rand(0, 6.28), rand(.7, 1.3));
    branch.castShadow = true;
    world.add(branch);
  }
}

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function makeFishMesh(colorA, colorB, scale = 1) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: colorA, roughness: .35, metalness: .08, emissive: colorB, emissiveIntensity: .08 }));
  body.scale.set(1.65 * scale, .58 * scale, .42 * scale);
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.55 * scale, 18, 12), body.material);
  head.position.x = 1.38 * scale;
  head.scale.set(1.05, .9, .85);
  group.add(head);
  const tailMat = new THREE.MeshStandardMaterial({ color: colorB, roughness: .42, metalness: .02, transparent: true, opacity: .78, side: THREE.DoubleSide });
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.62 * scale, 1.1 * scale, 3), tailMat);
  tail.position.x = -1.72 * scale;
  tail.rotation.z = Math.PI / 2;
  tail.scale.y = .72;
  group.add(tail);
  const finTop = new THREE.Mesh(new THREE.ConeGeometry(.38 * scale, 1.25 * scale, 3), tailMat);
  finTop.position.set(-.1 * scale, .58 * scale, 0);
  finTop.rotation.z = Math.PI;
  finTop.scale.z = .18;
  group.add(finTop);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x020510, roughness: .1, metalness: .15 });
  const eye1 = new THREE.Mesh(new THREE.SphereGeometry(.075 * scale, 10, 8), eyeMat);
  eye1.position.set(1.85 * scale, .18 * scale, .32 * scale);
  const eye2 = eye1.clone();
  eye2.position.z = -.32 * scale;
  group.add(eye1, eye2);
  group.userData.tail = tail;
  return group;
}

function makeChucoMesh() {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x7fffe6, roughness: .28, metalness: .04, emissive: 0x615cff, emissiveIntensity: .16 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), skin);
  body.scale.set(2.45, .55, .48);
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.78, 24, 16), skin);
  head.position.x = 1.95;
  head.scale.set(1.05, .86, .9);
  group.add(head);
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xb09cff, roughness: .32, metalness: .02, transparent: true, opacity: .74, side: THREE.DoubleSide, emissive: 0x00f7ff, emissiveIntensity: .08 });
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.78, 1.75, 4), tailMat);
  tail.position.x = -2.25;
  tail.rotation.z = Math.PI / 2;
  group.add(tail);
  for (let i = 0; i < 6; i++) {
    const gill = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .75, 4, 8), tailMat);
    const side = i < 3 ? 1 : -1;
    gill.position.set(2.15, .24 - (i % 3) * .18, side * .54);
    gill.rotation.set(.25 * side, 0, .65 - (i % 3) * .25);
    group.add(gill);
  }
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x06121a, roughness: .1, metalness: .15, emissive: 0x33e8ff, emissiveIntensity: .15 });
  const eye1 = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), eyeMat);
  eye1.position.set(2.63, .16, .38);
  const eye2 = eye1.clone(); eye2.position.z = -.38;
  group.add(eye1, eye2);
  group.scale.setScalar(.78);
  group.userData.tail = tail;
  return group;
}

function makeShrimpMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xa6f7ff, roughness: .28, metalness: .02, transparent: true, opacity: .78, emissive: 0x9b5cff, emissiveIntensity: .12 });
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(.34, 12, 8), mat);
    seg.position.x = i * -.32;
    seg.scale.set(1, .62, .5);
    group.add(seg);
  }
  for (let i = 0; i < 8; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.012, .015, .55, 5), mat);
    leg.position.set(-.2 - i * .15, -.32, i % 2 ? .18 : -.18);
    leg.rotation.x = i % 2 ? .55 : -.55;
    group.add(leg);
  }
  const antennaMat = new THREE.MeshBasicMaterial({ color: 0xffb3ff, transparent: true, opacity: .75 });
  for (let i = 0; i < 2; i++) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 1.5, 5), antennaMat);
    ant.position.set(.35, .2, i ? .22 : -.22);
    ant.rotation.z = -1.05;
    ant.rotation.y = i ? .4 : -.4;
    group.add(ant);
  }
  group.scale.setScalar(.72);
  return group;
}

function addInhabitant(kind, mesh, opts) {
  const item = {
    kind,
    mesh,
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

function resetInhabitants() {
  for (const item of state.inhabitants) world.remove(item.mesh);
  state.inhabitants.length = 0;
  const palettes = [
    [0x4eeaff, 0x8f5cff, 7],
    [0xffa51f, 0x00ffcc, 5],
    [0x47ffd4, 0x8c5cff, 6]
  ];
  const p = palettes[state.speciesSet % palettes.length];
  for (let i = 0; i < p[2]; i++) {
    addInhabitant('fish', makeFishMesh(p[0], p[1], rand(.55, .78)), {
      x: rand(tank.minX + 1, tank.maxX - 1), y: rand(-.8, 3.2), z: rand(tank.minZ + .5, tank.maxZ - .5),
      zoneY: rand(-.6, 3.4), speed: rand(.95, 1.35), feedable: true
    });
  }
  addInhabitant('chuco', makeChucoMesh(), { x: -5.8, y: -2.25, z: 1.8, zoneY: -2.0, speed: .72, feedable: false, bio: true });
  addInhabitant('cleaner', makeShrimpMesh(), { x: 6.5, y: -3.28, z: -2.6, zoneY: -3.3, speed: .25, feedable: false, bottom: true });
}

function spawnBubbles(n = 28) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xbdfbff, transparent: true, opacity: .55 });
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rand(.035, .11), 8, 6), mat);
    b.position.set(rand(7, 9.6), tank.minY + rand(.1, .8), rand(-3.8, 3.8));
    world.add(b);
    state.bubbles.push({ mesh: b, speed: rand(.7, 1.8), wobble: rand(0, 6.28) });
  }
}

function spawnPellets(n = 14) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xb67a39, roughness: .75 });
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), mat);
    p.position.set(rand(-1.8, 2.2), tank.maxY - .35, rand(-2.5, 2.5));
    world.add(p);
    state.pellets.push({ mesh: p, vel: new THREE.Vector3(rand(-.05,.05), -rand(.35,.65), rand(-.05,.05)), ttl: 10 });
  }
}

function initScene() {
  makeTank();
  makeWater();
  makeEnvironment();
  resetInhabitants();
  spawnBubbles(16);
  livePill.textContent = 'REAL 3D';
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

function trigger(action) {
  state.action = action;
  state.hot = { feed:2, oxygen:3, shade:4, biofilter:5, scan:6, species:7 }[action] ?? 0;
  graphState.textContent = 'S:' + action[0].toUpperCase() + action.slice(1);
  const lines = {
    feed: 'P2 magnitude rises: fish steer toward pellet field.',
    oxygen: 'P3 distribution shifts: bubble column increases dissolved oxygen.',
    shade: 'P5 locality cools: water column dims and temperature drops.',
    biofilter: 'P7 selection: Chuco patrols the algae/biofilter edge.',
    scan: 'P6 recursion visible: NUMARA trace scans the tank volume.',
    species: 'P1 relation remaps: model population and depth roles rotate.'
  };
  graphLine.textContent = lines[action] || graphLine.textContent;
  if (action === 'feed') { state.feed = 1; state.telemetry.nh3 += .012; spawnPellets(); }
  if (action === 'oxygen') { state.oxygen = 1; state.telemetry.o2 = Math.min(9.7, state.telemetry.o2 + .55); spawnBubbles(24); }
  if (action === 'shade') { state.shade = 1; state.telemetry.temp = Math.max(19.2, state.telemetry.temp - .28); }
  if (action === 'biofilter') { state.biofilter = 1; state.telemetry.nh3 = Math.max(.005, state.telemetry.nh3 - .025); }
  if (action === 'scan') state.scan = 1;
  if (action === 'species') { state.speciesSet += 1; resetInhabitants(); }
  document.querySelectorAll('.controls button').forEach((b) => b.classList.toggle('active', b.dataset.action === action));
  actionSound(action);
  fetch('/api/telemetry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, telemetry: state.telemetry, time: Date.now() }) }).catch(() => {});
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
  if (item.mesh.userData.tail) item.mesh.userData.tail.rotation.y = Math.sin(t * 5.2 + item.phase) * .28;
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

initScene();
resize();
animate();
