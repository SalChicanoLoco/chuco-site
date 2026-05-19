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

for (const label of ['P0','P1','P2','P3','P4','P5','P6','P7']) {
  const node = document.createElement('div');
  node.className = 'node';
  node.textContent = label;
  nodesEl.appendChild(node);
}
const nodeEls = [...nodesEl.children];

const state = {
  t: 0,
  last: performance.now(),
  started: false,
  hot: 5,
  feed: 0,
  oxygen: 0,
  shade: 0,
  scan: 0,
  biofilter: 0,
  speciesSet: 0,
  telemetry: { temp: 21.6, ph: 7.12, o2: 8.2, nh3: 0.03 },
  fish: [],
  dpr: 1,
  w: 1,
  h: 1
};

const canvas = document.createElement('canvas');
root.appendChild(canvas);
const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' });
if (!gl) {
  livePill.textContent = 'WEBGL FAIL';
  throw new Error('WebGL unavailable');
}

const VERT = `
attribute vec3 position;
attribute vec3 normal;
uniform mat4 mvp;
uniform mat4 model;
varying vec3 vN;
void main(){
  vN = mat3(model) * normal;
  gl_Position = mvp * vec4(position,1.0);
}`;
const FRAG = `
precision mediump float;
varying vec3 vN;
uniform vec3 color;
uniform float alpha;
uniform float glow;
void main(){
  vec3 n = normalize(vN);
  vec3 light = normalize(vec3(-0.45,0.8,0.55));
  float d = max(dot(n,light),0.0);
  float rim = pow(1.0 - abs(n.z),2.0);
  vec3 c = color * (0.35 + 0.76*d) + vec3(0.0,0.9,0.7)*rim*0.20 + glow*vec3(0.2,0.8,1.0);
  gl_FragColor = vec4(c, alpha);
}`;
const WATER_VERT = `
attribute vec3 position;
uniform mat4 mvp;
uniform float time;
varying vec2 v;
void main(){
  vec3 p=position;
  p.y += sin(p.x*.8+time*.8)*.08 + cos(p.z*.9+time*.55)*.05;
  v=position.xz;
  gl_Position=mvp*vec4(p,1.0);
}`;
const WATER_FRAG = `
precision mediump float;
varying vec2 v;
uniform float time;
uniform float shade;
uniform float oxygen;
uniform float biofilter;
void main(){
  float w=sin(v.x*2.4+time*.7)*cos(v.y*2.0-time*.35);
  vec3 c=mix(vec3(.02,.22,.28),vec3(.06,.72,.82),smoothstep(-.2,1.,w));
  c += vec3(0.,.5,.25)*biofilter*.22 + vec3(.2,.6,.9)*oxygen*.2;
  c *= 1.0-shade*.32;
  gl_FragColor=vec4(c,.40);
}`;

function shader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
const meshProg = program(VERT, FRAG);
const waterProg = program(WATER_VERT, WATER_FRAG);

function mat4(){return new Float32Array(16)}
function ident(o){o.set([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);return o}
function mul(o,a,b){const r=mat4();for(let c=0;c<4;c++)for(let row=0;row<4;row++)r[c*4+row]=a[0*4+row]*b[c*4+0]+a[1*4+row]*b[c*4+1]+a[2*4+row]*b[c*4+2]+a[3*4+row]*b[c*4+3];o.set(r);return o}
function persp(o,fovy,asp,n,f){const t=1/Math.tan(fovy/2);o.fill(0);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o}
function look(o,eye,ctr,up){let zx=eye[0]-ctr[0],zy=eye[1]-ctr[1],zz=eye[2]-ctr[2];let zl=1/Math.hypot(zx,zy,zz);zx*=zl;zy*=zl;zz*=zl;let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;let xl=1/Math.hypot(xx,xy,xz);xx*=xl;xy*=xl;xz*=xl;let yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;o.set([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,0,0,0,1]);o[12]=-(xx*eye[0]+xy*eye[1]+xz*eye[2]);o[13]=-(yx*eye[0]+yy*eye[1]+yz*eye[2]);o[14]=-(zx*eye[0]+zy*eye[1]+zz*eye[2]);return o}
function translate(o,x,y,z){ident(o);o[12]=x;o[13]=y;o[14]=z;return o}
function scale(o,x,y,z){ident(o);o[0]=x;o[5]=y;o[10]=z;return o}
function rotY(o,a){ident(o);const c=Math.cos(a),s=Math.sin(a);o[0]=c;o[2]=-s;o[8]=s;o[10]=c;return o}
function compose(pos, yaw, scl){const t=mat4(),r=mat4(),s=mat4(),tr=mat4(),m=mat4();translate(t,pos[0],pos[1],pos[2]);rotY(r,yaw);scale(s,scl[0],scl[1],scl[2]);mul(tr,t,r);mul(m,tr,s);return m}

function makeMesh(positions, normals, indices) {
  const vao = { count: indices.length };
  vao.pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vao.pb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  vao.nb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vao.nb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  vao.ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vao.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  return vao;
}
function sphere(rx,ry,rz,seg=18,rings=8){const p=[],n=[],idx=[];for(let r=0;r<=rings;r++){const th=Math.PI*r/rings,y=Math.cos(th),st=Math.sin(th);for(let s=0;s<seg;s++){const ph=2*Math.PI*s/seg,x=Math.cos(ph)*st,z=Math.sin(ph)*st;p.push(rx*x,ry*y,rz*z);n.push(x,y,z)}}for(let r=0;r<rings;r++)for(let s=0;s<seg;s++){const a=r*seg+s,b=r*seg+(s+1)%seg,c=(r+1)*seg+s,d=(r+1)*seg+(s+1)%seg;idx.push(a,c,b,b,c,d)}return makeMesh(p,n,idx)}
function plane(w,d){return makeMesh([-w/2,0,-d/2,w/2,0,-d/2,w/2,0,d/2,-w/2,0,d/2],[0,1,0,0,1,0,0,1,0,0,1,0],[0,1,2,0,2,3])}
function box(w,h,d){const x=w/2,y=h/2,z=d/2,p=[-x,-y,z,x,-y,z,x,y,z,-x,y,z,x,-y,-z,-x,-y,-z,-x,y,-z,x,y,-z,-x,y,z,x,y,z,x,y,-z,-x,y,-z,-x,-y,-z,x,-y,-z,x,-y,z,-x,-y,z,x,-y,z,x,-y,-z,x,y,-z,x,y,z,-x,-y,-z,-x,-y,z,-x,y,z,-x,y,-z],n=[0,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,1,0,0,1,0,0,1,0,0,1,0,-1,0,0,-1,0,0,-1,0,0,-1,0],i=[];for(let f=0;f<6;f++){const b=f*4;i.push(b,b+1,b+2,b,b+2,b+3)}return makeMesh(p,n,i)}

const bodyMesh = sphere(1.5,.42,.34,20,10);
const chucoMesh = sphere(2.05,.46,.38,20,10);
const cleanerMesh = sphere(.82,.25,.25,14,7);
const tailMesh = box(.08,.9,.55);
const waterMesh = plane(23,11.4);
const floorMesh = box(24,.18,12);
const rockMesh = sphere(.55,.3,.45,10,5);
const plantMesh = box(.07,2.0,.07);

const entities=[];
const rocks=[];
const plants=[];
function rand(a,b){return a+Math.random()*(b-a)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function resetEntities(){entities.length=0;const palettes=[[0.25,0.9,1],[1,.55,.12],[.45,1,.82]];const color=palettes[state.speciesSet%palettes.length];const count=[7,5,6][state.speciesSet%3];for(let i=0;i<count;i++)entities.push({kind:'fish',mesh:bodyMesh,color,tail:true,pos:[rand(-9,9),rand(-.8,3.2),rand(-4,4)],vel:[rand(-.12,.12),rand(-.03,.03),rand(-.07,.07)],target:[0,0,0],speed:rand(.9,1.35),feedable:true,phase:rand(0,6.28),scale:[1,1,1]});entities.push({kind:'chuco',mesh:chucoMesh,color:[.45,1,.82],tail:true,pos:[-5.8,-2.25,1.8],vel:[.02,0,.01],target:[-6,-2,0],speed:.72,bio:true,phase:1,scale:[1,1,1]});entities.push({kind:'cleaner',mesh:cleanerMesh,color:[.75,.55,1],pos:[6.5,-3.2,-2.6],vel:[-.02,0,0],target:[6,-3,-2],speed:.25,bottom:true,phase:3,scale:[1,1,1]})}
function initEnv(){for(let i=0;i<30;i++)rocks.push({pos:[rand(-10,10),-4.25,rand(-5,5)],scale:[rand(.35,1.2),rand(.18,.55),rand(.35,1.1)],color:[.1,.35,.38]});for(let i=0;i<34;i++)plants.push({pos:[rand(-10.5,10.5),-3.4,rand(-5.2,5.2)],scale:[1,rand(.5,1.8),1],color:i%5?[.03,.65,.42]:[.48,.32,1]})}

const proj=mat4(),view=mat4(),pv=mat4(),mvp=mat4();
function bindMesh(p, mesh){const locP=gl.getAttribLocation(p,'position'),locN=gl.getAttribLocation(p,'normal');gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.enableVertexAttribArray(locP);gl.vertexAttribPointer(locP,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.enableVertexAttribArray(locN);gl.vertexAttribPointer(locN,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ib)}
function drawMesh(mesh, model, color, alpha=1, glow=0){gl.useProgram(meshProg);bindMesh(meshProg,mesh);mul(mvp,pv,model);gl.uniformMatrix4fv(gl.getUniformLocation(meshProg,'mvp'),false,mvp);gl.uniformMatrix4fv(gl.getUniformLocation(meshProg,'model'),false,model);gl.uniform3fv(gl.getUniformLocation(meshProg,'color'),new Float32Array(color));gl.uniform1f(gl.getUniformLocation(meshProg,'alpha'),alpha);gl.uniform1f(gl.getUniformLocation(meshProg,'glow'),glow);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0)}
function drawWater(){gl.useProgram(waterProg);bindMesh(waterProg,waterMesh);const model=compose([0,4.25,0],0,[1,1,1]);mul(mvp,pv,model);gl.uniformMatrix4fv(gl.getUniformLocation(waterProg,'mvp'),false,mvp);gl.uniform1f(gl.getUniformLocation(waterProg,'time'),state.t);gl.uniform1f(gl.getUniformLocation(waterProg,'shade'),state.shade);gl.uniform1f(gl.getUniformLocation(waterProg,'oxygen'),state.oxygen);gl.uniform1f(gl.getUniformLocation(waterProg,'biofilter'),state.biofilter);gl.drawElements(gl.TRIANGLES,waterMesh.count,gl.UNSIGNED_SHORT,0)}

function steer(e,dt){let target=e.target;if(Math.random()<dt*.25){target=[rand(-10,10),e.bottom?rand(-3.6,-2.8):rand(-2.5,3.5),rand(-4.6,4.6)];if(e.bio&&state.biofilter>.1)target=[rand(-10,-7),rand(-3,-1.6),rand(-3,3)];if(e.feedable&&state.feed>.1)target=[rand(-2,2),rand(.5,3.2),rand(-2,2)];e.target=target}const dx=target[0]-e.pos[0],dy=target[1]-e.pos[1],dz=target[2]-e.pos[2],l=Math.hypot(dx,dy,dz)||1;e.vel[0]=(e.vel[0]+dx/l*e.speed*dt*.08)*.99;e.vel[1]=(e.vel[1]+dy/l*e.speed*dt*.08)*.99;e.vel[2]=(e.vel[2]+dz/l*e.speed*dt*.08)*.99;for(let k=0;k<3;k++)e.pos[k]+=e.vel[k]*dt*5;e.pos[0]=clamp(e.pos[0],-10.8,10.8);e.pos[1]=clamp(e.pos[1],-3.6,3.8);e.pos[2]=clamp(e.pos[2],-4.8,4.8)}
function update(dt){state.t+=dt;state.feed=Math.max(0,state.feed-dt*.35);state.oxygen=Math.max(0,state.oxygen-dt*.55);state.shade=Math.max(0,state.shade-dt*.25);state.scan=Math.max(0,state.scan-dt*.62);state.biofilter=Math.max(0,state.biofilter-dt*.32);const tel=state.telemetry;tel.temp+=(21.7-tel.temp)*dt*.018;tel.ph+=(7.12-tel.ph)*dt*.015;tel.o2+=(8.15-tel.o2)*dt*.025;tel.nh3=Math.max(.002,Math.min(.24,tel.nh3+(.035-tel.nh3)*dt*.02-state.biofilter*dt*.02));for(const e of entities)steer(e,dt);nodeEls.forEach((n,i)=>n.classList.toggle('hot',i===state.hot));modeLabel.textContent=root.clientWidth>2500?'65 Display':'Conference'}
function hud(){const t=state.telemetry;meters.temp[0].textContent=t.temp.toFixed(1)+'C';meters.temp[1].value=t.temp;meters.ph[0].textContent=t.ph.toFixed(2);meters.ph[1].value=t.ph;meters.o2[0].textContent=t.o2.toFixed(1);meters.o2[1].value=t.o2;meters.nh3[0].textContent=t.nh3.toFixed(3);meters.nh3[1].value=t.nh3}
function resize(){const r=root.getBoundingClientRect();state.dpr=Math.min(devicePixelRatio||1,1.5);state.w=Math.max(1,r.width*state.dpr|0);state.h=Math.max(1,r.height*state.dpr|0);canvas.width=state.w;canvas.height=state.h;canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';gl.viewport(0,0,state.w,state.h);persp(proj,Math.PI/4,state.w/state.h,.1,100)}
addEventListener('resize',resize,{passive:true});

let audio=null;function startAudio(){if(audio)return;const C=AudioContext||webkitAudioContext,ctx=new C(),g=ctx.createGain();g.gain.value=.12;g.connect(ctx.destination);const o=ctx.createOscillator();o.frequency.value=54;o.connect(g);o.start();audio={ctx,g};audioLabel.textContent='On'}
function trigger(action){state.hot={feed:2,oxygen:3,shade:4,biofilter:5,scan:6,species:7}[action]??0;graphState.textContent='S:'+action[0].toUpperCase()+action.slice(1);const lines={feed:'P2 magnitude rises: fish steer toward pellet field.',oxygen:'P3 distribution shifts: bubble column increases dissolved oxygen.',shade:'P5 locality cools: water column dims and temperature drops.',biofilter:'P7 selection: Chuco patrols the algae/biofilter edge.',scan:'P6 recursion visible: NUMARA trace scans the tank volume.',species:'P1 relation remaps: base model species set rotates.'};graphLine.textContent=lines[action]||graphLine.textContent;if(action==='feed'){state.feed=1;state.telemetry.nh3+=.012}if(action==='oxygen'){state.oxygen=1;state.telemetry.o2=Math.min(9.7,state.telemetry.o2+.55)}if(action==='shade'){state.shade=1;state.telemetry.temp=Math.max(19.2,state.telemetry.temp-.28)}if(action==='biofilter'){state.biofilter=1;state.telemetry.nh3=Math.max(.005,state.telemetry.nh3-.025)}if(action==='scan')state.scan=1;if(action==='species'){state.speciesSet++;resetEntities()}document.querySelectorAll('.controls button').forEach(b=>b.classList.toggle('active',b.dataset.action===action));fetch('/api/telemetry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,telemetry:state.telemetry,time:Date.now(),runtime:'self-contained-webgl'})}).catch(()=>{})}
startBtn.addEventListener('click',()=>{state.started=true;app.classList.add('started');startAudio();trigger('scan')});document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{if(!state.started){state.started=true;app.classList.add('started');startAudio()}trigger(b.dataset.action)}));
function render(){gl.clearColor(.01,.05,.065,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);look(view,[Math.sin(state.t*.08)*.8,5.7,22],[0,.2,0],[0,1,0]);mul(pv,proj,view);drawMesh(floorMesh,compose([0,-4.05,0],0,[1,1,1]),[.03,.12,.10],1,0);for(const r of rocks)drawMesh(rockMesh,compose(r.pos,0,r.scale),r.color,1,0);for(const p of plants)drawMesh(plantMesh,compose(p.pos,0,p.scale),p.color,.88,0);for(const e of entities){const yaw=Math.atan2(-e.vel[2],e.vel[0]||.001);drawMesh(e.mesh,compose(e.pos,yaw,e.scale),e.color,1,e.bio?state.biofilter*.45:state.feed*.12);if(e.tail)drawMesh(tailMesh,compose([e.pos[0]-Math.cos(yaw)*1.2,e.pos[1],e.pos[2]+Math.sin(yaw)*1.2],yaw+Math.sin(state.t*5+e.phase)*.35,[1,1,1]),[.65,.45,1],.78,0)}drawWater()}
let h=0;function loop(now){const dt=Math.min(.05,(now-state.last)/1000||.016);state.last=now;update(dt);render();h+=dt;if(h>.12){hud();h=0}requestAnimationFrame(loop)}
initEnv();resetEntities();resize();livePill.textContent='SELF WEBGL';requestAnimationFrame(loop);
