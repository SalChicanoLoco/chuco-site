#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('artifacts/ui-probe');
fs.mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const soak = args.includes('--soak');
const soakMs = Number((args.find(a => a.startsWith('--soak-ms=')) || '').split('=')[1] || 120000);

const script = `
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  const logs = [];
  const pageErrors = [];
  const timeline = [];
  const controls = ['feed','pet','light','toy','lisp','skin','researchToggle','quality'];
  page.on('console', msg => logs.push({ t: Date.now(), type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => pageErrors.push(String(err && err.message ? err.message : err)));

  await page.goto('http://127.0.0.1:4173/index.html?research=1', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '${outDir.replace(/\\/g, '/')}/initial.png', fullPage: true });

  const snapshot = async () => page.evaluate(() => {
    const d = window.__CHUCO_DEBUG__?.snapshot?.() || null;
    return {
      mood: document.getElementById('mood')?.textContent || null,
      energy: document.getElementById('energy')?.textContent || null,
      trust: document.getElementById('trust')?.textContent || null,
      residual: document.getElementById('residual')?.textContent || null,
      quality: document.getElementById('quality')?.textContent || null,
      researchOn: document.getElementById('researchPanel')?.classList.contains('on') || false,
      logCount: document.querySelectorAll('#log .entry').length,
      url: location.href,
      debug: d,
    };
  });

  const before = await snapshot();
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

  if (${soak ? 'true' : 'false'}) {
    const stopAt = Date.now() + ${soakMs};
    while (Date.now() < stopAt) {
      const id = controls[Math.floor(Math.random() * controls.length)];
      await page.click('#' + id);
      await page.waitForTimeout(250);
      const s = await snapshot();
      timeline.push({ t: Date.now(), action: id, debug: s.debug, mood: s.mood, energy: s.energy, trust: s.trust, residual: s.residual, logCount: s.logCount });
    }
  }

  await page.waitForTimeout(800);
  await page.screenshot({ path: '${outDir.replace(/\\/g, '/')}/after-interactions.png', fullPage: true });
  const after = await snapshot();

  const missingControls = results.filter(r => !r.present).map(r => r.id);
  const consoleErrors = logs.filter(l => l.type === 'error');
  const criticalConsoleErrors = consoleErrors.filter(l => /Runtime soft-fail|CHUCO init failed|Uncaught|TypeError|ReferenceError/.test(l.text));

  const timelineDebug = timeline.map(t => t.debug).filter(Boolean);
  const maxFoodSeen = Math.max(...timelineDebug.map(d => d.food), after.debug?.food ?? 0, before.debug?.food ?? 0);
  const maxFishSeen = Math.max(...timelineDebug.map(d => d.fish), after.debug?.fish ?? 0, before.debug?.fish ?? 0);
  const maxRipplesSeen = Math.max(...timelineDebug.map(d => d.ripples), after.debug?.ripples ?? 0, before.debug?.ripples ?? 0);

  const assertions = {
    controlsPresent: missingControls.length === 0,
    logProgressed: (after.logCount || 0) >= (before.logCount || 0),
    researchToggleResponded: before.researchOn !== after.researchOn,
    urlReflectsResearchToggle: before.url !== after.url,
    noPageErrors: pageErrors.length === 0,
    noCriticalConsoleErrors: criticalConsoleErrors.length === 0,
    debugStateAvailable: !!after.debug,
    foodBounded: !after.debug || maxFoodSeen <= after.debug.maxFood,
    fishBounded: !after.debug || maxFishSeen <= after.debug.maxFish,
    ripplesBounded: !after.debug || maxRipplesSeen <= after.debug.maxRipples,
  };

  const report = { mode: ${soak ? "'soak'" : "'quick'"}, before, after, controls: results, assertions, pageErrors, consoleErrors, criticalConsoleErrors, timeline, maxSeen: { maxFoodSeen, maxFishSeen, maxRipplesSeen }, console: logs };
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
