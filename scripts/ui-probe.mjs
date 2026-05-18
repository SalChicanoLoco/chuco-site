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
  const pageErrors = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => pageErrors.push(String(err && err.message ? err.message : err)));

  await page.goto('http://127.0.0.1:4173/index.html?research=1', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '${outDir.replace(/\\/g, '/')}/initial.png', fullPage: true });

  const before = await page.evaluate(() => ({
    mood: document.getElementById('mood')?.textContent || null,
    energy: document.getElementById('energy')?.textContent || null,
    trust: document.getElementById('trust')?.textContent || null,
    residual: document.getElementById('residual')?.textContent || null,
    quality: document.getElementById('quality')?.textContent || null,
    researchOn: document.getElementById('researchPanel')?.classList.contains('on') || false,
    logCount: document.querySelectorAll('#log .entry').length,
    url: location.href,
  }));

  const controls = ['feed','pet','light','toy','lisp','skin','researchToggle','quality'];
  const results = [];
  for (const id of controls) {
    const selector = '#' + id;
    const present = await page.$(selector) !== null;
    if (present) {
      await page.click(selector);
      await page.waitForTimeout(180);
    }
    results.push({ id, present });
  }

  await page.waitForTimeout(800);
  await page.screenshot({ path: '${outDir.replace(/\\/g, '/')}/after-interactions.png', fullPage: true });

  const after = await page.evaluate(() => ({
    mood: document.getElementById('mood')?.textContent || null,
    energy: document.getElementById('energy')?.textContent || null,
    trust: document.getElementById('trust')?.textContent || null,
    residual: document.getElementById('residual')?.textContent || null,
    quality: document.getElementById('quality')?.textContent || null,
    researchOn: document.getElementById('researchPanel')?.classList.contains('on') || false,
    logCount: document.querySelectorAll('#log .entry').length,
    url: location.href,
  }));

  const missingControls = results.filter(r => !r.present).map(r => r.id);
  const consoleErrors = logs.filter(l => l.type === 'error');
  const assertions = {
    controlsPresent: missingControls.length === 0,
    logProgressed: (after.logCount || 0) >= (before.logCount || 0),
    researchToggleResponded: before.researchOn !== after.researchOn,
    urlReflectsResearchToggle: before.url !== after.url,
    noPageErrors: pageErrors.length === 0,
    noConsoleErrors: consoleErrors.length === 0,
  };

  const report = { before, after, controls: results, assertions, pageErrors, consoleErrors, console: logs };
  require('node:fs').writeFileSync('${outDir.replace(/\\/g, '/')}/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const failed = Object.entries(assertions).filter(([, ok]) => !ok).map(([k]) => k);
  await browser.close();
  if (failed.length) {
    console.error('UI_PROBE_ASSERTIONS_FAILED', failed.join(','));
    process.exit(2);
  }
})().catch((err) => {
  console.error('UI_PROBE_ERROR', err && err.stack ? err.stack : String(err));
  process.exit(1);
});`;

const child = spawn('node', ['-e', script], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
