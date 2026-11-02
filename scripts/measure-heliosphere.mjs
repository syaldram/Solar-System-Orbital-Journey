/* global console, URL, devicePixelRatio, document, performance, requestAnimationFrame */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import process from 'node:process';
import { setTimeout as setDeadline, clearTimeout as clearDeadline } from 'node:timers';
import { platform, arch, release, cpus, totalmem } from 'node:os';

// Run separately from browser tests, after npm run build. No application API.
const base = '/Solar-System-Orbital-Journey/';
const directory = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const channel = process.env.BENCHMARK_CHANNEL || 'chrome';
const headless = process.env.BENCHMARK_HEADED !== '1';
const quality = process.env.BENCHMARK_QUALITY || 'auto';
const warmupMs = Number(process.env.BENCHMARK_WARMUP_MS || 10000);
const durationMs = Number(process.env.BENCHMARK_DURATION_MS || 30000);
const dpr = Number(process.env.BENCHMARK_DPR ?? 1);
if (!Number.isFinite(dpr) || dpr <= 0) throw new RangeError('BENCHMARK_DPR must be positive and finite.');
if (!Number.isFinite(warmupMs) || warmupMs < 0) throw new RangeError('BENCHMARK_WARMUP_MS must be finite and >= 0.');
if (!Number.isFinite(durationMs) || durationMs < 1000) throw new RangeError('BENCHMARK_DURATION_MS must be finite and >= 1000.');
const faviconProbes = [];
const failedResponses = [];
const consoleErrors = [];
const errors = [];
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/favicon.ico') { faviconProbes.push({ path, status: 204 }); response.writeHead(204).end(); return; }
    if (!path.startsWith(base)) { response.writeHead(404).end(); return; }
    const file = resolve(directory, decodeURIComponent(path.slice(base.length)) || 'index.html');
    if (!file.startsWith(directory + sep)) { response.writeHead(403).end(); return; }
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
let browser;
try {
  browser = await chromium.launch({ channel, headless });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push({ text: message.text(), location: message.location() });
      errors.push(message.text());
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResponses.push({ url: response.url(), status: response.status() });
      errors.push(`Resource response ${response.status()}: ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    failedResponses.push({ url: request.url(), failure: request.failure()?.errorText });
    errors.push(`Resource request failed: ${request.url()}`);
  });
  await page.goto(`http://127.0.0.1:${address.port}${base}?view=sun`);
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Visual quality').selectOption(quality);
  await page.getByLabel('Reduce motion').uncheck();
  await page.getByRole('button', { name: 'Close options' }).click();
  await page.locator('#enter-heliosphere').click();
  await page.locator('#play-toggle').click();
  await page.waitForTimeout(warmupMs);
  const graphics = await page.evaluate(() => {
    const canvas = document.querySelector('#space-canvas');
    const gl = canvas.getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_debug_renderer_info');
    return { renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unavailable', vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : 'unavailable', dpr: devicePixelRatio };
  });
  const readWorkload = () => page.evaluate(() => {
    const canvas = document.querySelector('#space-canvas');
    const gl = canvas.getContext('webgl2');
    return {
      heliosphere: document.querySelector('#app')?.dataset.heliosphere === 'true',
      qualityPreference: document.querySelector('#quality-select')?.value,
      resolvedQualityTier: document.querySelector('#quality-select')?.value === 'auto' ? 'high' : document.querySelector('#quality-select')?.value,
      visibilityState: document.visibilityState,
      playing: document.querySelector('#play-toggle')?.getAttribute('aria-pressed'),
      date: document.querySelector('#current-date')?.textContent,
      reducedMotion: document.querySelector('#reduced-motion')?.checked,
      layers: Object.fromEntries([...document.querySelectorAll('[data-heliosphere-layer]')].map((input) => [input.dataset.heliosphereLayer, input.checked])),
      contextLost: !gl || gl.isContextLost(),
    };
  });
  const beforeObservation = await readWorkload();
  let deadline;
  let observation;
  const observationDeadlineMs = durationMs + 15000;
  try {
    observation = await Promise.race([
      page.evaluate((duration) => new Promise((done) => {
        const canvas = document.querySelector('#space-canvas');
        const gl = canvas.getContext('webgl2');
        const app = document.querySelector('#app');
        const play = document.querySelector('#play-toggle');
        const reduce = document.querySelector('#reduced-motion');
        const qualitySelect = document.querySelector('#quality-select');
        const layers = [...document.querySelectorAll('[data-heliosphere-layer]')];
        const startingQualityPreference = qualitySelect.value;
        const resolveTier = (preference) => preference === 'auto' ? 'high' : preference;
        const observedQualityTiers = new Set([resolveTier(startingQualityPreference)]);
        const qualityTransitions = [];
        let lastQuality = startingQualityPreference;
        const interruptions = [];
        const reported = new Set();
        const beganAt = performance.now();
        const interrupt = (reason) => {
          if (!reported.has(reason)) {
            reported.add(reason);
            interruptions.push({ reason, atMs: performance.now() - beganAt });
          }
        };
        const visibility = () => interrupt(`visibilitychange:${document.visibilityState}`);
        const contextLost = () => interrupt('webglcontextlost');
        const contextRestored = () => interrupt('webglcontextrestored');
        document.addEventListener('visibilitychange', visibility);
        canvas.addEventListener('webglcontextlost', contextLost);
        canvas.addEventListener('webglcontextrestored', contextRestored);
        const samples = [];
        let start;
        let previous;
        let checkedFrames = 0;
        function sample(now) {
          start ??= now;
          checkedFrames++;
          if (document.visibilityState !== 'visible') interrupt('frame:page-not-visible');
          if (app.dataset.heliosphere !== 'true') interrupt('frame:Heliosphere-not-active');
          if (play.getAttribute('aria-pressed') !== 'true') interrupt('frame:playback-not-active');
          if (reduce.checked) interrupt('frame:reduced-motion');
          if (!gl || gl.isContextLost()) interrupt('frame:context-lost');
          if (layers.length !== 4 || layers.some((input) => !input.checked)) interrupt('frame:layer-disabled');
          const preference = qualitySelect.value;
          const tier = resolveTier(preference);
          observedQualityTiers.add(tier);
          if (preference !== lastQuality) {
            qualityTransitions.push({ atMs: now - start, preference, resolvedTier: tier });
            lastQuality = preference;
          }
          if (previous !== undefined) samples.push(now - previous);
          previous = now;
          if (now - start >= duration) {
            document.removeEventListener('visibilitychange', visibility);
            canvas.removeEventListener('webglcontextlost', contextLost);
            canvas.removeEventListener('webglcontextrestored', contextRestored);
            done({ samples, checkedFrames, startingQualityPreference, startingQualityTier: resolveTier(startingQualityPreference), observedQualityTiers: [...observedQualityTiers], qualityTransitions, interruptions });
          } else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }), durationMs),
      new Promise((_, reject) => { deadline = setDeadline(() => reject(new Error(`RAF observation exceeded ${observationDeadlineMs} ms deadline`)), observationDeadlineMs); }),
    ]);
  } finally {
    clearDeadline(deadline);
  }
  const intervals = observation.samples;
  for (const interruption of observation.interruptions) errors.push(`Observation interrupted: ${interruption.reason} at ${interruption.atMs} ms`);
  const afterObservation = await readWorkload();
  for (const [stage, observation] of Object.entries({ beforeObservation, afterObservation })) {
    if (!observation.heliosphere) errors.push(`${stage}: Heliosphere was not active`);
    if (observation.visibilityState !== 'visible') errors.push(`${stage}: page was not visible`);
    if (observation.playing !== 'true') errors.push(`${stage}: planetary playback was not active`);
    if (observation.reducedMotion !== false) errors.push(`${stage}: decorative motion was reduced`);
    if (observation.contextLost) errors.push(`${stage}: WebGL context unavailable or lost`);
    if (Object.keys(observation.layers).length !== 4 || Object.values(observation.layers).some((enabled) => enabled !== true)) errors.push(`${stage}: all four Heliosphere layers were not enabled`);
  }
  if (beforeObservation.date === afterObservation.date) errors.push('Planetary date did not advance during observation');
  const sorted = [...intervals].sort((a, b) => a - b);
  const elapsedMs = intervals.reduce((sum, value) => sum + value, 0);
  const windows = [];
  let windowTime = 0, windowFrames = 0;
  for (const delta of intervals) { windowTime += delta; windowFrames++; if (windowTime >= 1000) { windows.push(windowFrames * 1000 / windowTime); windowTime = 0; windowFrames = 0; } }
  const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const endingQualityPreference = await page.locator('#quality-select').inputValue();
  const resolvedQualityTier = endingQualityPreference === 'auto' ? 'high' : endingQualityPreference;
  const canvasBacking = await page.locator('#space-canvas').evaluate((canvas) => ({
    width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight,
    ratioX: canvas.width / canvas.clientWidth, ratioY: canvas.height / canvas.clientHeight,
  }));
  console.log(JSON.stringify({ recordedAt: new Date().toISOString(), host: { platform: platform(), arch: arch(), release: release(), cpu: cpus()[0]?.model, memoryGiB: totalmem() / 1024 ** 3, hostnameRecorded: false }, browser: browser.version(), channel, headless, graphics, viewport: { width: 1440, height: 900 }, requestedDpr: dpr, canvasBacking, requestedQuality: quality, startingQualityPreference: observation.startingQualityPreference, startingQualityTier: observation.startingQualityTier, observedQualityTiers: observation.observedQualityTiers, qualityTransitions: observation.qualityTransitions, endingQualityPreference, resolvedQualityTier, workload: 'Requested Heliosphere overview with all layers and planetary/decorative playback; raw workloadChecks determine observation validity', workloadChecks: { beforeObservation, afterObservation, checkedFrames: observation.checkedFrames, interruptions: observation.interruptions, dateAdvanced: beforeObservation.date !== afterObservation.date, valid: errors.length === 0 }, warmupMs, requestedDurationMs: durationMs, observationDeadlineMs, actualDurationMs: elapsedMs, method: 'Uncontended browser requestAnimationFrame intervals with per-frame native control checks and visibility/context event observation; no app instrumentation. Distribution includes stalls.', samples: intervals.length, averageFps: intervals.length * 1000 / elapsedMs, frameMs: { p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: sorted.at(-1) }, oneSecondWindowFps: { min: Math.min(...windows), max: Math.max(...windows), values: windows }, errors, failedResponses, consoleErrors, faviconProbes, limitations: 'Local automated laptop RAF observation; not physical phone FPS, manual Safari, remote CI or deployed-site evidence.' }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ recordedAt: new Date().toISOString(), valid: false, error: String(error), errors, failedResponses, consoleErrors, faviconProbes }, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
