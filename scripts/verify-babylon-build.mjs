import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const fail = (message) => {
  console.error(`Babylon build verification failed: ${message}`);
  process.exit(1);
};

if (!existsSync('dist')) fail('dist directory is missing.');
if (!existsSync('dist/index.html')) fail('dist/index.html is missing.');

const html = readFileSync('dist/index.html', 'utf8');

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
  .map((name) => readFileSync(join(assetsDir, name), 'utf8'))
  .join('\n');

if (!combinedJs.includes('BABYLON ENGINE')) {
  fail('runtime boot proof string BABYLON ENGINE missing from bundled JavaScript.');
}

if (!combinedJs.includes('babylon-composed-engine')) {
  fail('runtime telemetry marker babylon-composed-engine missing from bundled JavaScript.');
}

console.log('Babylon build verification passed: Vite bundle, CSS, and Babylon runtime markers are present.');
