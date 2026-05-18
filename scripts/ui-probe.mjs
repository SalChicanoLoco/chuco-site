#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('artifacts/ui-probe');
fs.mkdirSync(outDir, { recursive: true });

const script = `
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  const logs = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  await page.goto('http://127.0.0.1:4173/index.html?research=1', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '${outDir.replace(/\\/g, '/')}/initial.png', fullPage: true });

  const controls = ['feed','pet','light','toy','lisp','skin','researchToggle','quality'];
  const results = [];
  for (const id of controls) {
    const selector = '#' + id;
    const present = await page.$(selector) !== null;
    if (present) {
      await page.click(selector);
      await page.waitForTimeout(150);
    }
    results.push({ id, present });
  }

  await page.waitForTimeout(600);
  await page.screenshot({ path: '${outDir.replace(/\\/g, '/')}/after-interactions.png', fullPage: true });

  const state = await page.evaluate(() => ({
    mood: document.getElementById('mood')?.textContent || null,
    energy: document.getElementById('energy')?.textContent || null,
    trust: document.getElementById('trust')?.textContent || null,
    residual: document.getElementById('residual')?.textContent || null,
    quality: document.getElementById('quality')?.textContent || null,
    researchOn: document.getElementById('researchPanel')?.classList.contains('on') || false,
    logCount: document.querySelectorAll('#log .entry').length,
  }));

  const report = { controls: results, state, console: logs };
  require('node:fs').writeFileSync('${outDir.replace(/\\/g, '/')}/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((err) => {
  console.error('UI_PROBE_ERROR', err && err.stack ? err.stack : String(err));
  process.exit(1);
});`;

const child = spawn('node', ['-e', script], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
