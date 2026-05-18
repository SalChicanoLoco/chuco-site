import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = 'public/assets/models/fallback';

function pad4(n) { return (4 - (n % 4)) % 4; }
function f32(values) { return new Float32Array(values); }
function u16(values) { return new Uint16Array(values); }
function bytes(view) { return new Uint8Array(view.buffer); }
function alignBin(parts) {
  const out = [];
  let offset = 0;
  for (const p of parts) {
    const pad = pad4(offset);
    if (pad) { out.push(new Uint8Array(pad)); offset += pad; }
    out.push(p.bytes); p.offset = offset; offset += p.bytes.byteLength;
  }
  const bin = new Uint8Array(offset + pad4(offset));
  let at = 0;
  for (const p of out) { bin.set(p, at); at += p.byteLength; }
  return bin;
}
function minMax3(values) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < values.length; i += 3) {
    for (let j = 0; j < 3; j++) { min[j] = Math.min(min[j], values[i + j]); max[j] = Math.max(max[j], values[i + j]); }
  }
  return { min, max };
}
function writeGlb(path, meshes, nodes) {
  mkdirSync(dirname(path), { recursive: true });
  const bufferViews = [], accessors = [], meshDefs = [], nodeDefs = [];
  const parts = [];
  function addPart(arr, target) {
    const p = { bytes: bytes(arr) }; parts.push(p);
    const viewIndex = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: 0, byteLength: p.bytes.byteLength, target });
    return { p, viewIndex };
  }
  for (const mesh of meshes) {
    const pi = addPart(f32(mesh.positions), 34962);
    const ni = addPart(f32(mesh.normals), 34962);
    const ii = addPart(u16(mesh.indices), 34963);
    const mm = minMax3(mesh.positions);
    const posAcc = accessors.length; accessors.push({ bufferView: pi.viewIndex, componentType: 5126, count: mesh.positions.length / 3, type: 'VEC3', min: mm.min, max: mm.max });
    const norAcc = accessors.length; accessors.push({ bufferView: ni.viewIndex, componentType: 5126, count: mesh.normals.length / 3, type: 'VEC3' });
    const indAcc = accessors.length; accessors.push({ bufferView: ii.viewIndex, componentType: 5123, count: mesh.indices.length, type: 'SCALAR' });
    meshDefs.push({ primitives: [{ attributes: { POSITION: posAcc, NORMAL: norAcc }, indices: indAcc, material: mesh.material }] });
  }
  const bin = alignBin(parts);
  for (const bv of bufferViews) {
    const p = parts.shift();
    bv.byteOffset = p.offset;
  }
  for (const n of nodes) nodeDefs.push(n);
  const json = {
    asset: { version: '2.0', generator: 'CHUCO fallback GLB generator' },
    scene: 0,
    scenes: [{ nodes: nodeDefs.map((_, i) => i) }],
    nodes: nodeDefs,
    meshes: meshDefs,
    materials: [
      { name: 'cyan_body', pbrMetallicRoughness: { baseColorFactor: [0.28, 0.92, 1, 1], metallicFactor: 0.05, roughnessFactor: 0.38 }, emissiveFactor: [0.01, 0.12, 0.15] },
      { name: 'gold_body', pbrMetallicRoughness: { baseColorFactor: [1, 0.58, 0.16, 1], metallicFactor: 0.04, roughnessFactor: 0.42 }, emissiveFactor: [0.12, 0.04, 0] },
      { name: 'chuco_skin', pbrMetallicRoughness: { baseColorFactor: [0.48, 1, 0.86, 1], metallicFactor: 0.02, roughnessFactor: 0.32 }, emissiveFactor: [0.03, 0.1, 0.16] },
      { name: 'violet_fin', pbrMetallicRoughness: { baseColorFactor: [0.64, 0.42, 1, 0.72], metallicFactor: 0, roughnessFactor: 0.45 }, alphaMode: 'BLEND', doubleSided: true },
      { name: 'cleaner_shell', pbrMetallicRoughness: { baseColorFactor: [0.85, 0.72, 1, 0.82], metallicFactor: 0.02, roughnessFactor: 0.35 }, emissiveFactor: [0.06, 0.03, 0.12], alphaMode: 'BLEND' }
    ],
    buffers: [{ byteLength: bin.byteLength }], bufferViews, accessors
  };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = pad4(jsonBytes.length);
  const total = 12 + 8 + jsonBytes.length + jsonPad + 8 + bin.length;
  const glb = new Uint8Array(total);
  const dv = new DataView(glb.buffer);
  let o = 0;
  dv.setUint32(o, 0x46546c67, true); o += 4;
  dv.setUint32(o, 2, true); o += 4;
  dv.setUint32(o, total, true); o += 4;
  dv.setUint32(o, jsonBytes.length + jsonPad, true); o += 4;
  dv.setUint32(o, 0x4e4f534a, true); o += 4;
  glb.set(jsonBytes, o); o += jsonBytes.length;
  glb.fill(0x20, o, o + jsonPad); o += jsonPad;
  dv.setUint32(o, bin.length, true); o += 4;
  dv.setUint32(o, 0x004e4942, true); o += 4;
  glb.set(bin, o);
  writeFileSync(path, glb);
}
function boxMesh(sx, sy, sz, material) {
  const x=sx/2,y=sy/2,z=sz/2;
  const p=[-x,-y,z, x,-y,z, x,y,z, -x,y,z, x,-y,-z, -x,-y,-z, -x,y,-z, x,y,-z, -x,y,z, x,y,z, x,y,-z, -x,y,-z, -x,-y,-z, x,-y,-z, x,-y,z, -x,-y,z, x,-y,z, x,-y,-z, x,y,-z, x,y,z, -x,-y,-z, -x,-y,z, -x,y,z, -x,y,-z];
  const n=[0,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,1,0,0,1,0,0,1,0,0,1,0,-1,0,0,-1,0,0,-1,0,0,-1,0];
  const ind=[]; for(let i=0;i<6;i++){const b=i*4; ind.push(b,b+1,b+2,b,b+2,b+3);} return {positions:p,normals:n,indices:ind,material};
}
function fish(path, material=0) {
  writeGlb(path, [boxMesh(2.0,.62,.46,material), boxMesh(.72,.95,.08,3), boxMesh(.22,.75,.18,3)], [
    { name:'fish_body', mesh:0 }, { name:'fish_tail', mesh:1, translation:[-1.35,0,0] }, { name:'fish_fin', mesh:2, translation:[-.1,.45,0] }
  ]);
}
function chuco(path) {
  writeGlb(path, [boxMesh(2.8,.6,.5,2), boxMesh(.9,.82,.65,2), boxMesh(.82,1.2,.08,3), boxMesh(.08,.72,.08,3)], [
    { name:'chuco_body', mesh:0 }, { name:'chuco_head', mesh:1, translation:[1.75,0,0] }, { name:'chuco_tail', mesh:2, translation:[-1.75,0,0] },
    { name:'gill_l_0', mesh:3, translation:[2.05,.2,.42], rotation:[0,0,.35, .94] }, { name:'gill_r_0', mesh:3, translation:[2.05,.2,-.42], rotation:[0,0,-.35, .94] },
    { name:'gill_l_1', mesh:3, translation:[2.1,0,.48] }, { name:'gill_r_1', mesh:3, translation:[2.1,0,-.48] }
  ]);
}
function cleaner(path) {
  writeGlb(path, [boxMesh(1.1,.32,.32,4), boxMesh(.45,.22,.16,4), boxMesh(.04,.6,.04,4)], [
    { name:'cleaner_body', mesh:0 }, { name:'cleaner_head', mesh:1, translation:[.72,.05,0] },
    { name:'leg_0', mesh:2, translation:[-.25,-.35,.18], rotation:[.35,0,0,.94] }, { name:'leg_1', mesh:2, translation:[-.25,-.35,-.18], rotation:[-.35,0,0,.94] },
    { name:'leg_2', mesh:2, translation:[-.55,-.35,.18], rotation:[.35,0,0,.94] }, { name:'leg_3', mesh:2, translation:[-.55,-.35,-.18], rotation:[-.35,0,0,.94] }
  ]);
}

fish(`${OUT}/fallback-fish.glb`, 0);
fish(`${OUT}/fallback-cichlid.glb`, 1);
chuco(`${OUT}/fallback-chuco.glb`);
cleaner(`${OUT}/fallback-cleaner.glb`);
console.log('Generated fallback GLB models in', OUT);
