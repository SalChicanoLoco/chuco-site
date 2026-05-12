'use strict';

(function(){
  const el=id=>document.getElementById(id);
  const NS='http://www.w3.org/2000/svg';

  const clamp=(v,min,max,d)=>{
    const n=Number(v);
    if(!Number.isFinite(n)) return d;
    return Math.min(max,Math.max(min,n));
  };

  const state={
    lengthFt:32,widthFt:16,spacingFt:4,aisleFt:2.5,
    bermFt:2.5,trenchFt:1.5,
    cells:1
  };

  const inputs=['lengthFt','widthFt','spacingFt','aisleFt','bermFt','trenchFt','mode','showBarrels','showAirTube','showNursery','showRollSides'];

  function read(){
    state.lengthFt=clamp(el('lengthFt').value,12,120,32);
    state.widthFt=clamp(el('widthFt').value,10,40,16);
    state.spacingFt=clamp(el('spacingFt').value,2,8,4);
    state.aisleFt=clamp(el('aisleFt').value,1.5,4,2.5);
    state.bermFt=clamp(el('bermFt').value,0,6,2.5);
    state.trenchFt=clamp(el('trenchFt').value,0,4,1.5);
  }

  function derived(){
    const baseArea=state.lengthFt*state.widthFt;
    const totalArea=baseArea*state.cells;

    const hoops=Math.floor(state.lengthFt/state.spacingFt)+1;

    // conservative production model
    const foodLbYr=totalArea*0.6;
    const people=Math.max(1,Math.floor(foodLbYr/400));

    return {baseArea,totalArea,hoops,foodLbYr,people,bedWidth:Math.max(1,(state.widthFt-state.aisleFt)/2)};
  }

  function renderStats(){
    const d=derived();
    el('footprintValue').textContent=Math.round(d.totalArea)+' sq ft';
    el('hoopsValue').textContent=d.hoops+' × '+state.cells;
    el('bedsValue').textContent=d.bedWidth.toFixed(1)+' ft';
    el('biasValue').textContent=d.people+' people fed';
  }

  function clear(n){while(n.firstChild)n.removeChild(n.firstChild);}
  const svg=(tag,attrs={})=>{
    const n=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));
    return n;
  };

  function renderBOM(){
    const d=derived();
    const mount=el('bomContainer');
    clear(mount);

    const ul=document.createElement('ul');

    const items=[
      'Frame × '+state.cells,
      'Anchors '+(d.hoops*2*state.cells),
      'Cover ~'+Math.round(d.totalArea*1.6)+' sq ft',
      'Beds / grow zones',
      (el('showAirTube').checked?'Air tube':'Passive vent')+' climate loop',
      (el('showBarrels').checked?'Thermal barrels':'No barrels')+' (north wall)',
      (el('showRollSides').checked?'Roll-up sides':'Fixed sidewalls')
    ];

    items.forEach(t=>{
      const li=document.createElement('li');
      li.textContent=t;
      ul.appendChild(li);
    });

    mount.appendChild(ul);
  }

  function renderCost(){
    const d=derived();
    const mount=el('costContainer');
    clear(mount);

    const mode=el('mode').value;
    const factors={scrappy:[1.6,4.5],balanced:[2.2,6.2],clean:[3.1,8.5]}[mode];
    const low=d.totalArea*factors[0];
    const high=d.totalArea*factors[1];

    [
      'Low $'+Math.round(low),
      'High $'+Math.round(high),
      'Yield '+Math.round(d.foodLbYr)+' lb/yr'
    ].forEach(t=>{
      const div=document.createElement('div');
      div.textContent=t;
      mount.appendChild(div);
    });
  }

  function drawBlueprint(){
    const d=derived();
    const plan=el('planGroup');
    const section=el('sectionGroup');
    const notes=el('notesGroup');
    clear(plan); clear(section); clear(notes);

    const px=110, py=170, pw=980, ph=350;
    plan.appendChild(svg('rect',{x:px,y:py,width:pw,height:ph,fill:'#fff',stroke:'#374151','stroke-width':2,rx:4}));
    plan.appendChild(svg('text',{x:px-20,y:py+ph/2,'text-anchor':'end','font-size':16,'font-weight':700,fill:'#8a6f2d'})).textContent='NORTH';
    plan.appendChild(svg('text',{x:px+pw+20,y:py+ph/2,'text-anchor':'start','font-size':16,'font-weight':700,fill:'#8a6f2d'})).textContent='SOUTH';

    const barrelBandH=52;
    if(el('showBarrels').checked){
      plan.appendChild(svg('rect',{x:px,y:py,width:pw,height:barrelBandH,fill:'#edf7ee',stroke:'#215732','stroke-width':1.5}));
    }
    const aisleW=(pw*(state.aisleFt/state.widthFt));
    const bedW=(pw-aisleW)/2;
    const usableY=py+(el('showBarrels').checked?barrelBandH:0), usableH=ph-(el('showBarrels').checked?barrelBandH:0);
    plan.appendChild(svg('rect',{x:px,y:usableY,width:bedW,height:usableH,fill:'#f0ead2',stroke:'#8a6f2d'}));
    plan.appendChild(svg('rect',{x:px+bedW,y:usableY,width:aisleW,height:usableH,fill:'#f8fafc',stroke:'#94a3b8','stroke-dasharray':'8 6'}));
    plan.appendChild(svg('rect',{x:px+bedW+aisleW,y:usableY,width:bedW,height:usableH,fill:'#f0ead2',stroke:'#8a6f2d'}));

    for(let i=0;i<d.hoops;i++){
      const x=px+(pw*(i/(d.hoops-1||1)));
      plan.appendChild(svg('line',{x1:x,y1:py-10,x2:x,y2:py+ph+10,stroke:'#9ca3af','stroke-dasharray':'5 5'}));
    }
    if(el('showNursery').checked){
      plan.appendChild(svg('rect',{x:px+pw-190,y:usableY+usableH-88,width:160,height:64,fill:'#eef2ff',stroke:'#4f46e5','stroke-width':1.5,rx:10}));
      plan.appendChild(svg('text',{x:px+pw-110,y:usableY+usableH-50,'text-anchor':'middle','font-size':14,'font-weight':700,fill:'#4338ca'})).textContent='Nursery / Semilleros';
    }

    // Section
    const sx=110, sy=660, sw=980, sh=240;
    section.appendChild(svg('rect',{x:sx,y:sy,width:sw,height:sh,fill:'#fff',stroke:'#374151','stroke-width':2,rx:4}));
    const archTop=sy+25;
    section.appendChild(svg('path',{d:`M ${sx+70} ${sy+sh-80} Q ${sx+sw/2} ${archTop} ${sx+sw-70} ${sy+sh-80}`,fill:'none',stroke:'#215732','stroke-width':4}));
    section.appendChild(svg('rect',{x:sx+70,y:sy+sh-80,width:sw-140,height:state.bermFt*10,fill:'#dfd2b4',stroke:'#8a6f2d'}));
    if(el('showAirTube').checked){
      section.appendChild(svg('rect',{x:sx+120,y:sy+sh-28,width:sw-240,height:8,fill:'#4f46e5'}));
    }

    // Notes
    const n1=svg('text',{x:1120,y:210,'font-size':15,fill:'#374151'}); n1.textContent=`${state.lengthFt}ft × ${state.widthFt}ft · hoops ${d.hoops}`;
    const n2=svg('text',{x:1120,y:236,'font-size':15,fill:'#374151'}); n2.textContent=`berm ${state.bermFt}ft · trench ${state.trenchFt}ft`;
    const n3=svg('text',{x:1120,y:262,'font-size':14,fill:'#374151'}); n3.textContent=`walls: ${el('showRollSides').checked ? 'roll-up' : 'fixed'}`;
    notes.appendChild(n1); notes.appendChild(n2);
    notes.appendChild(n3);
  }

  function exportJson(){
    const payload={...state,mode:el('mode').value,options:{
      showBarrels:el('showBarrels').checked,showAirTube:el('showAirTube').checked,showNursery:el('showNursery').checked,showRollSides:el('showRollSides').checked
    },derived:derived()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cgs-c1-export.json'; a.click(); URL.revokeObjectURL(a.href);
  }

  function exportSvg(){
    const raw=el('blueprintSvg').outerHTML;
    const blob=new Blob([raw],{type:'image/svg+xml'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cgs-c1-blueprint.svg'; a.click(); URL.revokeObjectURL(a.href);
  }

  function render(){
    read();
    renderStats();
    renderBOM();
    renderCost();
    drawBlueprint();
  }

  inputs.forEach(id=>el(id).addEventListener('input',render,{passive:true}));
  el('downloadJsonBtn').addEventListener('click',exportJson);
  el('downloadSvgBtn').addEventListener('click',exportSvg);
  el('printBtn').addEventListener('click',()=>window.print());

  render();
})();
