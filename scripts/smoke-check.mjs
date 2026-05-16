#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const files = ['index.html', 'app.js', 'styles.css'];
const out = [];

for (const file of files) {
  const txt = fs.readFileSync(file, 'utf8');
  const bad = [...txt].some((c) => c.charCodeAt(0) === 0xfffd);
  out.push(`${file}:utf8=${bad ? 'BAD' : 'OK'}`);
}

const html = fs.readFileSync('index.html', 'utf8');
const hasCss = /<link rel="stylesheet" href="styles\.css"\/?/.test(html);
const hasJs = /<script src="app\.js"><\/script>/.test(html);
out.push(`bootstrap:css=${hasCss?'OK':'BAD'} js=${hasJs?'OK':'BAD'}`);

const js = fs.readFileSync('app.js', 'utf8');
new vm.Script(js, { filename: 'app.js' });
out.push('syntax:app.js=OK');

const hasCaps = /const MAX_FOOD = \d+;[\s\S]*const MAX_FISH = \d+;[\s\S]*const MAX_RIPPLES = \d+;/.test(js);
const hasSoftFail = /Runtime soft-fail:/.test(js) && /try\s*\{[\s\S]*\}\s*catch\s*\(err\)/.test(js);
out.push(`guards:caps=${hasCaps?'OK':'BAD'} softfail=${hasSoftFail?'OK':'BAD'}`);

const signature = `${Buffer.from(js).length}:${Buffer.from(html).length}`;
out.push(`deterministic-signature:${signature}`);

console.log(out.join('\n'));
