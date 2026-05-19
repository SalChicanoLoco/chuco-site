import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const fail = (message) => {
  console.error(`Babylon build verification failed: ${message}`);
  process.exit(1);
};

const read = (path) => readFileSync(path, 'utf8');

if (!existsSync('dist')) fail('dist directory is missing.');
if (!existsSync('dist/index.html')) fail('dist/index.html is missing.');
if (!existsSync('src/engine-babylon.js')) fail('src/engine-babylon.js is missing.');

const source = read('src/engine-babylon.js');

const forbiddenSourcePatterns = [
  ["/src/static-webgl", 'stale static WebGL entrypoint reference'],
  ["/src/main.js", 'stale source main.js entrypoint reference'],
  ['GLTFLoader', 'stale Three.js GLTFLoader reference'],
  ["from 'three'", 'bare Three.js import'],
  ['from "three"', 'bare Three.js import'],
  ['.target.copy(', 'Three.js-style Vector3 target.copy call; Babylon requires copyFrom'],
  ['.copy(state.algaeTarget)', 'Three.js-style Vector3 copy call; Babylon requires copyFrom'],
  ['.copy(f.root.position)', 'Three.js-style Vector3 copy call; Babylon requires copyFrom']
];

for (const [pattern, reason] of forbiddenSourcePatterns) {
  if (source.includes(pattern)) fail(`${reason}: ${pattern}`);
}

if (!source.includes('copyFrom(')) {
  fail('Babylon Vector3 copyFrom usage is missing from engine source.');
}
if (!source.includes('BABYLON ENGINE')) {
  fail('source runtime boot proof string BABYLON ENGINE missing.');
}
if (!source.includes('babylon-composed-engine')) {
  fail('source runtime telemetry marker babylon-composed-engine missing.');
}

const html = read('dist/index.html');

if (!html.includes('type="module"')) {
  fail('dist/index.html does not contain a module script.');
}

if (html.includes('/src/static-webgl') || html.includes('/src/main.js')) {
  fail('dist/index.html still references a stale source WebGL entrypoint.');
}

if (html.includes('/src/engine-babylon.js')) {
  fail('dist/index.html still references unbundled /src/engine-babylon.js.');
}

const assetsDir = 'dist/assets';
if (!existsSync(assetsDir)) fail('dist/assets directory is missing.');

const assets = readdirSync(assetsDir);
const jsAssets = assets.filter((name) => name.endsWith('.js'));
const cssAssets = assets.filter((name) => name.endsWith('.css'));

if (jsAssets.length === 0) fail('no bundled JavaScript asset found in dist/assets.');
if (cssAssets.length === 0) fail('no bundled CSS asset found in dist/assets.');

const combinedJs = jsAssets
  .map((name) => read(join(assetsDir, name)))
  .join('\n');

if (!combinedJs.includes('BABYLON ENGINE')) {
  fail('runtime boot proof string BABYLON ENGINE missing from bundled JavaScript.');
}

if (!combinedJs.includes('babylon-composed-engine')) {
  fail('runtime telemetry marker babylon-composed-engine missing from bundled JavaScript.');
}

console.log('Babylon build verification passed: Vite bundle, CSS, Babylon runtime markers, and regression guards are present.');
