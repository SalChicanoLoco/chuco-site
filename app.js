(() => {
  'use strict';
  const KEY = 'chuco_numara_edges_v1';
  const PROFILE_KEY = 'chuco_numara_profile_v1';
  const $ = (id) => document.getElementById(id);
  const ui = {mood:$('mood'),energy:$('energy'),trust:$('trust'),residual:$('residual'),graph:$('graph'),moodBar:$('moodBar'),energyBar:$('energyBar'),trustBar:$('trustBar'),morphologyHud:$('morphologyHud'),residualHud:$('residualHud'),trustHud:$('trustHud'),energyHud:$('energyHud'),researchPanel:$('researchPanel'),researchToggle:$('researchToggle'),quality:$('quality'),log:$('log'),lispTrace:$('lispTrace')};
  const canvas=$('c'); const ctx=canvas.getContext('2d',{alpha:false}); let W=0,H=0;
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  const graph={edges:{'HUNGER->SEEK':{w:.5,p:0},'TRUST->APPROACH':{w:.2,p:0},'PLAY->SPIN':{w:.1,p:0},'LIGHT->CURIOUS':{w:.3,p:0},'FEAR->HIDE':{w:.15,p:0},'REWARD->REPEAT':{w:.4,p:0},'PET->TRUST':{w:.2,p:0},'TOY->PLAY':{w:.2,p:0},'LISP->INSIGHT':{w:.24,p:0}}};
  const chuco={x:0,y:0,vx:0,vy:0,heading:0,energy:.55,trust:.2,curiosity:.6,hunger:.5,play:.4,attachment:.12,rhythm:.5,comfort:.35,mood:'curious',morphology:'explore',rewardResidual:1,skin:{body:'#8e7bff',gill:'#6a4dff',spots:'#c6bcff'}};
  const food=[],ripples=[],fish=[],bubbles=[],plants=[],mouse={x:0,y:0}; let quality='auto', frameDt=16, lastTs=performance.now(); let lispProgram='(observe (edges trust play curiosity) (adapt reward residual))';
  const persist=()=>{
    try{
      localStorage.setItem(KEY,JSON.stringify(graph.edges));
      return true;
    }catch(_){
      return false;
    }
  };
  const load=()=>{
    try{
      const savedEdges=JSON.parse(localStorage.getItem(KEY)||'null');
      if(!savedEdges)return false;
      for(const k of Object.keys(graph.edges)){
        if(!savedEdges[k])continue;
        graph.edges[k].w=Number.isFinite(+savedEdges[k].w)?+savedEdges[k].w:graph.edges[k].w;
        graph.edges[k].p=Number.isFinite(+savedEdges[k].p)?+savedEdges[k].p:graph.edges[k].p;
      }
      return true;
    }catch(_){
      return false;
    }
  };
  function log(m){const n=document.createElement('div'); n.className='entry'; n.textContent=String(m).slice(0,220); ui.log.prepend(n); while(ui.log.children.length>18)ui.log.lastChild.remove();}
  function resize(){const dpr=Math.min(2,window.devicePixelRatio||1); W=canvas.parentElement.clientWidth; H=canvas.parentElement.clientHeight; canvas.width=Math.floor(W*dpr); canvas.height=Math.floor(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); setupTank();}
  function spawnFood(){food.push({x:Math.random()*W*.78+W*.1,y:Math.random()*H*.64+H*.22,r:10});}
  function spawnFish(n=3){for(let i=0;i<n;i++){fish.push({x:Math.random()*W*.8+W*.1,y:Math.random()*H*.5+H*.2,vx:(Math.random()-.5)*1.4,vy:(Math.random()-.5)*.6,h:Math.random()*Math.PI*2,c:Math.random()>.5?'#69d6ff':'#8fffd9'});}}
  function setupTank(){plants.length=0; bubbles.length=0; const bCount=quality==='low'?10:(quality==='high'?36:20); const count=Math.max(5,Math.floor(W/180)); for(let i=0;i<count;i++){plants.push({x:(i+.5)*(W/count)+(Math.random()-.5)*30,h:70+Math.random()*120,s:8+Math.random()*10});} for(let i=0;i<bCount;i++){bubbles.push({x:Math.random()*W,y:Math.random()*H,r:2+Math.random()*5,v:.4+Math.random()*.8,a:.2+Math.random()*.5});}}
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
    const saved=persist();
    if(saved){
      try{localStorage.setItem(PROFILE_KEY,'trained');}catch(_){}
    }
    log(saved?'Baked axolotl priors loaded: seek, approach, playful curiosity.':'Baked axolotl priors computed, but local persistence failed.');
  }

  function runLispTreat(){
    edge('LISP->INSIGHT',.24); edge('LIGHT->CURIOUS',.08); reward(.2); chuco.curiosity=clamp(chuco.curiosity+.12,0,1);
    lispProgram=`(lisp-treat (if (> curiosity ${chuco.curiosity.toFixed(2)}) 'explore 'bond) (residual ${chuco.rewardResidual.toFixed(2)}))`;
    log('LISP Treat evaluated symbolic curiosity pathway.');
  }
  function think(){
    const weighted={seek_food:graph.edges['HUNGER->SEEK'].w*chuco.hunger+.04,approach:graph.edges['TRUST->APPROACH'].w*chuco.trust+chuco.attachment*.2,spin:graph.edges['PLAY->SPIN'].w*chuco.play+chuco.rhythm*.15,explore:graph.edges['LIGHT->CURIOUS'].w*chuco.curiosity+graph.edges['LISP->INSIGHT'].w*.12,follow_fish:(graph.edges['TOY->PLAY'].w+graph.edges['TRUST->APPROACH'].w)*.5*(chuco.play+.25),rest:(1-chuco.energy)*.7+chuco.comfort*.15,idle:.08+chuco.comfort*.2};
    let best='idle',top=-Infinity; for(const [k,v] of Object.entries(weighted)){if(v>top){best=k;top=v;}} chuco.morphology=best;
    if(best==='seek_food'&&food.length){let t=food[0],bd=Infinity; for(const f of food){const d=Math.hypot(chuco.x-f.x,chuco.y-f.y); if(d<bd){bd=d;t=f;}} chuco.vx+=(t.x-chuco.x)*.0011; chuco.vy+=(t.y-chuco.y)*.0011; edge('HUNGER->SEEK',.006);} else if(best==='approach'){chuco.vx+=(mouse.x-chuco.x)*.0007; chuco.vy+=(mouse.y-chuco.y)*.0007; edge('TRUST->APPROACH',.004);} else if(best==='spin'){chuco.heading+=.08; chuco.vx+=Math.sin(chuco.heading)*.18; chuco.vy+=Math.cos(chuco.heading)*.18; edge('PLAY->SPIN',.004);} else if(best==='explore'){chuco.vx+=(Math.random()-.5)*.11; chuco.vy+=(Math.random()-.5)*.11; edge('LIGHT->CURIOUS',.003);} else if(best==='follow_fish'&&fish.length){let t=fish[0],bd=Infinity; for(const f of fish){const d=Math.hypot(chuco.x-f.x,chuco.y-f.y); if(d<bd){bd=d;t=f;}} chuco.vx+=(t.x-chuco.x)*.0009; chuco.vy+=(t.y-chuco.y)*.0009; edge('TOY->PLAY',.005);} else if(best==='rest'){chuco.vx*=.95; chuco.vy*=.95; chuco.energy=clamp(chuco.energy+.0018,0,1);} 
    const rp=(graph.edges['REWARD->REPEAT'].w+graph.edges['TRUST->APPROACH'].w+graph.edges['LISP->INSIGHT'].w)*.333; chuco.rewardResidual=clamp(1-rp*chuco.trust,0,1);
  }

  function generateSkin(){
    const hue=Math.floor(Math.random()*360);
    chuco.skin={
      body:`hsl(${hue} 58% 42%)`,
      gill:`hsl(${(hue+36)%360} 78% 54%)`,
      spots:`hsla(${(hue+180)%360} 92% 82% / .9)`
    };
    ripples.push({x:chuco.x,y:chuco.y,r:16,a:.75,c:'rgba(255,255,255,'});
    edge('LISP->INSIGHT',.08);
    log(`Image-gen skin mutation applied: hue ${hue}.`);
  }


  function drawAxolotl(x,y,heading,scale,skin,alpha=1){ctx.save(); ctx.globalAlpha=alpha; ctx.translate(x,y); ctx.rotate(heading*.15); ctx.scale(scale,scale); const bodyGrad=ctx.createRadialGradient(10,-10,8,0,0,52); bodyGrad.addColorStop(0,skin.spots); bodyGrad.addColorStop(1,skin.body); ctx.fillStyle=bodyGrad; ctx.beginPath(); ctx.ellipse(0,0,44,30,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(6,14,30,9,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=skin.gill; for(const yy of [-15,0,15]){ctx.beginPath(); ctx.ellipse(-39,yy,14,6,.5,0,Math.PI*2); ctx.fill();} ctx.fillStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(16,-12,11,5,-.4,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(15,-7,5,0,Math.PI*2); ctx.arc(15,7,5,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(16,-7,2,0,Math.PI*2); ctx.arc(16,7,2,0,Math.PI*2); ctx.fill(); ctx.restore();}

  function draw(){ctx.clearRect(0,0,W,H); const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0a2c3f'); g.addColorStop(.45,'#0b3f52'); g.addColorStop(1,'#062433'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); for(const p of plants){ctx.strokeStyle='rgba(68,180,120,.55)'; ctx.lineWidth=p.s*.22; ctx.beginPath(); ctx.moveTo(p.x,H); ctx.bezierCurveTo(p.x-p.s,H-p.h*.35,p.x+p.s,H-p.h*.7,p.x,H-p.h); ctx.stroke();} for(const b of bubbles){ctx.fillStyle=`rgba(180,235,255,${b.a})`; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();} for(const f of food){ctx.fillStyle='#55ff99'; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill();} for(const sw of fish){ctx.save(); ctx.translate(sw.x,sw.y); ctx.rotate(sw.h); ctx.shadowColor=sw.c; ctx.shadowBlur=quality==='low'?2:quality==='high'?14:9; ctx.fillStyle=sw.c; ctx.beginPath(); ctx.ellipse(0,0,13,6,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(-18,6); ctx.lineTo(-18,-6); ctx.closePath(); ctx.fill(); ctx.restore();} for(let i=ripples.length-1;i>=0;i--){const r=ripples[i]; ctx.strokeStyle=`${r.c}${r.a})`; ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,Math.PI*2); ctx.stroke(); r.r+=2; r.a*=.94; if(r.a<.03)ripples.splice(i,1);} drawAxolotl(chuco.x,chuco.y+Math.sin(Date.now()*.002)*2.5,chuco.heading,1.02,chuco.skin,1); ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(0,0,W,18);}
  function bestEffortDrain(){return quality==='low'?.00035:quality==='high'?.00065:.0005;}
  function render(){const residual=chuco.rewardResidual; chuco.mood=residual<.65?'learning':(chuco.energy<.3?'sleepy':'curious'); ui.mood.textContent=chuco.mood; ui.energy.textContent=chuco.energy.toFixed(2); ui.trust.textContent=chuco.trust.toFixed(2); ui.residual.textContent=residual.toFixed(2); ui.morphologyHud.textContent=chuco.morphology; ui.residualHud.textContent=residual.toFixed(2); ui.trustHud.textContent=chuco.trust.toFixed(2); ui.energyHud.textContent=chuco.energy.toFixed(2); ui.moodBar.style.width=`${(1-residual)*100}%`; ui.energyBar.style.width=`${chuco.energy*100}%`; ui.trustBar.style.width=`${chuco.trust*100}%`; if(!ui.researchPanel.classList.contains('on')) return; const frag=document.createDocumentFragment(); for(const [k,v] of Object.entries(graph.edges)){const d=document.createElement('div'); d.className='cell'; d.append(document.createTextNode(k)); const b=document.createElement('b'); b.textContent=`w:${v.w.toFixed(2)} p:${v.p.toFixed(2)}`; d.appendChild(b); frag.appendChild(d);} ui.graph.replaceChildren(frag); ui.lispTrace.textContent=lispProgram;}
  function step(ts=performance.now()){frameDt=ts-lastTs; lastTs=ts; if(quality==='auto'){if(frameDt>26&&bubbles.length>12){quality='low'; ui.quality.textContent='Low'; setupTank();} else if(frameDt<18&&bubbles.length<20){quality='high'; ui.quality.textContent='High'; setupTank();}} think(); for(const sw of fish){sw.x+=sw.vx; sw.y+=sw.vy; sw.h=Math.atan2(sw.vy,sw.vx); if(sw.x<20||sw.x>W-20)sw.vx*=-1; if(sw.y<80||sw.y>H-20)sw.vy*=-1; sw.vx+=(Math.random()-.5)*.04; sw.vy+=(Math.random()-.5)*.03; sw.vx=clamp(sw.vx,-1.6,1.6); sw.vy=clamp(sw.vy,-1.2,1.2);} for(const b of bubbles){b.y-=b.v; b.x+=Math.sin((b.y+b.r)*.03)*.2; if(b.y<-10){b.y=H+Math.random()*40; b.x=Math.random()*W;}} chuco.vx*=.985; chuco.vy*=.985; chuco.x=clamp(chuco.x+chuco.vx,40,W-40); chuco.y=clamp(chuco.y+chuco.vy,90,H-40); chuco.energy=clamp(chuco.energy-(bestEffortDrain()),0,1); chuco.hunger=clamp(chuco.hunger+.0003,0,1); for(let i=food.length-1;i>=0;i--){if(Math.hypot(chuco.x-food[i].x,chuco.y-food[i].y)<28){food.splice(i,1); chuco.energy=clamp(chuco.energy+.25,0,1); chuco.hunger=clamp(chuco.hunger-.35,0,1); reward(.4); edge('HUNGER->SEEK',.2); ripples.push({x:chuco.x,y:chuco.y,r:8,a:.9,c:'rgba(85,255,153,'}); log('Chuco reinforced HUNGER->SEEK.'); spawnFood();}} draw(); render(); requestAnimationFrame(step);}
  function setResearch(on){ui.researchPanel.classList.toggle('on',on); ui.researchToggle.textContent=on?'On':'Off'; const u=new URL(location.href); if(on)u.searchParams.set('research','1'); else u.searchParams.delete('research'); history.replaceState({},'',u); if(!on){ui.graph.replaceChildren(); ui.lispTrace.textContent='';}}
  window.addEventListener('resize',resize,{passive:true}); canvas.addEventListener('pointermove',(e)=>{const r=canvas.getBoundingClientRect(); mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top;},{passive:true});
  ui.quality.onclick=()=>{quality=quality==='auto'?'high':quality==='high'?'low':'auto'; ui.quality.textContent=quality[0].toUpperCase()+quality.slice(1); setupTank();}; $('skin').onclick=generateSkin; $('feed').onclick=()=>{spawnFood();reward(.10);ripples.push({x:W*.5,y:H*.55,r:12,a:.7,c:'rgba(85,255,153,'});log('Food dropped.');}; $('pet').onclick=()=>{edge('PET->TRUST',.25);edge('TRUST->APPROACH',.18);chuco.trust=clamp(chuco.trust+.12,0,1);reward(.18);ripples.push({x:chuco.x,y:chuco.y,r:10,a:.8,c:'rgba(255,160,230,'});log('Pet reinforced TRUST->APPROACH.');}; $('light').onclick=()=>{edge('LIGHT->CURIOUS',.2);chuco.curiosity=clamp(chuco.curiosity+.08,0,1);for(let i=0;i<3;i++)ripples.push({x:Math.random()*W,y:Math.random()*H*.7+50,r:8,a:.5,c:'rgba(77,227,255,'});log('Light increased exploration pressure.');}; $('toy').onclick=()=>{edge('TOY->PLAY',.22);edge('PLAY->SPIN',.18);chuco.play=clamp(chuco.play+.1,0,1);reward(.12);spawnFish(1);log('Toy strengthened PLAY recurrence and spawned a fish target.');}; $('lisp').onclick=runLispTreat; ui.researchToggle.onclick=()=>setResearch(!ui.researchPanel.classList.contains('on'));
  const hasSavedEdges=load();
  const isProfileTrained=(()=>{
    try{return localStorage.getItem(PROFILE_KEY)==='trained';}catch(_){return false;}
  })();
  if(!hasSavedEdges || !isProfileTrained){
    bakeAxolotlTraining();
    if(persist()){
      try{localStorage.setItem(PROFILE_KEY,'trained');}catch(_){}
    }
  }
  ui.quality.textContent='Auto'; resize(); spawnFood(); spawnFish(4); chuco.x=W/2; chuco.y=H/2; mouse.x=W/2; mouse.y=H/2; setResearch(new URLSearchParams(location.search).get('research')==='1'); log('Chuco initialized. NUMARA mini-brain online.'); step();
})();
