(() => {
  'use strict';
  const KEY = 'chuco_numara_edges_v1';
  const PROFILE_KEY = 'chuco_axolotl_profile_v1';
  const $ = (id) => document.getElementById(id);
  const ui = {mood:$('mood'),energy:$('energy'),trust:$('trust'),residual:$('residual'),graph:$('graph'),moodBar:$('moodBar'),energyBar:$('energyBar'),trustBar:$('trustBar'),morphologyHud:$('morphologyHud'),residualHud:$('residualHud'),trustHud:$('trustHud'),energyHud:$('energyHud'),researchPanel:$('researchPanel'),researchToggle:$('researchToggle'),log:$('log'),lispTrace:$('lispTrace')};
  const canvas=$('c'); const ctx=canvas.getContext('2d',{alpha:false}); let W=0,H=0;
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  const graph={edges:{'HUNGER->SEEK':{w:.5,p:0},'TRUST->APPROACH':{w:.2,p:0},'PLAY->SPIN':{w:.1,p:0},'LIGHT->CURIOUS':{w:.3,p:0},'FEAR->HIDE':{w:.15,p:0},'REWARD->REPEAT':{w:.4,p:0},'PET->TRUST':{w:.2,p:0},'TOY->PLAY':{w:.2,p:0},'LISP->INSIGHT':{w:.24,p:0}}};
  const chuco={x:0,y:0,vx:0,vy:0,heading:0,energy:.55,trust:.2,curiosity:.6,hunger:.5,play:.4,attachment:.12,rhythm:.5,comfort:.35,mood:'curious',morphology:'explore',rewardResidual:1};
  const food=[],ripples=[],mouse={x:0,y:0}; let lispProgram='(observe (edges trust play curiosity) (adapt reward residual))';
  let persistQueued = false;
  const persist=()=>{
    if (persistQueued) return;
    persistQueued = true;
    const flush = () => {
      persistQueued = false;
      try{localStorage.setItem(KEY,JSON.stringify(graph.edges));}catch(_){ }
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(flush,{timeout:300});
    else setTimeout(flush,80);
  };
  const load=()=>{try{const s=JSON.parse(localStorage.getItem(KEY)||'null'); if(!s)return; for(const k of Object.keys(graph.edges)){ if(!s[k])continue; graph.edges[k].w=Number.isFinite(+s[k].w)?+s[k].w:graph.edges[k].w; graph.edges[k].p=Number.isFinite(+s[k].p)?+s[k].p:graph.edges[k].p; }}catch(_){}};
  function log(m){const n=document.createElement('div'); n.className='entry'; n.textContent=String(m).slice(0,220); ui.log.prepend(n); while(ui.log.children.length>18)ui.log.lastChild.remove();}
  function resize(){const dpr=Math.min(2,window.devicePixelRatio||1); W=canvas.parentElement.clientWidth; H=canvas.parentElement.clientHeight; canvas.width=Math.floor(W*dpr); canvas.height=Math.floor(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);}
  function spawnFood(){food.push({x:Math.random()*W*.78+W*.1,y:Math.random()*H*.64+H*.22,r:10});}
  function edge(name,delta){const e=graph.edges[name]; if(!e)return; e.p=clamp(e.p+delta,0,5); e.w=clamp(e.w*.96+delta*.04,.02,.99); persist();}
  function reward(v){edge('REWARD->REPEAT',v); chuco.trust=clamp(chuco.trust+v*.04,0,1);}
  
  function bakeAxolotlTraining() {
    const priors = {
      'HUNGER->SEEK': { w: 0.58, p: 0.32 },
      'TRUST->APPROACH': { w: 0.28, p: 0.22 },
      'PLAY->SPIN': { w: 0.21, p: 0.18 },
      'LIGHT->CURIOUS': { w: 0.37, p: 0.26 },
      'REWARD->REPEAT': { w: 0.46, p: 0.24 },
      'PET->TRUST': { w: 0.26, p: 0.2 },
      'TOY->PLAY': { w: 0.24, p: 0.2 },
      'LISP->INSIGHT': { w: 0.29, p: 0.16 }
    };
    for (const [k, prior] of Object.entries(priors)) {
      const edgeState = graph.edges[k];
      if (!edgeState) continue;
      edgeState.w = clamp((edgeState.w * 0.7) + (prior.w * 0.3), 0.02, 0.99);
      edgeState.p = clamp((edgeState.p * 0.7) + (prior.p * 0.3), 0, 5);
    }
    chuco.curiosity = clamp((chuco.curiosity * 0.75) + 0.18, 0, 1);
    chuco.play = clamp((chuco.play * 0.75) + 0.12, 0, 1);
    chuco.attachment = clamp((chuco.attachment * 0.75) + 0.08, 0, 1);
    persist();
    try { localStorage.setItem(PROFILE_KEY, 'trained'); } catch (_) {}
    log('Baked axolotl priors loaded: seek, approach, playful curiosity.');
  }

  function runLispTreat(){
    edge('LISP->INSIGHT',.24); edge('LIGHT->CURIOUS',.08); reward(.2); chuco.curiosity=clamp(chuco.curiosity+.12,0,1);
    lispProgram=`(lisp-treat (if (> curiosity ${chuco.curiosity.toFixed(2)}) 'explore 'bond) (residual ${chuco.rewardResidual.toFixed(2)}))`;
    log('LISP Treat evaluated symbolic curiosity pathway.');
  }
  function think(){
    const weighted={seek_food:graph.edges['HUNGER->SEEK'].w*chuco.hunger+.04,approach:graph.edges['TRUST->APPROACH'].w*chuco.trust+chuco.attachment*.2,spin:graph.edges['PLAY->SPIN'].w*chuco.play+chuco.rhythm*.15,explore:graph.edges['LIGHT->CURIOUS'].w*chuco.curiosity+graph.edges['LISP->INSIGHT'].w*.12,idle:.08+chuco.comfort*.2};
    let best='idle',top=-Infinity; for(const [k,v] of Object.entries(weighted)){if(v>top){best=k;top=v;}} chuco.morphology=best;
    if(best==='seek_food'&&food.length){let t=food[0],bd=Infinity; for(const f of food){const d=Math.hypot(chuco.x-f.x,chuco.y-f.y); if(d<bd){bd=d;t=f;}} chuco.vx+=(t.x-chuco.x)*.0011; chuco.vy+=(t.y-chuco.y)*.0011; edge('HUNGER->SEEK',.006);} else if(best==='approach'){chuco.vx+=(mouse.x-chuco.x)*.0007; chuco.vy+=(mouse.y-chuco.y)*.0007; edge('TRUST->APPROACH',.004);} else if(best==='spin'){chuco.heading+=.08; chuco.vx+=Math.sin(chuco.heading)*.18; chuco.vy+=Math.cos(chuco.heading)*.18; edge('PLAY->SPIN',.004);} else if(best==='explore'){chuco.vx+=(Math.random()-.5)*.11; chuco.vy+=(Math.random()-.5)*.11; edge('LIGHT->CURIOUS',.003);} 
    const rp=(graph.edges['REWARD->REPEAT'].w+graph.edges['TRUST->APPROACH'].w+graph.edges['LISP->INSIGHT'].w)*.333; chuco.rewardResidual=clamp(1-rp*chuco.trust,0,1);
  }
  function draw(){ctx.clearRect(0,0,W,H); ctx.fillStyle='#07131a'; ctx.fillRect(0,0,W,H); for(const f of food){ctx.fillStyle='#55ff99'; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill();} for(let i=ripples.length-1;i>=0;i--){const r=ripples[i]; ctx.strokeStyle=`${r.c}${r.a})`; ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,Math.PI*2); ctx.stroke(); r.r+=2; r.a*=.94; if(r.a<.03)ripples.splice(i,1);} ctx.save(); ctx.translate(chuco.x,chuco.y); ctx.rotate(chuco.heading*.15); ctx.fillStyle='#ff9fe6'; ctx.beginPath(); ctx.ellipse(0,0,42,28,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#ff7ad9'; ctx.beginPath(); ctx.arc(-36,-14,11,0,Math.PI*2); ctx.arc(-40,0,12,0,Math.PI*2); ctx.arc(-36,14,11,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(14,-7,5,0,Math.PI*2); ctx.arc(14,7,5,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(15,-7,2,0,Math.PI*2); ctx.arc(15,7,2,0,Math.PI*2); ctx.fill(); ctx.restore();}
  function render(){const residual=chuco.rewardResidual; chuco.mood=residual<.65?'learning':(chuco.energy<.3?'sleepy':'curious'); ui.mood.textContent=chuco.mood; ui.energy.textContent=chuco.energy.toFixed(2); ui.trust.textContent=chuco.trust.toFixed(2); ui.residual.textContent=residual.toFixed(2); ui.morphologyHud.textContent=chuco.morphology; ui.residualHud.textContent=residual.toFixed(2); ui.trustHud.textContent=chuco.trust.toFixed(2); ui.energyHud.textContent=chuco.energy.toFixed(2); ui.moodBar.style.width=`${(1-residual)*100}%`; ui.energyBar.style.width=`${chuco.energy*100}%`; ui.trustBar.style.width=`${chuco.trust*100}%`; if(!ui.researchPanel.classList.contains('on')) return; const frag=document.createDocumentFragment(); for(const [k,v] of Object.entries(graph.edges)){const d=document.createElement('div'); d.className='cell'; d.append(document.createTextNode(k)); const b=document.createElement('b'); b.textContent=`w:${v.w.toFixed(2)} p:${v.p.toFixed(2)}`; d.appendChild(b); frag.appendChild(d);} ui.graph.replaceChildren(frag); ui.lispTrace.textContent=lispProgram;}
  function step(){think(); chuco.vx*=.985; chuco.vy*=.985; chuco.x=clamp(chuco.x+chuco.vx,40,W-40); chuco.y=clamp(chuco.y+chuco.vy,90,H-40); chuco.energy=clamp(chuco.energy-.0005,0,1); chuco.hunger=clamp(chuco.hunger+.0003,0,1); for(let i=food.length-1;i>=0;i--){if(Math.hypot(chuco.x-food[i].x,chuco.y-food[i].y)<28){food.splice(i,1); chuco.energy=clamp(chuco.energy+.25,0,1); chuco.hunger=clamp(chuco.hunger-.35,0,1); reward(.4); edge('HUNGER->SEEK',.2); ripples.push({x:chuco.x,y:chuco.y,r:8,a:.9,c:'rgba(85,255,153,'}); log('Chuco reinforced HUNGER->SEEK.'); spawnFood();}} draw(); render(); requestAnimationFrame(step);}
  function setResearch(on){ui.researchPanel.classList.toggle('on',on); ui.researchToggle.textContent=on?'On':'Off'; const u=new URL(location.href); if(on)u.searchParams.set('research','1'); else u.searchParams.delete('research'); history.replaceState({},'',u); if(!on){ui.graph.replaceChildren(); ui.lispTrace.textContent='';}}
  window.addEventListener('resize',resize,{passive:true}); canvas.addEventListener('pointermove',(e)=>{const r=canvas.getBoundingClientRect(); mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top;},{passive:true});
  $('feed').onclick=()=>{spawnFood();reward(.10);log('Food dropped.');}; $('pet').onclick=()=>{edge('PET->TRUST',.25);edge('TRUST->APPROACH',.18);chuco.trust=clamp(chuco.trust+.12,0,1);reward(.18);log('Pet reinforced TRUST->APPROACH.');}; $('light').onclick=()=>{edge('LIGHT->CURIOUS',.2);chuco.curiosity=clamp(chuco.curiosity+.08,0,1);log('Light increased exploration pressure.');}; $('toy').onclick=()=>{edge('TOY->PLAY',.22);edge('PLAY->SPIN',.18);chuco.play=clamp(chuco.play+.1,0,1);reward(.12);log('Toy strengthened PLAY recurrence.');}; $('lisp').onclick=runLispTreat; ui.researchToggle.onclick=()=>setResearch(!ui.researchPanel.classList.contains('on'));
  load();
  let alreadyTrained = false;
  try { alreadyTrained = localStorage.getItem(PROFILE_KEY) === 'trained'; } catch (_) {}
  if (!alreadyTrained) bakeAxolotlTraining();
  resize(); spawnFood(); chuco.x=W/2; chuco.y=H/2; mouse.x=W/2; mouse.y=H/2; setResearch(new URLSearchParams(location.search).get('research')==='1'); log('Chuco initialized. NUMARA mini-brain online.'); step();
})();
