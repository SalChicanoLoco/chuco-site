const skinRoot = document.getElementById('threeRoot');
const skinCanvas = document.createElement('canvas');
const skinCtx = skinCanvas.getContext('2d');
skinCanvas.setAttribute('aria-hidden', 'true');
skinCanvas.style.position = 'absolute';
skinCanvas.style.inset = '0';
skinCanvas.style.width = '100%';
skinCanvas.style.height = '100%';
skinCanvas.style.pointerEvents = 'none';
skinCanvas.style.zIndex = '3';
skinRoot.appendChild(skinCanvas);

const skinState = { t: 0, last: performance.now(), feed: 0, bio: 0, species: 0, creatures: [] };
const palettes = [
  ['#39f3ff', '#8d65ff', '#effcff'],
  ['#ff9f2e', '#ffdd7b', '#fff6d8'],
  ['#73ffdb', '#8b65ff', '#f4fffb']
];

function sr(a, b) { return a + Math.random() * (b - a); }
function resetSkinCreatures() {
  skinState.creatures.length = 0;
  const p = palettes[skinState.species % palettes.length];
  for (let i = 0; i < 7; i++) {
    skinState.creatures.push({ kind: 'fish', x: sr(.26,.72), y: sr(.32,.58), z: sr(.72,1.12), vx: sr(-.03,.03), vy: sr(-.012,.012), phase: sr(0,7), c: p });
  }
  skinState.creatures.push({ kind: 'chuco', x: .32, y: .63, z: 1.28, vx: .012, vy: -.004, phase: 1, c: ['#83ffe9','#b07cff','#f9ffff'] });
  skinState.creatures.push({ kind: 'cleaner', x: .72, y: .70, z: .78, vx: -.008, vy: .002, phase: 2, c: ['#9bf8ff','#c58aff','#f7ffff'] });
}
resetSkinCreatures();

function resizeSkin() {
  const r = skinRoot.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  skinCanvas.width = Math.max(1, Math.floor(r.width * dpr));
  skinCanvas.height = Math.max(1, Math.floor(r.height * dpr));
  skinCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resizeSkin, { passive: true });

function fishPath(ctx, len, h, tail) {
  ctx.beginPath();
  ctx.moveTo(len * .48, 0);
  ctx.bezierCurveTo(len * .28, -h * .78, -len * .28, -h * .76, -len * .50, 0);
  ctx.bezierCurveTo(-len * .28, h * .76, len * .28, h * .78, len * .48, 0);
  ctx.closePath();
  ctx.moveTo(-len * .48, 0);
  ctx.lineTo(-len * .72, -tail);
  ctx.lineTo(-len * .64, 0);
  ctx.lineTo(-len * .72, tail);
  ctx.closePath();
}

function drawFish(ctx, e, w, h) {
  const p = e.c;
  const x = e.x * w, y = e.y * h;
  const s = Math.min(w,h) * .055 * e.z;
  const ang = Math.atan2(e.vy, e.vx || .001);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(-s*1.2, -s, s*1.3, s);
  g.addColorStop(0, p[1]); g.addColorStop(.45, p[0]); g.addColorStop(1, p[2]);
  ctx.shadowColor = p[0]; ctx.shadowBlur = 18;
  ctx.fillStyle = g;
  fishPath(ctx, s*3.0, s*.78, s*.72);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(240,255,255,.55)'; ctx.lineWidth = Math.max(1, s*.035); ctx.stroke();
  ctx.fillStyle = 'rgba(210,245,255,.75)';
  ctx.beginPath(); ctx.ellipse(s*.10, -s*.58, s*.46, s*.16, -.08, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s*.02, s*.52, s*.34, s*.12, .18, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#061016'; ctx.beginPath(); ctx.arc(s*1.08, -s*.12, s*.105, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(s*1.11, -s*.15, s*.035, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawChuco(ctx, e, w, h) {
  const x = e.x * w, y = e.y * h;
  const s = Math.min(w,h) * .075 * e.z;
  const ang = Math.atan2(e.vy, e.vx || .001);
  ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
  const g = ctx.createLinearGradient(-s*1.7, -s, s*1.9, s);
  g.addColorStop(0, '#9b7cff'); g.addColorStop(.45, '#54ffe2'); g.addColorStop(1, '#f6ffff');
  ctx.shadowColor = '#4fffe2'; ctx.shadowBlur = 22;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(s*1.8, 0);
  ctx.bezierCurveTo(s*.95, -s*.62, -s*.95, -s*.54, -s*1.75, 0);
  ctx.bezierCurveTo(-s*.95, s*.58, s*.95, s*.62, s*1.8, 0);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s*1.55, 0, s*.68, s*.48, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(176,124,255,.72)';
  for (let side of [-1,1]) for (let i=0;i<3;i++) {
    ctx.beginPath();
    ctx.ellipse(s*1.72, side*(s*.38+i*s*.16), s*.12, s*.48, side*.72, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(190,245,255,.72)'; ctx.beginPath(); ctx.ellipse(-s*1.5, 0, s*.92, s*.34, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#061016'; ctx.beginPath(); ctx.arc(s*2.05, -s*.13, s*.10, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawCleaner(ctx, e, w, h) {
  const x = e.x*w, y = e.y*h, s = Math.min(w,h)*.04*e.z;
  ctx.save(); ctx.translate(x,y); ctx.rotate(Math.atan2(e.vy, e.vx || .001));
  ctx.fillStyle = 'rgba(170,245,255,.78)'; ctx.shadowColor = '#9b7cff'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.ellipse(0,0,s*1.5,s*.45,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(230,245,255,.65)'; ctx.lineWidth = Math.max(1,s*.06);
  for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*s*.35,s*.25);ctx.lineTo(i*s*.35-s*.35,s*.85);ctx.stroke();}
  ctx.restore();
}

function skinLoop(now) {
  const dt = Math.min(.05, (now - skinState.last) / 1000 || .016);
  skinState.last = now; skinState.t += dt;
  const w = skinCanvas.clientWidth, h = skinCanvas.clientHeight;
  skinCtx.clearRect(0,0,w,h);
  skinCtx.globalCompositeOperation = 'source-over';
  for (const e of skinState.creatures) {
    const seekX = skinState.feed > 0 ? .50 : .50 + Math.sin(skinState.t*.17 + e.phase) * .34;
    const seekY = e.kind === 'chuco' ? .66 + Math.sin(skinState.t*.2)*.06 : .45 + Math.cos(skinState.t*.22 + e.phase) * .16;
    e.vx += (seekX - e.x) * dt * .025;
    e.vy += (seekY - e.y) * dt * .025;
    e.vx += Math.sin(skinState.t*.9 + e.phase) * dt * .004;
    e.vy += Math.cos(skinState.t*.7 + e.phase) * dt * .003;
    e.vx *= .985; e.vy *= .985;
    e.x += e.vx; e.y += e.vy;
    if (e.x < .12 || e.x > .88) e.vx *= -1;
    if (e.y < .20 || e.y > .78) e.vy *= -1;
    e.x = Math.max(.1, Math.min(.9, e.x)); e.y = Math.max(.18, Math.min(.80, e.y));
    if (e.kind === 'chuco') drawChuco(skinCtx, e, w, h);
    else if (e.kind === 'cleaner') drawCleaner(skinCtx, e, w, h);
    else drawFish(skinCtx, e, w, h);
  }
  skinState.feed = Math.max(0, skinState.feed - dt*.45);
  skinState.bio = Math.max(0, skinState.bio - dt*.35);
  requestAnimationFrame(skinLoop);
}

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'feed') skinState.feed = 1;
    if (action === 'biofilter') skinState.bio = 1;
    if (action === 'species') { skinState.species += 1; resetSkinCreatures(); }
  });
});

resizeSkin();
requestAnimationFrame(skinLoop);
