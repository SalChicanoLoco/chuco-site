import { existsSync, readFileSync } from 'node:fs';

const required = [
  'index.html',
  'styles.css',
  'src/main.js',
  'functions/api/[[path]].js'
];

for (const file of required) {
  if (!existsSync(file)) {
    console.error(`Missing required static deploy file: ${file}`);
    process.exit(1);
  }
}

const js = readFileSync('src/main.js', 'utf8');
if (js.includes("from 'three'") || js.includes('from "three"')) {
  console.error('Static verification failed: src/main.js still imports bare module specifier three.');
  process.exit(1);
}
if (js.includes('GLTFLoader')) {
  console.error('Static verification failed: src/main.js still references GLTFLoader.');
  process.exit(1);
}

const html = readFileSync('index.html', 'utf8');
if (!html.includes('/src/main.js')) {
  console.error('Static verification failed: index.html must load /src/main.js.');
  process.exit(1);
}

console.log('Static verification passed: no bare imports, self-contained WebGL entrypoint present.');
