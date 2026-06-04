import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const fail = (message, details = {}) => {
  mkdirSync('artifacts/smoke', { recursive: true });
  writeFileSync('artifacts/smoke/report.json', JSON.stringify({ ok: false, message, details }, null, 2));
  console.error(`Built bundle smoke failed: ${message}`);
  process.exit(1);
};

const pass = (details) => {
  mkdirSync('artifacts/smoke', { recursive: true });
  writeFileSync('artifacts/smoke/report.json', JSON.stringify({ ok: true, ...details }, null, 2));
  console.log('Built bundle smoke passed: Babylon dist output contains required runtime and control markers.');
};

if (!existsSync('dist/index.html')) fail('dist/index.html missing. Run npm run build first.');
if (!existsSync('dist/assets')) fail('dist/assets missing. Run npm run build first.');

const html = readFileSync('dist/index.html', 'utf8');
const assets = readdirSync('dist/assets');
const jsAssets = assets.filter((name) => name.endsWith('.js'));
const cssAssets = assets.filter((name) => name.endsWith('.css'));

if (jsAssets.length === 0) fail('no JavaScript assets found in dist/assets');
if (cssAssets.length === 0) fail('no CSS assets found in dist/assets');

const bundle = jsAssets.map((name) => readFileSync(join('dist/assets', name), 'utf8')).join('\n');

const requiredHtml = [
  'BABYLON BUILD 2026-05-19-01',
  'BABYLON BOOT',
  'data-action="feed"',
  'data-action="oxygen"',
  'data-action="shade"',
  'data-action="biofilter"',
  'data-action="scan"',
  'data-action="species"'
];

for (const marker of requiredHtml) {
  if (!html.includes(marker)) fail(`dist/index.html missing marker: ${marker}`);
}

const requiredBundle = [
  'BABYLON ENGINE',
  'babylon-composed-engine',
  'spawnPellets',
  'spawnBubbles',
  'resetSpecies',
  'copyFrom',
  'water volume',
  'Chuco guardian'
];

for (const marker of requiredBundle) {
  if (!bundle.includes(marker)) fail(`bundle missing marker: ${marker}`);
}

const forbidden = [
  '/src/static-webgl',
  '/src/main.js',
  'creature-skin-overlay',
  'creature-skin-v2',
  "from 'three'",
  'from "three"',
  'GLTFLoader',
  '.target.copy('
];

for (const marker of forbidden) {
  if (html.includes(marker) || bundle.includes(marker)) fail(`forbidden stale marker present: ${marker}`);
}

pass({
  jsAssets,
  cssAssets,
  bundleBytes: Buffer.byteLength(bundle, 'utf8'),
  htmlBytes: Buffer.byteLength(html, 'utf8')
});
