import { existsSync, readFileSync } from 'node:fs';

const fail = (message) => {
  console.error(`Runtime source check failed: ${message}`);
  process.exit(1);
};

const requiredFiles = [
  'index.html',
  'src/engine-babylon.js',
  'package.json',
  'wrangler.toml'
];

for (const file of requiredFiles) {
  if (!existsSync(file)) fail(`missing required file: ${file}`);
}

const html = readFileSync('index.html', 'utf8');
const engine = readFileSync('src/engine-babylon.js', 'utf8');
const pkg = readFileSync('package.json', 'utf8');
const wrangler = readFileSync('wrangler.toml', 'utf8');

const requireContains = (name, text, pattern) => {
  if (!text.includes(pattern)) fail(`${name} must contain ${pattern}`);
};
const forbidContains = (name, text, pattern, reason) => {
  if (text.includes(pattern)) fail(`${name} contains forbidden pattern ${pattern}${reason ? ` (${reason})` : ''}`);
};

requireContains('index.html', html, 'BABYLON BUILD 2026-05-19-01');
requireContains('index.html', html, '<script type="module" src="/src/engine-babylon.js"></script>');
requireContains('index.html', html, 'BABYLON BOOT');

forbidContains('index.html', html, '/src/static-webgl', 'stale hand-rolled WebGL runtime');
forbidContains('index.html', html, '/src/main.js', 'stale source entrypoint');
forbidContains('index.html', html, 'creature-skin-overlay', 'overlay renderer is not part of the hardened baseline');
forbidContains('index.html', html, 'creature-skin-v2', 'overlay renderer is not part of the hardened baseline');

requireContains('src/engine-babylon.js', engine, "from '@babylonjs/core'");
requireContains('src/engine-babylon.js', engine, 'BABYLON ENGINE');
requireContains('src/engine-babylon.js', engine, 'babylon-composed-engine');
requireContains('src/engine-babylon.js', engine, 'copyFrom(');
requireContains('src/engine-babylon.js', engine, 'spawnPellets();');
requireContains('src/engine-babylon.js', engine, 'spawnBubbles(32);');
requireContains('src/engine-babylon.js', engine, 'resetSpecies();');

forbidContains('src/engine-babylon.js', engine, "from 'three'", 'Babylon runtime must not import Three');
forbidContains('src/engine-babylon.js', engine, 'from "three"', 'Babylon runtime must not import Three');
forbidContains('src/engine-babylon.js', engine, 'GLTFLoader', 'Three loader is not part of this baseline');
forbidContains('src/engine-babylon.js', engine, '.target.copy(', 'Babylon Vector3 uses copyFrom');
forbidContains('src/engine-babylon.js', engine, '.copy(state.algaeTarget)', 'Babylon Vector3 uses copyFrom');
forbidContains('src/engine-babylon.js', engine, '.copy(f.root.position)', 'Babylon Vector3 uses copyFrom');

requireContains('package.json', pkg, 'vite build && node scripts/verify-babylon-build.mjs');
requireContains('package.json', pkg, '@babylonjs/core');
requireContains('wrangler.toml', wrangler, 'pages_build_output_dir = "dist"');

console.log('Runtime source check passed: Babylon baseline, entrypoint, controls, and regression guards are intact.');
