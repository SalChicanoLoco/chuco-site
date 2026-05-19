import { existsSync, readFileSync } from 'node:fs';

const required = [
  'dist/index.html',
  'dist/assets/models/base/base-fish.gltf',
  'dist/assets/models/base/base-cichlid.gltf',
  'dist/assets/models/base/base-chuco.gltf',
  'dist/assets/models/base/base-cleaner.gltf'
];

for (const path of required) {
  if (!existsSync(path)) {
    console.error(`Missing required build artifact: ${path}`);
    process.exit(1);
  }
}

const html = readFileSync('dist/index.html', 'utf8');
if (html.includes('/src/main.js')) {
  console.error('Build failed verification: dist/index.html still references /src/main.js instead of bundled assets.');
  process.exit(1);
}

if (!html.includes('type="module"')) {
  console.error('Build failed verification: no module script found in dist/index.html.');
  process.exit(1);
}

console.log('Build verification passed: bundled Vite output and base model files are present.');
