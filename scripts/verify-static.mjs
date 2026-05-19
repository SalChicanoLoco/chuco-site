import { existsSync, readFileSync } from 'node:fs';

const required = [
  'index.html',
  'styles.css',
  'src/static-webgl.js',
  'functions/api/[[path]].js'
];

for (const file of required) {
  if (!existsSync(file)) {
    console.error(`Missing required static deploy file: ${file}`);
    process.exit(1);
  }
}

const html = readFileSync('index.html', 'utf8');
if (!html.includes('/src/static-webgl.js')) {
  console.error('Static verification failed: index.html must load /src/static-webgl.js.');
  process.exit(1);
}
if (html.includes('/src/main.js')) {
  console.error('Static verification failed: index.html still loads stale /src/main.js.');
  process.exit(1);
}

const js = readFileSync('src/static-webgl.js', 'utf8');
if (js.includes("from 'three'") || js.includes('from "three"')) {
  console.error('Static verification failed: static-webgl.js imports bare module specifier three.');
  process.exit(1);
}
if (js.includes('GLTFLoader')) {
  console.error('Static verification failed: static-webgl.js references GLTFLoader.');
  process.exit(1);
}
if (!js.includes('precision mediump float')) {
  console.error('Static verification failed: shaders must declare explicit float precision.');
  process.exit(1);
}
if (!js.includes('STATIC WEBGL')) {
  console.error('Static verification failed: runtime boot proof string STATIC WEBGL missing.');
  process.exit(1);
}

console.log('Static verification passed: precision-safe static WebGL entrypoint present.');
