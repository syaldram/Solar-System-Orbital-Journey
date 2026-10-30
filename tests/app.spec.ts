import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

interface HeliosphereRenderSample {
  phase: number;
  simulationTimeMs: number;
  boundaryScale: number;
  flow: number[];
  shimmer: number;
  solarTime: number;
  spin: number;
  positions: number[][];
}

// Inspect the actual production render boundary only inside the browser test.
// No test API or alternate rendering path is shipped with the application.
async function observeHeliosphereRender(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const diagnostics: unknown[] = [];
    const record = (stage: string, event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest('#play-toggle, select');
      if (event.type !== 'visibilitychange' && event.type !== 'focus' && event.type !== 'blur' && !control) return;
      diagnostics.push({
        stage, type: event.type, now: performance.now(), trusted: event.isTrusted,
        eventAt: event.timeStamp,
        target: target?.id, control: control?.id,
        detail: event instanceof MouseEvent ? event.detail : undefined,
        value: control instanceof HTMLSelectElement ? control.value : undefined,
        hidden: document.hidden, visibility: document.visibilityState,
        focused: document.hasFocus(), active: document.activeElement?.id,
        pressed: document.getElementById('play-toggle')?.getAttribute('aria-pressed'),
      });
      if (diagnostics.length > 200) diagnostics.shift();
    };
    (window as unknown as { __heliosphereDiagnostics: unknown[] }).__heliosphereDiagnostics = diagnostics;
    for (const type of ['visibilitychange', 'pointerdown', 'pointerup', 'click', 'dblclick', 'change', 'focus', 'blur']) {
      document.addEventListener(type, (event) => {
        record('before-handlers', event);
        setTimeout(() => record('next-task', event), 0);
      }, true);
      document.addEventListener(type, (event) => record('after-target-handlers', event));
    }
  });
  await page.route('**/src/rendering/orbital-scene.ts*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
const originalRender = OrbitalScene.prototype.render;
OrbitalScene.prototype.render = function(state, now) {
  originalRender.call(this, state, now);
  const sky = this.heliosphereBackground.root;
  const stars = sky.getObjectByName('heliosphere-distant-stars');
  const band = sky.getObjectByName('heliosphere-milky-way-band');
  window.__heliosphereSky = {
    visible: sky.visible,
    ids: [sky.uuid, band.geometry.uuid, band.material.uuid, stars.geometry.uuid, stars.material.uuid],
    transform: sky.matrixWorld.toArray(),
    starCount: stars.geometry.drawRange.count,
    positions: Array.from(stars.geometry.getAttribute('position').array).slice(0, 12),
    uniforms: Object.keys(band.material.uniforms),
    children: [band.matrix.toArray(), stars.matrix.toArray()],
    starMaterial: stars.material.toJSON(),
    camera: this.camera.position.toArray(),
    direction: this.camera.quaternion.toArray(),
    cameraDistance: this.camera.position.distanceTo(this.cameraController.controls.target),
  };
  if (!state.heliosphere) return;
  const presentation = this.heliospherePresentation;
  const flow = presentation.root.getObjectByName('solar-wind-flow');
  const sun = this.solarPresentation.mesh;
  window.__heliosphereRender = {
    phase: state.heliospherePhaseSeconds,
    simulationTimeMs: state.snapshot.instant.getTime(),
    boundaryScale: presentation.root.scale.x,
    flow: Array.from(flow.geometry.getAttribute('position').array).slice(0, 9),
    shimmer: presentation.drawables[0].object.material.opacity,
    solarTime: sun.material.uniforms.time.value,
    spin: this.planetMeshes.get('earth').rotation.y,
    positions: Array.from(this.planetTiltGroups.values()).map(object => object.position.toArray()),
  };
  window.__heliospherePlayback = { playing: state.pathMotion.isPlaying, reducedMotion: state.reducedMotion, hidden: document.hidden, now };
  const earth = this.planetTiltGroups.get('earth');
  const projected = earth.getWorldPosition(earth.position.clone()).project(this.camera);
  window.__heliosphereEarthTarget = { x: (projected.x * .5 + .5) * this.renderer.domElement.clientWidth, y: (-projected.y * .5 + .5) * this.renderer.domElement.clientHeight };
};` });
  });
}

test.afterEach(async ({ page }, testInfo) => {
  if (!testInfo.title.startsWith('Heliosphere actual flow, shimmer') || testInfo.status === testInfo.expectedStatus) return;
  const diagnostics = await page.evaluate(() => {
    const observed = window as unknown as {
      __heliosphereDiagnostics: unknown[];
      __heliospherePlayback: unknown;
      __heliosphereRender: HeliosphereRenderSample;
    };
    return {
      events: observed.__heliosphereDiagnostics,
      playback: observed.__heliospherePlayback,
      rendered: observed.__heliosphereRender,
      pressed: document.getElementById('play-toggle')?.getAttribute('aria-pressed'),
      speed: document.querySelector<HTMLSelectElement>('#speed-select')?.value,
      date: document.getElementById('current-date')?.textContent,
      hidden: document.hidden, visibility: document.visibilityState,
    };
  });
  await testInfo.attach('heliosphere-playback-diagnostics', {
    body: JSON.stringify(diagnostics, null, 2), contentType: 'application/json',
  });
});

async function heliosphereRender(page: Page): Promise<HeliosphereRenderSample> {
  return page.evaluate(() => (window as unknown as { __heliosphereRender: HeliosphereRenderSample }).__heliosphereRender);
}

async function renderedFrames(page: Page, count = 4): Promise<void> {
  await page.evaluate((frames) => new Promise<void>((resolve) => {
    const next = () => { if (--frames <= 0) resolve(); else requestAnimationFrame(next); };
    requestAnimationFrame(next);
  }), count);
}

interface HeliosphereSkySample {
  visible: boolean;
  ids: string[];
  transform: number[];
  starCount: number;
  positions: number[];
  uniforms: string[];
  children: number[][];
  starMaterial: unknown;
  camera: number[];
  direction: number[];
  cameraDistance: number;
}

async function heliosphereSky(page: Page): Promise<HeliosphereSkySample> {
  return page.evaluate(() => (window as unknown as { __heliosphereSky: HeliosphereSkySample }).__heliosphereSky);
}

function collectRenderErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

test('Heliosphere static sky adapts actual density and retains readable semantic controls across layouts', async ({ page, browserName }, testInfo) => {
  const errors = collectRenderErrors(page);
  await observeHeliosphereRender(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('./?view=sun');
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Visual quality').selectOption('high');
  await page.getByRole('button', { name: 'Close options' }).click();
  await page.locator('#enter-heliosphere').click();
  await renderedFrames(page);
  const initial = await heliosphereSky(page);
  expect(initial.visible).toBe(true);
  expect(initial.starCount).toBe(900);
  expect(initial.uniforms).toEqual([]);
  await renderedFrames(page, 10);
  expect(await heliosphereSky(page)).toEqual(initial);
  await captureHeliosphere(page, testInfo, 'sky-desktop-high-labels');
  await page.locator('#play-toggle').click();
  await expect.poll(async () => (await heliosphereRender(page)).phase).toBeGreaterThan(.2);
  expect(await heliosphereSky(page)).toEqual(initial);
  await page.locator('#play-toggle').click();
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Reduce motion').check();
  await expect(page.getByLabel('Reduce motion')).toBeChecked();
  await page.getByRole('button', { name: 'Close options' }).click();
  await renderedFrames(page);
  expect(await page.evaluate(() => (window as unknown as { __heliospherePlayback: { reducedMotion: boolean } }).__heliospherePlayback.reducedMotion)).toBe(true);
  expect(await heliosphereSky(page)).toEqual(initial);
  await page.locator('[data-heliosphere-layer="labels"]').uncheck();
  await renderedFrames(page);
  await expect(page.locator('#heliosphere-regions button')).toHaveCount(5);
  await page.locator('#heliosphere-regions button').first().focus();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const focused = page.locator('#heliosphere-regions button').nth(1);
  await expect(focused).toBeFocused();
  expect(await focused.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('#planet-name')).toHaveText('Termination shock');
  await captureHeliosphere(page, testInfo, 'sky-desktop-labels-off-focus');
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Visual quality').selectOption('low');
  await page.getByRole('button', { name: 'Close options' }).click();
  await expect.poll(async () => (await heliosphereSky(page)).starCount).toBe(280);
  await captureHeliosphere(page, testInfo, 'sky-desktop-low');
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Visual quality').selectOption('high');
  await page.getByRole('button', { name: 'Close options' }).click();
  // Resize at fixed DPR, preserving the live session and quality preference.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await heliosphereSky(page)).starCount).toBe(405);
  await page.locator('[data-heliosphere-layer="labels"]').check();
  await page.locator('#close-planet').click();
  await page.locator('#heliosphere-reset-camera').click();
  await settledBoundingBox(page.locator('[data-body="earth"]'));
  const phoneSummary = page.locator('#heliosphere-sheet > summary');
  await phoneSummary.click();
  await expect(page.locator('#heliosphere-sheet')).not.toHaveAttribute('open');
  await renderedFrames(page);
  await captureHeliosphere(page, testInfo, 'sky-phone-high-overview');
  await phoneSummary.click();
  await page.locator('[data-region="heliopause"]').click();
  await expect(page.locator('#planet-name')).toHaveText('Heliopause');
  await expect(page.locator('#heliosphere-regions button')).toHaveCount(5);
  await expect(page.locator('[data-heliosphere-layer="labels"]')).toBeEnabled();
  await page.locator('#planet-name').scrollIntoViewIfNeeded();
  await renderedFrames(page);
  await captureHeliosphere(page, testInfo, 'sky-phone-region-card');
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect.poll(async () => (await heliosphereSky(page)).starCount).toBe(900);
  await page.getByRole('button', { name: 'Explain this view' }).click();
  await expect(page.getByText(/The faint Milky Way band and distant stars are decorative artwork/)).toBeVisible();
  await expect(page.getByText(/Tail orientation is illustrative and is not inferred/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('Heliosphere static sky stays behind max-zoom panned views and reuses resources across sessions', async ({ page }, testInfo) => {
  const errors = collectRenderErrors(page);
  await observeHeliosphereRender(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('./?view=sun');
  await page.locator('#enter-heliosphere').click();
  await renderedFrames(page);
  const initial = await heliosphereSky(page);
  expect(initial.visible).toBe(true);
  await page.locator('[data-camera-navigation="orbit-left"]').click();
  await settledBoundingBox(page.locator('[data-body="earth"]'));
  const navigated = await heliosphereSky(page);
  expect(navigated.direction).not.toEqual(initial.direction);
  expect(navigated.transform.slice(0, 12)).toEqual(initial.transform.slice(0, 12));
  expect(navigated.transform.slice(12, 15)).toEqual(navigated.camera);
  expect(navigated.positions).toEqual(initial.positions);
  expect(navigated.children).toEqual(initial.children);
  expect(navigated.starMaterial).toEqual(initial.starMaterial);
  for (let step = 0; step < 12; step += 1) await page.locator('[data-camera-navigation="zoom-out"]').click();
  await page.locator('[data-camera-navigation="pan-right"]').click();
  await renderedFrames(page);
  const outer = await heliosphereSky(page);
  expect(outer.cameraDistance).toBeCloseTo(2500, 5);
  expect(outer.transform.slice(12, 15)).toEqual(outer.camera);
  expect(outer.positions).toEqual(initial.positions);
  expect(outer.children).toEqual(initial.children);
  expect(outer.starMaterial).toEqual(initial.starMaterial);
  await captureHeliosphere(page, testInfo, 'sky-max-zoom-panned');
  await page.locator('#leave-heliosphere').click();
  await expect.poll(async () => (await heliosphereSky(page)).visible).toBe(false);
  await page.locator('#enter-heliosphere').click();
  await renderedFrames(page);
  expect((await heliosphereSky(page)).ids).toEqual(initial.ids);
  expect(errors).toEqual([]);
});

test('Heliosphere static sky freezes during reduced-motion planetary playback', async ({ page }) => {
  const errors = collectRenderErrors(page);
  await observeHeliosphereRender(page);
  await page.goto('./?view=sun');
  await page.locator('#enter-heliosphere').click();
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Reduce motion').check();
  await expect(page.getByLabel('Reduce motion')).toBeChecked();
  await page.getByRole('button', { name: 'Close options' }).click();
  await page.getByLabel('Speed', { exact: true }).selectOption('year');
  await renderedFrames(page);
  const sky = await heliosphereSky(page);
  const before = await heliosphereRender(page);
  await page.locator('#play-toggle').click();
  await expect.poll(async () => (await heliosphereRender(page)).simulationTimeMs).toBeGreaterThan(before.simulationTimeMs);
  await renderedFrames(page, 8);
  const after = await heliosphereRender(page);
  expect(after.positions).not.toEqual(before.positions);
  expect(after.phase).toBe(before.phase);
  expect(await heliosphereSky(page)).toEqual(sky);
  expect(await page.evaluate(() => (window as unknown as { __heliospherePlayback: { reducedMotion: boolean } }).__heliospherePlayback.reducedMotion)).toBe(true);
  await page.locator('#play-toggle').click();
  await renderedFrames(page);
  expect(await heliosphereSky(page)).toEqual(sky);
  expect(errors).toEqual([]);
});

test('Heliosphere static sky phone low quality keeps Labels-off card and keyboard focus readable', async ({ page, browserName }, testInfo) => {
  const errors = collectRenderErrors(page);
  await observeHeliosphereRender(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?view=sun');
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Visual quality').selectOption('low');
  await page.getByRole('button', { name: 'Close options' }).click();
  await page.locator('#enter-heliosphere').click();
  await expect.poll(async () => (await heliosphereSky(page)).starCount).toBe(126);
  await page.locator('#heliosphere-sheet > summary').click();
  await renderedFrames(page);
  await captureHeliosphere(page, testInfo, 'sky-phone-low-overview');
  await page.locator('#heliosphere-sheet > summary').click();
  await page.locator('[data-heliosphere-layer="labels"]').uncheck();
  await page.locator('#heliosphere-regions button').first().focus();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const focused = page.locator('#heliosphere-regions button').nth(1);
  await expect(focused).toBeFocused();
  expect(await focused.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
  await captureHeliosphere(page, testInfo, 'sky-phone-low-labels-off-focus');
  await page.keyboard.press('Enter');
  await expect(page.locator('#planet-name')).toHaveText('Termination shock');
  await expect(page.locator('#heliosphere-regions button')).toHaveCount(5);
  await expect(page.locator('[data-heliosphere-layer="labels"]')).not.toBeChecked();
  await page.locator('#planet-name').scrollIntoViewIfNeeded();
  await renderedFrames(page);
  await captureHeliosphere(page, testInfo, 'sky-phone-low-labels-off-card');
  expect(errors).toEqual([]);
});

test('Heliosphere actual flow, shimmer, Sun and spin share retained motion through playback lifecycle', async ({ page }, testInfo) => {
  await observeHeliosphereRender(page);
  await page.goto('./?view=sun&body=earth');
  await page.locator('#enter-heliosphere').click();
  await page.getByLabel('Speed', { exact: true }).selectOption('year');
  await renderedFrames(page);
  const initial = await heliosphereRender(page);
  await renderedFrames(page);
  expect(await heliosphereRender(page)).toEqual(initial);
  await page.locator('#play-toggle').click();
  await expect.poll(async () => (await heliosphereRender(page)).phase).toBeGreaterThan(.2);
  await page.locator('#play-toggle').click();
  await renderedFrames(page);
  const paused = await heliosphereRender(page);
  expect(paused.flow).not.toEqual(initial.flow);
  expect(paused.shimmer).not.toBe(initial.shimmer);
  expect(paused.solarTime).toBeGreaterThan(initial.solarTime);
  expect(paused.spin).toBeGreaterThan(initial.spin);
  expect(paused.boundaryScale).toBeCloseTo(1 + .02 * Math.sin(paused.phase * Math.PI / 10), 12);
  await renderedFrames(page, 8);
  expect(await heliosphereRender(page)).toEqual(paused);
  await captureHeliosphere(page, testInfo, 'motion-retained');
  await page.getByLabel('Speed', { exact: true }).selectOption('month');
  await page.locator('#play-toggle').click();
  const inspectionPhase = (await heliosphereRender(page)).phase;
  await page.getByRole('button', { name: 'Focus Camera', exact: true }).click();
  await page.locator('#follow-planet').click();
  await expect(page.locator('#follow-planet')).toHaveText('Stop Following Earth');
  await page.locator('[data-camera-navigation="orbit-left"]').click();
  await page.locator('[data-heliosphere-layer="outerHeliosphere"]').uncheck();
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Visual quality').selectOption('low');
  await page.getByRole('button', { name: 'Close options' }).click();
  await renderedFrames(page);
  await expect(page.locator('#follow-planet')).toHaveText('Stop Following Earth');
  await expect(page.locator('#play-toggle')).toHaveAttribute('aria-pressed', 'true');
  expect((await heliosphereRender(page)).phase).toBeGreaterThan(inspectionPhase);
  // Read both marker and rendered mapped target in one frame, without waiting
  // for a deliberately moving Follow target to settle.
  const aligned = await page.evaluate(() => {
    const expected = (window as unknown as { __heliosphereEarthTarget: { x: number; y: number } }).__heliosphereEarthTarget;
    const marker = document.querySelector<HTMLElement>('[data-body="earth"]');
    return { expected, x: Number.parseFloat(marker?.style.left ?? 'NaN'), y: Number.parseFloat(marker?.style.top ?? 'NaN') };
  });
  // SceneLabels serializes CSS coordinates to three decimal places.
  expect(Math.abs(aligned.x - aligned.expected.x)).toBeLessThanOrEqual(.001);
  expect(Math.abs(aligned.y - aligned.expected.y)).toBeLessThanOrEqual(.001);
  await page.locator('#follow-planet').click();
  await page.locator('#play-toggle').click();
  await page.locator('[data-heliosphere-layer="outerHeliosphere"]').check();
  for (const speed of ['day', 'month', 'year', 'decade']) {
    await page.getByLabel('Speed', { exact: true }).selectOption(speed);
    await expect(page.locator('#play-toggle'), `paused before starting ${speed}`).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#play-toggle').click();
    await expect(page.locator('#play-toggle'), `playing after starting ${speed}`).toHaveAttribute('aria-pressed', 'true');
    const start = await heliosphereRender(page);
    await expect.poll(async () => (await heliosphereRender(page)).phase).toBeGreaterThan(start.phase + .1);
    await page.locator('#play-toggle').click();
    await expect(page.locator('#play-toggle'), `paused after stopping ${speed}`).toHaveAttribute('aria-pressed', 'false');
    await renderedFrames(page);
    const end = await heliosphereRender(page);
    expect(end.solarTime - start.solarTime).toBeCloseTo((end.phase - start.phase) * .22, 10);
  }
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Reduce motion').check();
  await page.getByRole('button', { name: 'Close options' }).click();
  await renderedFrames(page);
  const reduced = await heliosphereRender(page);
  await page.locator('#play-toggle').click();
  await renderedFrames(page, 8);
  const reducedPlaying = await heliosphereRender(page);
  expect(reducedPlaying.positions).not.toEqual(reduced.positions);
  expect({ ...reducedPlaying, positions: [], simulationTimeMs: 0 }).toEqual({ ...reduced, positions: [], simulationTimeMs: 0 });
  await page.locator('#play-toggle').click();
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Reduce motion').uncheck();
  await page.getByRole('button', { name: 'Close options' }).click();
  await expect(page.locator('#play-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#play-toggle').click();
  await page.locator('#timeline-range').fill('5000');
  await expect(page.locator('#play-toggle')).toHaveAttribute('aria-pressed', 'false');
  await renderedFrames(page);
  const scrubbed = await heliosphereRender(page);
  await renderedFrames(page, 8);
  expect(await heliosphereRender(page)).toEqual(scrubbed);
  await page.locator('#play-toggle').click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await renderedFrames(page);
  const hidden = await heliosphereRender(page);
  await renderedFrames(page, 8);
  expect(await heliosphereRender(page)).toEqual(hidden);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#play-toggle')).toHaveAttribute('aria-pressed', 'false');
  await renderedFrames(page);
  expect(await heliosphereRender(page)).toEqual(hidden);
  await page.locator('#play-toggle').click();
  await expect.poll(async () => (await heliosphereRender(page)).phase).toBeGreaterThan(hidden.phase);
  await page.locator('#timeline-range').fill('9999');
  await page.locator('#play-toggle').click();
  await expect(page.locator('#journey-complete')).toBeVisible();
  await expect(page.locator('#play-toggle')).toHaveAttribute('aria-pressed', 'false');
  await renderedFrames(page);
  const endpoint = await heliosphereRender(page);
  await renderedFrames(page, 8);
  expect(await heliosphereRender(page)).toEqual(endpoint);
});

async function captureHeliosphere(page: Page, info: TestInfo, name: string): Promise<void> {
  await expect(page.locator('#hero')).toHaveCSS('opacity', '0');
  const path = info.outputPath(`${name}-${info.project.name}.png`);
  await page.screenshot({ path });
  await info.attach(`${name} (${info.project.name})`, { path, contentType: 'image/png' });
}

test('Heliosphere delayed RAF charges only permitted wall intervals and never catches up hidden time', async ({ page }) => {
  await observeHeliosphereRender(page);
  const epoch = new Date('2026-10-30T00:00:00Z');
  await page.clock.install({ time: epoch });
  // Pause before application timers exist. The fixed future target avoids a
  // running Date.now() roundtrip becoming stale under concurrent browser load.
  await page.clock.pauseAt(new Date(epoch.getTime() + 3600000));
  await page.goto('./?view=sun&body=earth');
  // A paused clock cannot satisfy actionability's RAF stability wait; invoke
  // the same native handler, then explicitly deliver the initial render frames.
  await page.locator('#enter-heliosphere').evaluate((element) => (element as HTMLElement).click());
  await page.clock.runFor(64);
  // Hold browser RAF dispatch, keeping the real app callback and real input
  // handlers. Wall time advances independently; each frame explicitly delivers
  // those callbacks with the current performance time.
  await page.evaluate(() => {
    const pending: FrameRequestCallback[] = [];
    (window as unknown as { __pendingFrames: FrameRequestCallback[] }).__pendingFrames = pending;
    window.requestAnimationFrame = (callback) => { pending.push(callback); return pending.length; };
  });
  await page.clock.runFor(32);
  const frame = async () => {
    await page.evaluate(() => {
      const pending = (window as unknown as { __pendingFrames: FrameRequestCallback[] }).__pendingFrames.splice(0);
      for (const callback of pending) callback(performance.now());
    });
    return heliosphereRender(page);
  };
  const click = (selector: string) => page.locator(selector).evaluate((element) => (element as HTMLElement).click());
  const select = (selector: string, value: string) => page.locator(selector).evaluate((element, selected) => {
    (element as HTMLSelectElement).value = selected;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  const visibility = (hidden: boolean) => page.evaluate((value) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  const baseline = await frame();
  await page.clock.runFor(900);
  await click('#play-toggle');
  await page.clock.runFor(100);
  const started = await frame();
  expect(started.phase - baseline.phase).toBeCloseTo(.1, 8);
  // Freeze after 100 ms, unfreeze 800 ms later, render after another 100 ms.
  await page.clock.runFor(100);
  await click('#reduced-motion');
  await page.clock.runFor(800);
  await click('#reduced-motion');
  await page.clock.runFor(100);
  const toggled = await frame();
  expect(toggled.phase - started.phase).toBeCloseTo(.2, 8);
  await click('#play-toggle');
  await frame();
  for (const speed of ['day', 'month', 'year', 'decade']) {
    await select('#speed-select', speed);
    await click('#play-toggle');
    const before = await frame();
    await page.clock.runFor(1000);
    const after = await frame();
    expect(after.phase - before.phase).toBeCloseTo(1, 8);
    expect(after.boundaryScale).toBeCloseTo(1 + .02 * Math.sin(after.phase * Math.PI / 10), 10);
    expect(after.shimmer).toBeCloseTo(.15 * (1 + .07 * Math.sin(after.phase * .8)), 10);
    // First visible flow particle moves radially at two scene units per second.
    const radius = (sample: HeliosphereRenderSample) => Math.hypot(sample.flow[0] ?? 0, (sample.flow[1] ?? 0) / .85, sample.flow[2] ?? 0);
    expect(radius(after) - radius(before)).toBeCloseTo(2, 5);
    await click('#play-toggle');
    await frame();
  }
  await click('#play-toggle');
  const beforeHidden = await frame();
  await visibility(true);
  await page.clock.runFor(60000); // no RAF throughout the hidden interval
  await visibility(false);
  await page.clock.runFor(10000); // visible return remains paused, still no RAF
  const returned = await frame();
  expect(returned).toEqual(beforeHidden);
  await click('#play-toggle');
  await page.clock.runFor(100);
  const resumed = await frame();
  expect(resumed.phase - returned.phase).toBeCloseTo(.1, 8);
  expect(resumed.simulationTimeMs - returned.simulationTimeMs).toBeCloseTo(3652.5 * 86400000 * .1, 0);
});

type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

// Camera tweens and OrbitControls damping keep moving after input ends, and
// slower CI renderers stretch that motion out, so wait for the marker to rest.
// Damping decays per rendered frame, so a wall-clock threshold can pass while a
// slow renderer is still pixels from rest; sample once per rendered frame instead.
// Settling takes a fixed number of frames, so the budget is frames, not seconds.
// The 0.02px step sits above WebKit's 1/64px layout snapping and leaves < 0.4px of travel.
async function settledBoundingBox(locator: Locator): Promise<Box> {
  return locator.evaluate((element) => new Promise<Box>((resolve, reject) => {
    const startedAt = performance.now();
    let frames = 0;
    let previous: DOMRect | null = null;
    let stillFrames = 0;
    let stillSince = 0;
    const sample = (now: number) => {
      frames += 1;
      const current = element.getBoundingClientRect();
      const visible = current.width > 0 || current.height > 0;
      const still = visible && previous !== null
        && Math.hypot(current.x - previous.x, current.y - previous.y) < 0.02;
      if (!still) stillSince = now;
      stillFrames = still ? stillFrames + 1 : 0;
      previous = current;
      // Tweens ease in, so their first fast frames can look still; also require wall time.
      if (stillFrames >= 5 && now - stillSince >= 300) {
        resolve({ x: current.x, y: current.y, width: current.width, height: current.height });
      } else if (frames > 1_000) {
        const seconds = (now - startedAt) / 1_000;
        reject(new Error(`Marker did not settle in ${frames} frames (${seconds.toFixed(1)}s)`));
      } else {
        requestAnimationFrame(sample);
      }
    };
    requestAnimationFrame(sample);
  }));
}

test('offers a still choice between the journey and free exploration', async ({ page }) => {
  await page.goto('./');

  await expect(page).toHaveTitle(/Solar System: Orbital Journey/);
  await expect(page.getByRole('heading', { name: 'Solar System: Orbital Journey' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begin Journey' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore Freely' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});

test('opens a validated shared view directly', async ({ page }) => {
  await page.goto('./?date=2042-03-14T12%3A30%3A00.000Z&view=space&body=saturn&camera=path');

  await expect(page.locator('#app')).toHaveAttribute('data-entered', 'true');
  await expect(page.getByRole('button', { name: 'Watch from Space' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Saturn' })).toBeVisible();
});

test('runs and skips the guided journey through visible controls', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Begin Journey' }).click();

  await expect(page.getByText('Chapter 1 of 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Meet the Solar System' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Chapter 2 of 5')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Skip journey' }).click();
  await expect(page.getByText('Chapter 2 of 5')).toBeHidden();
});

test('enters the guided Galaxy Overview chapter paused and allows continuing without playback', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Begin Journey' }).click();

  for (let chapter = 2; chapter <= 5; chapter += 1) {
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText(`Chapter ${chapter} of 5`)).toBeVisible();
  }

  await expect(page.getByRole('button', { name: 'Galaxy Overview' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('0 million years', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play Galactic Orbit' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Finish Journey' }).click();
  await expect(page.getByText('Chapter 5 of 5')).toBeHidden();
});

test('replays the guided journey with Galactic elapsed time reset to its defaults', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Begin Journey' }).click();

  for (let chapter = 2; chapter <= 5; chapter += 1) {
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await page.getByLabel('Speed').selectOption('25');
  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('42');
  await page.getByRole('button', { name: 'Finish Journey' }).click();

  await page.getByRole('button', { name: 'Replay Journey' }).click();
  await expect(page.getByText('Chapter 1 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'Galaxy Overview' }).click();
  await expect(page.getByText('0 million years', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Speed')).toHaveValue('5');
  await expect(page.getByRole('button', { name: 'Play Galactic Orbit' })).toHaveAttribute('aria-pressed', 'false');
});

test('supports keyboard playback and switching reference frames', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explore Freely' }).click();
  await page.locator('canvas').focus();
  await page.keyboard.press('Space');

  await expect(page.getByRole('button', { name: 'Pause simulation' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Watch from Space' }).click();
  await expect(page.getByText('Rolling local window · straight tangent approximation')).toBeVisible();
});

test('opens every reference frame and named camera bookmark', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explore Freely' }).click();

  for (const bookmark of [
    'Inner Planets',
    'Outer Planets',
    'Along the Path',
    'Above the Ecliptic',
    'Show Full Journey',
  ]) {
    await page.getByRole('button', { name: bookmark }).click();
    await expect(page.getByRole('button', { name: bookmark })).toHaveAttribute('aria-current', 'true');
  }

  await expect(page.getByRole('button', { name: 'Watch from Space' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Galaxy Overview' }).click();
  await expect(page.getByText('Schematic · not a star-by-star map')).toBeVisible();
  await page.getByRole('button', { name: 'Travel with Sun' }).click();
  await expect(page.getByText('Body ratios preserved · orbital distances proportional')).toBeVisible();
});

test('keeps the calculated planets accessible in the full journey overview', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explore Freely' }).click();
  await page.getByRole('button', { name: 'Show Full Journey' }).click();

  await expect(page.getByText('Solar System', { exact: true })).toBeVisible();
  const sunMarker = page.getByRole('button', { name: 'Select Sun' });
  const saturnMarker = page.getByRole('button', { name: 'Select Saturn' });
  await expect(saturnMarker).toBeVisible();

  await page.getByRole('button', { name: 'View options' }).click();
  await page.locator('#options-panel').getByLabel('Labels').uncheck();
  await expect(sunMarker).toHaveAttribute('data-label-mode', 'persistent');
  await expect(saturnMarker).toHaveAttribute('data-label-mode', 'hidden');
  await page.getByRole('button', { name: 'Close options' }).click();

  await saturnMarker.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Saturn' })).toBeVisible();

  await page.getByRole('button', { name: 'Focus Camera' }).click();
  await expect(page.getByRole('button', { name: 'Along the Path' })).toHaveAttribute('aria-current', 'true');
});

test('offers a camera reset in every view', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explore Freely' }).click();
  await page.getByRole('button', { name: 'Galaxy Overview' }).click();
  await page.getByRole('button', { name: 'View options' }).click();
  await expect(page.getByRole('button', { name: 'Reset View' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset View' }).click();
});

test('adapts the shared timeline to paused Galactic elapsed time controls', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explore Freely' }).click();
  await page.getByRole('button', { name: 'Galaxy Overview' }).click();

  await expect(page.getByText('Galactic elapsed time', { exact: true })).toBeVisible();
  await expect(page.getByText('0 million years', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play Galactic Orbit' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Speed').getByRole('option')).toHaveText([
    '1 million years/s',
    '5 million years/s',
    '10 million years/s',
    '25 million years/s',
  ]);
  await expect(page.getByLabel('Speed')).toHaveValue('5');

  await page.getByLabel('Speed').selectOption('25');
  await page.getByRole('button', { name: 'Play Galactic Orbit' }).click();
  await expect(page.getByRole('button', { name: 'Pause Galactic Orbit' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('42');

  await expect(page.getByText('42 million years', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume Galactic Orbit' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Return to Present' }).click();
  await expect(page.getByText('0 million years', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Speed')).toHaveValue('25');

  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('230');
  await expect(page.getByRole('heading', { name: 'Schematic orbit complete' })).toBeVisible();
  await expect(page.getByText('Approximately 230 million years elapsed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue Exploring' }).click();
  await expect(page.getByRole('heading', { name: 'Schematic orbit complete' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Galactic Orbit Complete' })).toBeDisabled();

  await page.getByRole('button', { name: 'Return to Present' }).click();
  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('230');
  await page.getByRole('button', { name: 'Replay from Present' }).click();
  await expect(page.getByRole('button', { name: 'Pause Galactic Orbit' })).toHaveAttribute('aria-pressed', 'true');
});

test('replays or dismisses Solar-System completion without starting the guided tour', async ({ page }) => {
  await page.goto('./?view=sun&camera=inner');
  const timeline = page.getByLabel('Simulated date across 165 years');

  await timeline.fill('10000');
  await expect(page.getByRole('heading', { name: 'Journey complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Replay from Today' }).click();
  // Replay starts playing at once, so slow runners may already be past step 0.
  await expect.poll(async () => Number(await timeline.inputValue())).toBeLessThan(1_000);
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Chapter 1 of 5')).toBeHidden();

  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await timeline.fill('10000');
  await page.getByRole('button', { name: 'Continue Exploring' }).click();
  await expect(page.getByRole('heading', { name: 'Journey complete' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Simulation Complete' })).toBeDisabled();
  await page.waitForTimeout(250);
  await expect(page.getByRole('heading', { name: 'Journey complete' })).toBeHidden();
});

test('preserves both clocks in session and restores Solar-System playback paused', async ({ page }) => {
  await page.goto('./?date=2042-03-14T12%3A30%3A00.000Z&view=space&camera=path');
  await page.getByLabel('Speed').selectOption('year');
  const solarDate = await page.locator('#current-date').textContent();

  await page.getByRole('button', { name: 'Galaxy Overview' }).click();
  await page.getByLabel('Speed').selectOption('10');
  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('80');
  await page.getByRole('button', { name: 'Resume Galactic Orbit' }).click();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Travel with Sun' }).click();

  await expect(page.locator('#current-date')).toHaveText(solarDate ?? '');
  await expect(page.getByLabel('Speed')).toHaveValue('year');
  await expect(page.getByRole('button', { name: 'Play simulation' })).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(300);
  await expect(page.locator('#current-date')).toHaveText(solarDate ?? '');

  await page.getByRole('button', { name: 'Galaxy Overview' }).click();
  const preservedGalacticTime = await page.getByLabel('Galactic elapsed time through one schematic orbit').inputValue();
  expect(Number(preservedGalacticTime)).toBeGreaterThan(80);
  await expect(page.getByLabel('Speed')).toHaveValue('10');
  await expect(page.getByRole('button', { name: 'Resume Galactic Orbit' })).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(300);
  await expect(page.getByLabel('Galactic elapsed time through one schematic orbit')).toHaveValue(preservedGalacticTime);
});

test('omits Galactic progress from sharing and resets it on reload', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explore Freely' }).click();
  await page.getByRole('button', { name: 'Galaxy Overview' }).click();
  await page.getByLabel('Speed').selectOption('25');
  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('80');
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Reduce motion').check();
  await page.getByRole('button', { name: 'Share this view' }).click();

  const sharedUrl = new URL(page.url());
  expect(sharedUrl.searchParams.has('galacticElapsedMillionYears')).toBe(false);
  expect(sharedUrl.searchParams.has('galacticSpeed')).toBe(false);
  const persistedValues = await page.evaluate(() => Object.values(window.localStorage));
  expect(persistedValues.join(' ')).not.toMatch(/galactic/i);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Galaxy Overview' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('0 million years', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Speed')).toHaveValue('5');
  await expect(page.getByRole('button', { name: 'Play Galactic Orbit' })).toHaveAttribute('aria-pressed', 'false');
});

test('explains Galactic orbit phase, direction, and completed progress semantically', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explore Freely' }).click();
  await page.getByRole('button', { name: 'Galaxy Overview' }).click();

  const status = page.getByRole('region', { name: 'Galactic orbit status' });
  const progress = status.getByRole('progressbar', { name: 'Completed schematic orbit' });
  const sunMarker = page.getByRole('button', { name: 'Select Sun' });
  const presentAnchor = await settledBoundingBox(sunMarker);
  await expect(status.getByText('At present-location anchor', { exact: true })).toBeVisible();
  await expect(status.getByText('Direction arrow follows the forward tangent.')).toBeVisible();
  await expect(status.getByText('Highlighted arc shows completed progress, not a physical trail.')).toBeVisible();
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  await expect(progress).toHaveAttribute('aria-valuetext', '0% of the schematic orbit completed');

  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('115');
  await expect(status.getByText('Schematic orbit in progress', { exact: true })).toBeVisible();
  await expect(progress).toHaveAttribute('aria-valuenow', '50');

  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('230');
  await expect(status.getByText('Present anchor reached after one complete orbit', { exact: true })).toBeVisible();
  await expect(progress).toHaveAttribute('aria-valuenow', '100');
  const completedAnchor = await settledBoundingBox(sunMarker);
  expect(Math.abs(completedAnchor.x - presentAnchor.x)).toBeLessThan(1);
  expect(Math.abs(completedAnchor.y - presentAnchor.y)).toBeLessThan(1);
});

test('moves the schematic Sun marker when Galactic elapsed time plays', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explore Freely' }).click();
  await page.getByRole('button', { name: 'Galaxy Overview' }).click();
  await page.getByLabel('Speed').selectOption('25');
  await page.waitForTimeout(900);

  const sunMarker = page.getByRole('button', { name: 'Select Sun' });
  const galacticCenter = page.getByText('Galactic center', { exact: true });
  const before = await sunMarker.boundingBox();
  const centerBefore = await galacticCenter.boundingBox();
  await page.getByRole('button', { name: 'Play Galactic Orbit' }).click();
  await page.waitForTimeout(650);
  await page.getByRole('button', { name: 'Pause Galactic Orbit' }).click();
  const after = await sunMarker.boundingBox();
  const centerAfter = await galacticCenter.boundingBox();

  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(centerBefore).not.toBeNull();
  expect(centerAfter).not.toBeNull();
  expect(Math.hypot((after?.x ?? 0) - (before?.x ?? 0), (after?.y ?? 0) - (before?.y ?? 0))).toBeGreaterThan(2);
  expect(Math.abs((centerAfter?.x ?? 0) - (centerBefore?.x ?? 0))).toBeLessThan(1);
  expect(Math.abs((centerAfter?.y ?? 0) - (centerBefore?.y ?? 0))).toBeLessThan(1);

  const canvas = await page.locator('canvas').boundingBox();
  expect(canvas).not.toBeNull();
  if (canvas) {
    await page.mouse.move(canvas.x + canvas.width * 0.42, canvas.y + canvas.height * 0.42);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * 0.52, canvas.y + canvas.height * 0.42, { steps: 6 });
    await page.mouse.up();
  }
  await page.waitForTimeout(350);
  const afterManualOrbit = await sunMarker.boundingBox();
  expect(afterManualOrbit).not.toBeNull();
  expect(Math.hypot(
    (afterManualOrbit?.x ?? 0) - (after?.x ?? 0),
    (afterManualOrbit?.y ?? 0) - (after?.y ?? 0),
  )).toBeGreaterThan(2);
});

test('keeps Galactic marker playback available while reduced motion freezes decoration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.getByRole('button', { name: 'Explore Freely' }).click();
  await page.getByRole('button', { name: 'Galaxy Overview' }).click();

  const status = page.getByRole('region', { name: 'Galactic orbit status' });
  await expect(status.getByText('Decorative corona motion frozen; marker movement remains user-controlled.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play Galactic Orbit' })).toHaveAttribute('aria-pressed', 'false');
  const sunMarker = page.getByRole('button', { name: 'Select Sun' });
  await page.waitForTimeout(900);
  const before = await sunMarker.boundingBox();
  await page.waitForTimeout(450);
  const whilePaused = await sunMarker.boundingBox();
  expect(before).not.toBeNull();
  expect(whilePaused).not.toBeNull();
  expect(Math.abs((whilePaused?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(1);
  expect(Math.abs((whilePaused?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(1);

  await page.getByRole('button', { name: 'Play Galactic Orbit' }).click();
  await page.waitForTimeout(650);
  await page.getByRole('button', { name: 'Pause Galactic Orbit' }).click();
  const after = await sunMarker.boundingBox();
  expect(Math.hypot((after?.x ?? 0) - (before?.x ?? 0), (after?.y ?? 0) - (before?.y ?? 0))).toBeGreaterThan(2);
});

test('keeps Galactic time and marker position accurate when visual quality is reduced', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explore Freely' }).click();
  await page.getByRole('button', { name: 'Galaxy Overview' }).click();
  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('58');
  await page.waitForTimeout(900);

  const sunMarker = page.getByRole('button', { name: 'Select Sun' });
  const before = await sunMarker.boundingBox();
  const progress = page.getByRole('progressbar', { name: 'Completed schematic orbit' });
  await expect(progress).toHaveAttribute('aria-valuenow', '25');

  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Visual quality').selectOption('low');
  await page.getByRole('button', { name: 'Close options' }).click();
  const after = await sunMarker.boundingBox();

  await expect(page.getByText('58 million years', { exact: true })).toBeVisible();
  await expect(progress).toHaveAttribute('aria-valuenow', '25');
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(1);
  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(1);
});

test('shows Galactic completion when playback reaches one orbit', async ({ page }) => {
  await page.goto('./?view=galaxy');
  await page.getByLabel('Speed').selectOption('25');
  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('229');
  await page.getByRole('button', { name: 'Resume Galactic Orbit' }).click();

  await expect(page.getByRole('heading', { name: 'Schematic orbit complete' })).toBeVisible();
  await expect(page.getByText('Approximately 230 million years elapsed', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Galactic Orbit Complete' })).toBeDisabled();
});

test('keeps the Sun anchored while Along the Path advances', async ({ page }) => {
  await page.goto('./?view=space&camera=path');
  const pathMotion = page.getByRole('region', { name: 'Along the Path motion' });
  await expect(pathMotion.getByText('Distance traveled')).toBeVisible();
  await expect(pathMotion.getByText('0 AU', { exact: true })).toBeVisible();
  await expect(pathMotion.getByText('Continuous coordinate guides')).toBeVisible();
  await page.getByLabel('Speed').selectOption('decade');
  await expect(pathMotion.getByText('Guide flow visually stabilized')).toBeVisible();
  await page.waitForTimeout(900);

  const sunMarker = page.getByRole('button', { name: 'Select Sun' });
  const before = await sunMarker.boundingBox();
  await page.getByRole('button', { name: 'Play simulation' }).click();
  await page.waitForTimeout(550);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  const after = await sunMarker.boundingBox();

  await expect(pathMotion.getByText('0 AU', { exact: true })).toBeHidden();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(1);
  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(1);

  await page.getByRole('button', { name: 'Explain this view' }).click();
  await expect(page.getByText(/only the apparent guide flow is capped/i)).toBeVisible();
});

test('keeps accurate Along the Path distance available with reduced motion', async ({ page }) => {
  await page.goto('./?view=space&camera=path');
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Reduce motion').check();

  const pathMotion = page.getByRole('region', { name: 'Along the Path motion' });
  await expect(pathMotion.getByText('Subdued stepped guide updates')).toBeVisible();
  await page.locator('#timeline-range').fill('10000');
  await expect(pathMotion.getByText('7,657 AU', { exact: true })).toBeVisible();
  await expect(pathMotion.getByText('0.121 light-years', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Show Full Journey' }).click();
  await expect(pathMotion).toBeHidden();
});

test('describes procedural solar presentation and honors reduced motion', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.goto('./?view=sun&camera=inner');

  const solarPresentation = page.getByRole('note', { name: 'Solar presentation' });
  await expect(solarPresentation).toContainText('Decorative solar motion active');

  await page.getByRole('button', { name: 'Explain this view' }).click();
  await expect(page.getByText(/procedural presentation effects, not modeled solar weather/i)).toBeVisible();
  await expect(page.getByText(/real presentation time, independently of simulation speed/i)).toBeVisible();
  await page.getByRole('button', { name: 'Close explanation' }).click();

  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Reduce motion').check();
  await expect(solarPresentation).toContainText('Decorative solar motion frozen for reduced motion');
  await page.waitForTimeout(250);

  expect(pageErrors).toEqual([]);
});

test('adapts procedural solar detail to the selected visual quality', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.goto('./?view=sun&camera=inner');

  const solarPresentation = page.getByRole('note', { name: 'Solar presentation' });
  await expect(solarPresentation).toContainText('Layered corona detail: full');

  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByLabel('Visual quality').selectOption('balanced');
  await expect(solarPresentation).toContainText('Layered corona detail: reduced');
  await page.getByLabel('Visual quality').selectOption('low');
  await expect(solarPresentation).toContainText('Layered corona detail: simplified');
  await page.waitForTimeout(250);

  expect(pageErrors).toEqual([]);
});

test('keeps solar presentation independent of both playback clocks', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.goto('./?view=sun&camera=inner');

  const solarPresentation = page.getByRole('note', { name: 'Solar presentation' });
  await expect(solarPresentation).toContainText('Driven by real presentation time; playback speed independent');

  for (const speed of ['day', 'month', 'year', 'decade']) {
    await page.getByLabel('Speed').selectOption(speed);
    await expect(page.getByLabel('Speed')).toHaveValue(speed);
    await expect(solarPresentation).toContainText('Decorative solar motion active');
  }

  await page.getByRole('button', { name: 'Play simulation' }).click();
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await expect(solarPresentation).toContainText('Decorative solar motion active');

  await page.getByRole('button', { name: 'Galaxy Overview' }).click();
  await page.getByLabel('Speed').selectOption('25');
  await expect(page.getByLabel('Speed')).toHaveValue('25');
  await page.getByRole('button', { name: 'Travel with Sun' }).click();
  await expect(solarPresentation).toContainText('Driven by real presentation time; playback speed independent');

  expect(pageErrors).toEqual([]);
});

test('toggles Planet follow from the selected planet card', async ({ page }) => {
  await page.goto('./?view=space&body=saturn&camera=path');

  const follow = page.getByRole('button', { name: 'Follow Planet' });
  await expect(follow).toHaveAttribute('aria-pressed', 'false');
  await follow.click();

  const stop = page.getByRole('button', { name: 'Stop Following Saturn' });
  await expect(stop).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: 'Camera is now following Saturn.' })).toBeVisible();

  await stop.click();
  await expect(page.getByRole('button', { name: 'Follow Planet' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('status').filter({ hasText: 'Stopped following Saturn.' })).toBeVisible();

  await page.waitForTimeout(50);
  const stoppedPosition = await page.getByRole('button', { name: 'Select Saturn' }).boundingBox();
  await page.waitForTimeout(350);
  const settledPosition = await page.getByRole('button', { name: 'Select Saturn' }).boundingBox();
  expect(stoppedPosition).not.toBeNull();
  expect(settledPosition).not.toBeNull();
  expect(Math.abs((settledPosition?.x ?? 0) - (stoppedPosition?.x ?? 0))).toBeLessThan(1);
  expect(Math.abs((settledPosition?.y ?? 0) - (stoppedPosition?.y ?? 0))).toBeLessThan(1);
});

test('moves from Full Journey to Along the Path before following a planet', async ({ page }) => {
  await page.goto('./?view=space&body=saturn&camera=full');

  await page.getByRole('button', { name: 'Follow Planet' }).click();

  await expect(page.getByRole('button', { name: 'Watch from Space' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Along the Path' })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('button', { name: 'Stop Following Saturn' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({
    hasText: 'Switched to the Along the Path camera to follow Saturn.',
  })).toBeVisible();

  await page.waitForTimeout(900);
  const canvas = await page.locator('canvas').boundingBox();
  const saturn = await page.getByRole('button', { name: 'Select Saturn' }).boundingBox();
  expect(canvas).not.toBeNull();
  expect(saturn).not.toBeNull();
  expect(Math.abs((saturn?.x ?? 0) + (saturn?.width ?? 0) / 2 - ((canvas?.x ?? 0) + (canvas?.width ?? 0) / 2))).toBeLessThan(3);
  expect(Math.abs((saturn?.y ?? 0) + (saturn?.height ?? 0) / 2 - ((canvas?.y ?? 0) + (canvas?.height ?? 0) / 2))).toBeLessThan(3);
});

test('does not include Planet follow in a shared URL', async ({ page }) => {
  await page.goto('./?view=space&body=saturn&camera=path');
  await page.getByRole('button', { name: 'Follow Planet' }).click();
  await expect(page.getByRole('button', { name: 'Stop Following Saturn' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Share this view' }).click();
  expect(new URL(page.url()).searchParams.has('follow')).toBe(false);
  await page.reload();

  await expect(page.getByRole('button', { name: 'Follow Planet' })).toHaveAttribute('aria-pressed', 'false');
});

test('clears unavailable planet cards in Galaxy Overview', async ({ page }) => {
  await page.goto('./?view=space&body=saturn&camera=path');
  await expect(page.getByRole('heading', { name: 'Saturn' })).toBeVisible();

  await page.getByRole('button', { name: 'Galaxy Overview' }).click();
  await expect(page.getByRole('heading', { name: 'Saturn' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Follow Planet' })).toBeHidden();

  await page.goto('./?view=galaxy&body=saturn&camera=full');
  await expect(page.getByRole('heading', { name: 'Saturn' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Follow Planet' })).toBeHidden();
});

test('ends Planet follow for card and camera changes', async ({ page }) => {
  await page.goto('./?view=space&body=saturn&camera=path');

  const followSaturn = async () => {
    await page.getByRole('button', { name: 'Follow Planet' }).click();
    await expect(page.getByRole('button', { name: 'Stop Following Saturn' })).toHaveAttribute('aria-pressed', 'true');
  };
  const expectSaturnStopped = async () => {
    await expect(page.getByRole('button', { name: 'Follow Planet' })).toHaveAttribute('aria-pressed', 'false');
  };

  await followSaturn();
  await page.getByRole('button', { name: 'Focus Camera' }).click();
  await expectSaturnStopped();

  await followSaturn();
  await page.getByRole('button', { name: 'View options' }).click();
  await page.getByRole('button', { name: 'Reset View' }).click();
  await expectSaturnStopped();
  await page.getByRole('button', { name: 'Close options' }).click();

  await followSaturn();
  await page.getByRole('button', { name: 'Outer Planets' }).click();
  await expectSaturnStopped();

  await followSaturn();
  await page.getByRole('button', { name: 'Watch from Space' }).click();
  await expectSaturnStopped();

  await followSaturn();
  await page.getByRole('button', { name: 'Close planet information' }).click();
  await expect(page.getByRole('heading', { name: 'Saturn' })).toBeHidden();

  await page.locator('[data-body="saturn"]').dispatchEvent('click');
  await followSaturn();
  await page.locator('[data-body="mars"]').dispatchEvent('click');
  await expect(page.getByRole('heading', { name: 'Mars' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Follow Planet' })).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: 'Follow Planet' }).click();
  await page.getByRole('button', { name: 'Return to opening screen' }).click();
  await page.getByRole('button', { name: 'Explore Freely' }).click();
  await expect(page.getByRole('heading', { name: 'Mars' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Follow Planet' })).toHaveAttribute('aria-pressed', 'false');
});

test('preserves Planet follow through camera gestures and time controls', async ({ page }) => {
  await page.goto('./?view=space&body=saturn&camera=path');
  await page.getByRole('button', { name: 'Follow Planet' }).click();

  const stop = page.getByRole('button', { name: 'Stop Following Saturn' });
  await expect(stop).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Play simulation' }).click();
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.getByLabel('Speed').selectOption('year');
  await page.getByLabel('Simulated date across 165 years').fill('5000');

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20);
    await page.mouse.up();
    await page.mouse.wheel(0, -120);
  }

  await expect(stop).toHaveAttribute('aria-pressed', 'true');
});

test('preserves the user panned camera offset while Planet follow advances', async ({ page }) => {
  await page.goto('./?view=space&body=saturn&camera=path');
  await page.getByRole('button', { name: 'Follow Planet' }).click();

  const saturn = page.getByRole('button', { name: 'Select Saturn' });
  const beforePan = await settledBoundingBox(saturn);
  const canvas = await page.locator('canvas').boundingBox();
  expect(canvas).not.toBeNull();
  if (canvas) {
    await page.mouse.move(canvas.x + canvas.width * 0.45, canvas.y + canvas.height * 0.45);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(canvas.x + canvas.width * 0.65, canvas.y + canvas.height * 0.55, { steps: 8 });
    await page.mouse.up({ button: 'right' });
  }
  const afterPan = await settledBoundingBox(saturn);
  expect(Math.hypot(afterPan.x - beforePan.x, afterPan.y - beforePan.y)).toBeGreaterThan(5);

  const dateSlider = page.getByLabel('Simulated date across 165 years');
  const dateBefore = await dateSlider.inputValue();
  await dateSlider.fill('5000');
  await expect(dateSlider).not.toHaveValue(dateBefore);
  const afterAdvance = await settledBoundingBox(saturn);
  expect(Math.hypot(afterAdvance.x - afterPan.x, afterAdvance.y - afterPan.y)).toBeLessThan(5);
  await expect(page.getByRole('button', { name: 'Stop Following Saturn' })).toHaveAttribute('aria-pressed', 'true');
});

test('ends Planet follow when the guided journey changes chapter', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Begin Journey' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.waitForTimeout(900);

  const saturn = page.getByRole('button', { name: 'Select Saturn' });
  await expect(saturn).toBeVisible();
  await saturn.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Follow Planet' }).click();
  await expect(page.getByRole('button', { name: 'Stop Following Saturn' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Chapter 3 of 5')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Follow Planet' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('status').filter({ hasText: 'Stopped following Saturn.' })).toBeVisible();
});

for (const [origin, bookmark] of [['sun', 'outer'], ['space', 'full'], ['space', 'path']] as const) {
  test(`explores Sun’s Gravity and restores ${origin}/${bookmark} context`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`./?view=${origin}&body=earth&camera=${bookmark}`);
    const earth = page.getByRole('button', { name: 'Select Earth', exact: true });
    const saturn = page.getByRole('button', { name: 'Select Saturn', exact: true });
    const preset = await settledBoundingBox(earth);
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('Missing canvas');
    await page.mouse.move(canvas.x + canvas.width * 0.3, canvas.y + canvas.height * 0.6);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * 0.3 + 65, canvas.y + canvas.height * 0.6 + 25, { steps: 8 });
    await page.mouse.up();
    const original = await settledBoundingBox(earth);
    const originalSaturn = await settledBoundingBox(saturn);
    expect(Math.hypot(original.x - preset.x, original.y - preset.y)).toBeGreaterThan(2);
    const originalDistance = await page.locator('#planet-distance').textContent();
    await page.getByRole('button', { name: 'View options', exact: true }).click();
    await page.getByLabel('Motion trails', { exact: true }).check();
    await page.getByLabel('Orbital-plane overlays', { exact: true }).check();
    await page.getByRole('button', { name: 'Close options', exact: true }).click();
    await page.getByRole('button', { name: 'Sun’s Gravity', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeFocused();
    await expect(page.locator('#gravity-disclosure')).toHaveText('Schematic — distances compressed; well depths and body sizes exaggerated.');
    await expect(page.getByRole('button', { name: 'Play simulation', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#planet-distance')).toHaveText(originalDistance ?? '');
    await expect(page.getByText('Actual distance from Sun', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share this view', exact: true })).toBeDisabled();
    const before = await settledBoundingBox(earth);
    await page.getByRole('button', { name: 'Close planet information', exact: true }).click();
    const earthName = earth.locator('.body-marker__name');
    const nameBox = await settledBoundingBox(earthName);
    expect(Math.hypot(nameBox.x + nameBox.width / 2 - before.x - before.width / 2, nameBox.y + nameBox.height / 2 - before.y - before.height / 2)).toBeGreaterThan(22);
    await earthName.click();
    await expect(page.getByRole('heading', { name: 'Earth', exact: true })).toBeVisible();
    await page.getByLabel('Simulated date across 165 years').fill('5000');
    const scrubbed = await settledBoundingBox(earth);
    expect(Math.hypot(before.x - scrubbed.x, before.y - scrubbed.y)).toBeGreaterThan(5);
    await page.getByLabel('Simulated date across 165 years').fill('0');
    const returned = await settledBoundingBox(earth);
    expect(Math.hypot(before.x - returned.x, before.y - returned.y)).toBeLessThan(1);
    await page.getByRole('button', { name: 'Follow Planet', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Stop Following Earth', exact: true })).toBeVisible();
    await settledBoundingBox(earth);
    await page.getByRole('button', { name: 'Stop Following Earth', exact: true }).click();
    await page.getByRole('button', { name: 'Focus Camera', exact: true }).click();
    const focused = await settledBoundingBox(earth);
    expect(Math.abs(focused.x + focused.width / 2 - canvas.x - canvas.width / 2)).toBeLessThan(2);
    expect(Math.abs(focused.y + focused.height / 2 - canvas.y - canvas.height / 2)).toBeLessThan(2);
    await page.getByRole('button', { name: 'View options', exact: true }).click();
    await expect(page.getByLabel('Motion trails', { exact: true })).toBeDisabled();
    await expect(page.getByLabel('Orbital-plane overlays', { exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Reset View', exact: true }).click();
    await page.getByRole('button', { name: 'Close options', exact: true }).click();
    const reset = await settledBoundingBox(earth);
    expect(Math.hypot(before.x - reset.x, before.y - reset.y)).toBeLessThan(1);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sun’s Gravity', exact: true })).toBeFocused();
    const restored = await settledBoundingBox(earth);
    expect(Math.hypot(original.x - restored.x, original.y - restored.y)).toBeLessThan(1);
    const restoredSaturn = await settledBoundingBox(saturn);
    expect(Math.hypot(originalSaturn.x - restoredSaturn.x, originalSaturn.y - restoredSaturn.y)).toBeLessThan(1);
    await expect(page.getByRole('button', { name: 'Share this view', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'View options', exact: true }).click();
    await expect(page.getByLabel('Motion trails', { exact: true })).toBeChecked();
    await expect(page.getByLabel('Orbital-plane overlays', { exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'Close options', exact: true }).click();
    for (let visit = 0; visit < 3; visit += 1) {
      await page.getByRole('button', { name: 'Sun’s Gravity', exact: true }).click();
      await page.getByRole('button', { name: 'Back', exact: true }).click();
    }
    await expect(page.getByRole('heading', { name: 'Earth', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Galaxy Overview', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sun’s Gravity', exact: true })).toBeHidden();
  });
}

test('Sun’s Gravity supports phone layout, quality tiers, explanation and shared playback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.getByRole('button', { name: 'Begin Journey', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sun’s Gravity', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Skip journey', exact: true }).click();
  await page.getByRole('button', { name: 'Sun’s Gravity', exact: true }).click();
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => {
      const status = await page.locator('#scene-status').boundingBox();
      const disclosure = await page.locator('#gravity-disclosure').boundingBox();
      if (!status || !disclosure) throw new Error('Missing schematic explanation');
      return disclosure.y - status.y - status.height;
    }).toBeGreaterThanOrEqual(4);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Explain this view', exact: true }).click();
  await expect(page.locator('#explain-copy')).toContainText('continue moving sideways');
  await expect(page.locator('#explain-copy')).toContainText('do not roll on a membrane');
  await page.locator('[data-close-panel="explain-panel"]').click();
  await page.getByRole('button', { name: 'View options', exact: true }).click();
  for (const quality of ['high', 'balanced', 'low']) {
    await page.getByLabel('Visual quality').selectOption(quality);
    await expect(page.getByLabel('Visual quality')).toHaveValue(quality);
  }
  await page.locator('#options-panel').getByLabel('Labels', { exact: true }).uncheck();
  await page.locator('#options-panel').getByLabel('Orbit paths', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Close options', exact: true }).click();
  await expect(page.locator('#gravity-disclosure')).toBeInViewport();
  await page.getByLabel('Speed', { exact: true }).selectOption('decade');
  await page.getByRole('button', { name: 'Play simulation', exact: true }).click();
  await page.getByLabel('Simulated date across 165 years').fill('1000');
  await expect(page.getByRole('button', { name: 'Pause simulation', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
  await page.getByLabel('Simulated date across 165 years').fill('10000');
  await expect(page.getByRole('heading', { name: 'Journey complete', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Replay from Today', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause simulation', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play simulation', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('supports touch entry and Back from both Sun’s Gravity origins', async ({ browser, browserName, baseURL }) => {
  test.skip(browserName === 'firefox', 'Playwright touch emulation is exercised in Chromium and WebKit.');
  if (!baseURL) throw new Error('A repository-base URL is required');
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(baseURL);
  await page.getByRole('button', { name: 'Explore Freely', exact: true }).tap();
  for (const origin of ['Travel with Sun', 'Watch from Space']) {
    await page.getByRole('button', { name: origin, exact: true }).tap();
    await page.getByRole('button', { name: 'Sun’s Gravity', exact: true }).tap();
    await expect(page.locator('#gravity-disclosure')).toBeInViewport();
    const earth = page.getByRole('button', { name: 'Select Earth', exact: true });
    const bodyBox = await settledBoundingBox(earth);
    const name = earth.locator('.body-marker__name');
    const nameBox = await settledBoundingBox(name);
    expect(Math.hypot(nameBox.x + nameBox.width / 2 - bodyBox.x - bodyBox.width / 2, nameBox.y + nameBox.height / 2 - bodyBox.y - bodyBox.height / 2)).toBeGreaterThan(22);
    await name.tap();
    await expect(page.getByRole('heading', { name: 'Earth', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close planet information', exact: true }).tap();
    await page.getByRole('button', { name: 'Back', exact: true }).tap();
    await expect(page.getByRole('button', { name: origin, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await context.close();
});


test('Sun’s Gravity restores multiple camera markers after entry during an active Focus transition', async ({ page }) => {
  await page.goto('./?view=sun&body=saturn&camera=outer');
  const saturn = page.getByRole('button', { name: 'Select Saturn', exact: true });
  const before = await settledBoundingBox(saturn);
  // Start Focus, then capture and enter on the first rendered frame that shows
  // motion, so slow renderers cannot finish the tween between steps.
  const captured = await page.evaluate((start) => new Promise<{ body: string; x: number; y: number }[]>((resolve) => {
    const focus = document.getElementById('focus-planet');
    const entry = document.getElementById('enter-gravity');
    if (!(focus instanceof HTMLButtonElement) || !(entry instanceof HTMLButtonElement)) throw new Error('Missing controls');
    focus.click();
    const sample = () => {
      const saturnBox = document.querySelector<HTMLElement>('[data-body="saturn"]')?.getBoundingClientRect();
      if (!saturnBox || Math.hypot(saturnBox.x - start.x, saturnBox.y - start.y) <= 3) {
        requestAnimationFrame(sample);
        return;
      }
      const markers = ['sun', 'earth', 'saturn'].map((body) => {
        const marker = document.querySelector<HTMLElement>(`[data-body="${body}"]`);
        if (!marker) throw new Error(`Missing ${body}`);
        const box = marker.getBoundingClientRect();
        return { body, x: box.x, y: box.y };
      });
      entry.click();
      resolve(markers);
    };
    requestAnimationFrame(sample);
  }), { x: before.x, y: before.y });
  const capturedSaturn = captured.find(({ body }) => body === 'saturn');
  const canvas = await page.locator('canvas').boundingBox();
  if (!capturedSaturn || !canvas) throw new Error('Missing camera measurement');
  expect(Math.hypot(capturedSaturn.x + 22 - canvas.x - canvas.width / 2, capturedSaturn.y + 22 - canvas.y - canvas.height / 2)).toBeGreaterThan(3);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  for (const original of captured) {
    const restored = await settledBoundingBox(page.locator(`[data-body="${original.body}"]`));
    expect(Math.hypot(original.x - restored.x, original.y - restored.y)).toBeLessThan(1);
  }
});

test('Sun’s Gravity stays absent from URL and stored preferences and reloads scientifically', async ({ page }) => {
  await page.goto('./?view=space&body=earth&camera=path&date=2042-03-14T12%3A30%3A00.000Z');
  const scientificUrl = page.url();
  await page.getByRole('button', { name: 'Sun’s Gravity', exact: true }).click();
  await page.getByLabel('Simulated date across 165 years').fill('4000');
  await page.getByRole('button', { name: 'Select Saturn', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'View options', exact: true }).click();
  await page.getByLabel('Visual quality').selectOption('low');
  expect(page.url()).toBe(scientificUrl);
  const saved = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])));
  expect(Object.keys(saved)).toEqual(['orbital-journey:preferences:v1']);
  expect(JSON.parse(saved['orbital-journey:preferences:v1'] ?? '{}')).toEqual({ reducedMotion: false, quality: 'low', labels: true, trails: false });
  await page.reload();
  await expect(page.locator('#app')).toHaveAttribute('data-gravity', 'false');
  await expect(page.getByRole('button', { name: 'Watch from Space', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Sun’s Gravity', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Earth', exact: true })).toBeVisible();
  expect(page.url()).toBe(scientificUrl);
});

test('Sun’s Gravity processes rapid entry/Back handoffs before rendering and captures each new session', async ({ page }) => {
  await page.goto('./?view=space&body=earth&camera=path');
  const earth = page.getByRole('button', { name: 'Select Earth', exact: true });
  const original = await settledBoundingBox(earth);
  const originalSaturn = await settledBoundingBox(page.locator('[data-body="saturn"]'));
  await page.evaluate(() => {
    const entry = document.getElementById('enter-gravity');
    const back = document.getElementById('leave-gravity');
    if (!(entry instanceof HTMLButtonElement) || !(back instanceof HTMLButtonElement)) throw new Error('Missing Gravity controls');
    entry.click();
    entry.click(); // Duplicate entry cannot replace the scientific context.
    back.click();
    entry.click(); // Back → enter captures the restored scientific pose synchronously.
  });
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeFocused();
  await settledBoundingBox(earth);
  await page.evaluate(() => {
    const entry = document.getElementById('enter-gravity');
    const back = document.getElementById('leave-gravity');
    if (!(entry instanceof HTMLButtonElement) || !(back instanceof HTMLButtonElement)) throw new Error('Missing Gravity controls');
    back.click();
    entry.click();
    back.click();
    back.click(); // Back without a session has no restoration effect.
  });
  await expect(page.getByRole('button', { name: 'Sun’s Gravity', exact: true })).toBeFocused();
  for (const [body, before] of [['earth', original], ['saturn', originalSaturn]] as const) {
    const after = await settledBoundingBox(page.locator(`[data-body="${body}"]`));
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(1);
  }
});

for (const [gesture, button] of [['rotation', 'left'], ['pan', 'right']] as const) {
  test(`Sun’s Gravity captures the visible camera during ${gesture} damping without carrying motion across Back`, async ({ page }) => {
    await page.goto('./?view=sun&body=earth&camera=outer');
    const earth = page.getByRole('button', { name: 'Select Earth', exact: true });
    await settledBoundingBox(earth);
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('Missing canvas');
    await page.mouse.move(canvas.x + canvas.width * 0.35, canvas.y + canvas.height * 0.55);
    await page.mouse.down({ button });
    await page.mouse.move(canvas.x + canvas.width * 0.35 + 85, canvas.y + canvas.height * 0.55 + 30, { steps: 3 });
    await page.mouse.up({ button });
    const captured = await page.evaluate(() => new Promise<{
      body: string; x: number; y: number; movement: number;
    }[]>((resolve) => {
      const sampleMarkers = () => ['earth', 'saturn'].map((body) => {
        const marker = document.querySelector<HTMLElement>(`[data-body="${body}"]`);
        if (!marker) throw new Error(`Missing ${body}`);
        const box = marker.getBoundingClientRect();
        return { body, x: box.x, y: box.y };
      });
      requestAnimationFrame(() => {
        const previous = sampleMarkers();
        requestAnimationFrame(() => {
          // Consecutive rendered frames prove released-drag momentum is still active at capture.
          const markers = sampleMarkers().map((marker, index) => ({
            ...marker,
            movement: Math.hypot(marker.x - previous[index].x, marker.y - previous[index].y),
          }));
          document.getElementById('enter-gravity')?.click();
          resolve(markers);
        });
      });
    }));
    for (const marker of captured) expect(marker.movement).toBeGreaterThan(0.1);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    for (const original of captured) {
      const restored = await settledBoundingBox(page.locator(`[data-body="${original.body}"]`));
      expect(Math.hypot(restored.x - original.x, restored.y - original.y)).toBeLessThan(1);
    }
  });
}

test('Sun’s Gravity discards on Home and journey actions without focusing its hidden entry button', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?view=space&body=earth&camera=outer');
  await page.getByRole('button', { name: 'Sun’s Gravity', exact: true }).click();
  await page.getByRole('button', { name: 'Return to opening screen', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-gravity', 'false');
  await expect(page.getByRole('button', { name: 'Begin Journey', exact: true })).toBeVisible();
  await expect(page.locator('#enter-gravity')).not.toBeFocused();
  await page.getByRole('button', { name: 'Explore Freely', exact: true }).click();
  const earth = page.getByRole('button', { name: 'Select Earth', exact: true });
  const fresh = await settledBoundingBox(earth);
  await page.getByRole('button', { name: 'Sun’s Gravity', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  const restored = await settledBoundingBox(earth);
  expect(Math.hypot(restored.x - fresh.x, restored.y - fresh.y)).toBeLessThan(1);
  // Invoke the existing journey controls in a single task to cover programmatic exits.
  for (const destination of ['begin-journey', 'replay-journey']) {
    await page.getByRole('button', { name: 'Sun’s Gravity', exact: true }).click();
    await page.evaluate((id) => document.getElementById(id)?.click(), destination);
    await expect(page.locator('#app')).toHaveAttribute('data-gravity', 'false');
    await expect(page.locator('#enter-gravity')).not.toBeFocused();
    await expect(page.getByText('Chapter 1 of 5')).toBeVisible();
    await page.getByRole('button', { name: 'Skip journey', exact: true }).click();
  }
});

async function orbitHeliosphereMouse(page: Page, button: 'left' | 'right' = 'left'): Promise<void> {
  await page.mouse.move(620, 530);
  await page.mouse.down({ button });
  await page.mouse.move(710, 570, { steps: 12 });
  await page.mouse.up({ button });
}

for (const frame of ['sun', 'space'] as const) {
  test(`Heliosphere restores ${frame} view, selection, arbitrary camera and explored timeline`, async ({ page }) => {
    await page.goto(`./?date=2042-03-14T12%3A30%3A00Z&view=${frame}&body=earth&camera=inner`);
    await orbitHeliosphereMouse(page);
    const earth = page.locator('[data-body="earth"]');
    const original = await settledBoundingBox(earth);
    const distance = await page.locator('#planet-distance').textContent();
    const speed = await page.locator('#planet-speed').textContent();
    await page.getByLabel('Speed', { exact: true }).selectOption('year');
    await page.getByRole('button', { name: 'Explore Heliosphere', exact: true }).click();
    await expect(page.locator('#leave-heliosphere')).toBeFocused();
    await expect(page.locator('#heliosphere-disclosure')).toHaveText('Schematic — distances compressed; body sizes exaggerated.');
    await expect(page.locator('#share-button')).toBeDisabled();
    await expect(page.locator('#share-button')).toHaveAccessibleDescription(/Back.*scientific/);
    await expect(page.getByRole('button', { name: 'Play simulation', exact: true })).toBeVisible();
    await expect(page.locator('#planet-distance')).toHaveText(distance ?? '');
    await expect(page.locator('#planet-speed')).toHaveText(speed ?? '');
    const mapped = await settledBoundingBox(earth);
    expect(Math.hypot(mapped.x - original.x, mapped.y - original.y)).toBeGreaterThan(1);
    await page.getByRole('button', { name: 'Play simulation', exact: true }).click();
    await page.getByRole('button', { name: 'Select Saturn', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Saturn', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause simulation', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
    const exploredDate = await page.locator('#current-date').textContent();
    await page.locator('#leave-heliosphere').click();
    await expect(page.getByRole('button', { name: 'Explore Heliosphere', exact: true })).toBeFocused();
    await expect(page.getByRole('heading', { name: 'Earth', exact: true })).toBeVisible();
    await expect(page.getByLabel('Speed', { exact: true })).toHaveValue('year');
    if (!exploredDate) throw new Error('Missing explored date');
    await expect(page.locator('#current-date')).toHaveText(exploredDate);
    await expect(page.locator('#share-button')).toBeEnabled();
  });
}

test('Heliosphere camera buttons, Focus, Follow, Escape and Reset remain explicit', async ({ page, browserName }) => {
  await page.goto('./?view=sun&body=earth&camera=inner');
  await page.locator('#enter-heliosphere').click();
  const earth = page.locator('[data-body="earth"]');
  const overview = await settledBoundingBox(earth);
  for (const name of ['Orbit left', 'Pan up', 'Zoom in']) {
    const button = page.getByRole('button', { name, exact: true });
    await button.focus();
    // Safari's native full-control navigation uses Option-Tab unless its Tab preference is enabled.
    // https://support.apple.com/guide/safari/cpsh003/mac
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
    await expect(button).toBeFocused();
    expect(await button.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    await page.keyboard.press('Enter');
  }
  const navigated = await settledBoundingBox(earth);
  expect(Math.hypot(navigated.x - overview.x, navigated.y - overview.y)).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Reset View', exact: true }).click();
  const reset = await settledBoundingBox(earth);
  expect(reset.x).toBeCloseTo(overview.x, 0);
  expect(reset.y).toBeCloseTo(overview.y, 0);
  await earth.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Focus Camera', exact: true }).click();
  const focused = await settledBoundingBox(earth);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Missing viewport');
  expect(focused.x + focused.width / 2).toBeCloseTo(viewport.width / 2, 0);
  expect(focused.y + focused.height / 2).toBeCloseTo(viewport.height / 2, 0);
  await expect(earth).toHaveAttribute('data-marker-visible', 'false');
  await page.locator('#follow-planet').click();
  await expect(page.locator('#follow-planet')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Orbit right', exact: true }).click();
  await expect(page.locator('#follow-planet')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#planet-card')).toBeHidden();
  await expect(page.locator('#follow-planet')).toHaveAttribute('aria-pressed', 'false');
});

test('Heliosphere rapid sessions restore the exact settled scientific pose and Home discards', async ({ page }) => {
  await page.goto('./?view=space&body=earth&camera=inner');
  const marker = page.locator('[data-body="earth"]');
  await orbitHeliosphereMouse(page);
  const original = await settledBoundingBox(marker);
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) {
      document.getElementById('enter-heliosphere')?.click();
      document.getElementById('leave-heliosphere')?.click();
    }
  });
  const restored = await settledBoundingBox(marker);
  expect(restored.x).toBeCloseTo(original.x, 0);
  expect(restored.y).toBeCloseTo(original.y, 0);
  await page.locator('#enter-heliosphere').click();
  await page.locator('#brand-home').click();
  await expect(page.locator('#app')).toHaveAttribute('data-entered', 'false');
  await page.getByRole('button', { name: 'Explore Freely', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-heliosphere', 'false');
  await page.locator('#enter-heliosphere').click();
  await page.locator('#leave-heliosphere').click();
  await expect(page.getByRole('button', { name: 'Travel with Sun', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('Heliosphere phone controls and disclosure are reachable with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?view=sun&body=earth&camera=inner');
  await page.locator('#enter-heliosphere').click();
  await expect(page.locator('#leave-heliosphere')).toBeInViewport();
  await expect(page.locator('#heliosphere-disclosure')).toBeInViewport();
  for (const name of ['Orbit left', 'Pan down', 'Zoom in']) {
    const button = page.getByRole('button', { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeInViewport();
    await button.click();
  }
  await page.getByRole('button', { name: 'Play simulation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause simulation', exact: true })).toBeVisible();
  await expect(page.locator('#solar-presentation-status')).toContainText('frozen');
  await page.locator('#leave-heliosphere').click();
  await expect(page.locator('#enter-heliosphere')).toBeFocused();
});

test('Heliosphere native Sources Escape preserves the underlying card and Follow', async ({ page }) => {
  await page.goto('./?view=sun&body=earth');
  await page.locator('#enter-heliosphere').click();
  await page.locator('#follow-planet').click();
  await page.getByRole('button', { name: 'Explain this view', exact: true }).click();
  await page.locator('#sources-open').click();
  await expect(page.locator('#sources-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#sources-dialog')).not.toBeVisible();
  await expect(page.locator('#planet-card')).toBeVisible();
  await expect(page.locator('#follow-planet')).toHaveAttribute('aria-pressed', 'true');
});

for (const frame of ['sun', 'space'] as const) test(`Heliosphere Focus from ${frame}/full centers an enlarged mapped planet`, async ({ page }) => {
  await page.goto(`./?view=${frame}&body=earth&camera=full`);
  await page.locator('#enter-heliosphere').click();
  const earth = page.locator('[data-body="earth"]');
  await settledBoundingBox(earth);
  await page.locator('#focus-planet').click();
  const focused = await settledBoundingBox(earth);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Missing viewport');
  expect(focused.x + focused.width / 2).toBeCloseTo(viewport.width / 2, 0);
  expect(focused.y + focused.height / 2).toBeCloseTo(viewport.height / 2, 0);
  await expect(earth).toHaveAttribute('data-marker-visible', 'false');
});

test('Heliosphere mouse orbit, secondary pan and wheel zoom move mapped markers', async ({ page }) => {
  await page.goto('./?view=sun');
  await page.locator('#enter-heliosphere').click();
  const marker = page.locator('[data-body="neptune"]');
  let before = await settledBoundingBox(marker);
  for (const input of ['orbit', 'pan', 'zoom']) {
    if (input === 'zoom') { await page.mouse.move(650, 530); await page.mouse.wheel(0, -180); }
    else await orbitHeliosphereMouse(page, input === 'pan' ? 'right' : 'left');
    const after = await settledBoundingBox(marker);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(1);
    before = after;
  }
});

test('Heliosphere real touch orbit, pinch and two-finger pan move mapped markers', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP supplies native multi-touch in Chromium; other engines retain mouse/button coverage.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?view=sun&body=earth');
  await page.locator('#enter-heliosphere').click();
  await page.locator('#follow-planet').click();
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  const marker = page.locator('[data-body="earth"]');
  const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number; y: number; id: number }[]) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  let before = await settledBoundingBox(marker);
  // Pan first so the followed Earth is offset from the orbit/zoom target;
  // its visible position then observes all three gestures without using an offscreen planet.
  for (const gesture of ['pan', 'orbit', 'pinch']) {
    const start = gesture === 'orbit' ? [{ x: 160, y: 300, id: 0 }] : [{ x: 120, y: 300, id: 0 }, { x: 230, y: 300, id: 1 }];
    for (const point of start) {
      expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, point)).toBe('CANVAS');
    }
    await touch('touchStart', start);
    for (let step = 1; step <= 6; step++) {
      await touch('touchMove', start.map((point, index) => ({ ...point, x: point.x + (gesture === 'pinch' ? (index === 0 ? -1 : 1) : 1) * step * 7, y: point.y + (gesture === 'pan' ? step * 5 : 0) })));
    }
    await touch('touchEnd', []);
    await expect(page.locator('#planet-name')).toHaveText('Earth');
    await expect(page.locator('#follow-planet')).toHaveText('Stop Following Earth');
    const after = await settledBoundingBox(marker);
    expect(Math.hypot(after.x - before.x, after.y - before.y), gesture).toBeGreaterThan(1);
    before = after;
  }
  await session.detach();
});

for (const [name, width, height] of [['desktop', 1280, 720], ['square', 900, 900], ['phone', 390, 844]] as const) test(`Heliosphere inspection artifact ${name}`, async ({ page, browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'One artifact per layout suffices for visual inspection.');
  await page.setViewportSize({ width, height });
  await page.goto('./?view=sun&body=earth');
  await page.locator('#enter-heliosphere').click();
  await settledBoundingBox(page.locator('[data-body="earth"]'));
  await captureHeliosphere(page, testInfo, name);
  await page.getByRole('button', { name: 'Close planet information', exact: true }).click();
  await captureHeliosphere(page, testInfo, `${name}-overview`);
});

test('Heliosphere exposes effective checkbox values and accurate freeze/share descriptions', async ({ page }) => {
  await page.goto('./?view=sun');
  await expect(page.locator('#gravity-share-reason')).toBeHidden();
  await page.locator('#options-button').click();
  await page.locator('[data-view-option="labels"]').uncheck();
  await page.locator('[data-view-option="orbitPaths"]').uncheck();
  await page.locator('#enter-heliosphere').click();
  await expect(page.locator('[data-view-option="labels"]')).toBeChecked();
  await expect(page.locator('[data-view-option="orbitPaths"]')).toBeChecked();
  await expect(page.locator('#solar-presentation-status')).toContainText('while paused');
  await expect(page.locator('#share-button')).toHaveAccessibleDescription(/Back/);
  await page.locator('#leave-heliosphere').click();
  await expect(page.locator('[data-view-option="labels"]')).not.toBeChecked();
  await expect(page.locator('[data-view-option="orbitPaths"]')).not.toBeChecked();
  await expect(page.locator('#gravity-share-reason')).toBeHidden();
});

const regionCases = [
  ['solar-wind', 'Solar wind', 'A flow of charged particles from the Sun surrounds all eight planets.', 568.71, 372.70],
  ['termination-shock', 'Termination shock', 'The boundary where the solar wind slows abruptly.', 476.71, 380.82],
  ['heliosheath', 'Heliosheath', 'The region of slowed solar wind between the termination shock and heliopause.', 439.94, 384.07],
  ['heliopause', 'Heliopause', 'The boundary where the solar-wind environment meets interstellar plasma.', 400.32, 387.56],
  ['interstellar-space', 'Interstellar space', "Space beyond the heliopause; the Solar System's distant objects extend farther.", 367.26, 390.48],
] as const;

test('Heliosphere physically picks five visible surfaces and exposes identical semantic selections', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('./?date=2042-03-14T12%3A30%3A00Z&view=sun&body=earth&camera=inner');
  await page.locator('#enter-heliosphere').click();
  await settledBoundingBox(page.locator('[data-body="earth"]'));
  await page.locator('[data-heliosphere-layer="labels"]').uncheck();
  // Coordinates come from projection of actual renderer-delivered cut-surface
  // geometry in orbital-scene.test.ts, with the same deterministic overview.
  for (const [, name, explanation, x, y] of regionCases) {
    await page.mouse.click(x, y);
    await expect(page.locator('#planet-name')).toHaveText(name);
    await expect(page.locator('#planet-identity')).toHaveText(explanation);
    await expect(page.locator('#planet-card')).toHaveCount(1);
  }
  await page.getByRole('button', { name: 'Play simulation', exact: true }).click();
  const before = await page.locator('[data-body="sun"]').evaluate((el) => ({ x: el.style.left, y: el.style.top }));
  for (const [region, name, explanation] of regionCases) {
    const button = page.locator(`[data-region="${region}"]`);
    await button.focus();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
    await expect(button).toBeFocused();
    expect(await button.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.locator('#planet-name')).toHaveText(name);
    await expect(page.locator('#planet-identity')).toHaveText(explanation);
    await expect(page.getByRole('button', { name: 'Pause simulation', exact: true })).toBeVisible();
  }
  expect(await page.locator('[data-body="sun"]').evaluate((el) => ({ x: el.style.left, y: el.style.top }))).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(page.locator('#planet-card')).toBeHidden();
});

test('Heliosphere hidden surfaces stay unpickable, buttons preserve layers, and fresh sessions reset independently', async ({ page }) => {
  await page.goto('./?view=sun&body=earth');
  await page.locator('#enter-heliosphere').click();
  await settledBoundingBox(page.locator('[data-body="earth"]'));
  await page.locator('[data-heliosphere-layer="labels"]').uncheck();
  await page.locator('[data-region="heliopause"]').click();
  await page.locator('[data-heliosphere-layer="outerHeliosphere"]').uncheck();
  await renderedFrames(page);
  await expect(page.locator('#planet-name')).toHaveText('Heliopause');
  await expect(page.locator('#planet-card')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#planet-card')).toBeHidden();
  await page.mouse.click(400.32, 387.56);
  // The visible shock shell underneath may legitimately win; the hidden
  // heliopause cannot be returned by the common resolver.
  await expect.poll(async () => await page.locator('#planet-card').isVisible()
    ? await page.locator('#planet-name').textContent() : null).not.toBe('Heliopause');
  await page.locator('[data-region="heliopause"]').click();
  await expect(page.locator('#planet-name')).toHaveText('Heliopause');
  await expect(page.locator('[data-heliosphere-layer="outerHeliosphere"]')).not.toBeChecked();
  await expect(page.locator('[data-heliosphere-layer="terminationShock"]')).toBeChecked();
  await expect(page.locator('[data-heliosphere-layer="orbitPaths"]')).toBeChecked();
  await page.locator('[data-heliosphere-layer="terminationShock"]').uncheck();
  await renderedFrames(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#planet-card')).toBeHidden();
  await page.mouse.click(476.71, 380.82);
  await expect(page.locator('#planet-card')).toBeHidden();
  await page.locator('[data-region="termination-shock"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#planet-name')).toHaveText('Termination shock');
  await page.locator('#leave-heliosphere').click();
  await expect(page.locator('#planet-name')).toHaveText('Earth');
  await page.locator('#enter-heliosphere').click();
  for (const layer of ['outerHeliosphere', 'terminationShock', 'orbitPaths', 'labels']) {
    await expect(page.locator(`[data-heliosphere-layer="${layer}"]`)).toBeChecked();
  }
});

test('Heliosphere phone sheet collapses and scrolls while Pause and camera navigation remain reachable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?view=sun');
  await page.locator('#enter-heliosphere').click();
  const summary = page.locator('#heliosphere-sheet > summary');
  await summary.click();
  await expect(page.locator('#heliosphere-sheet')).not.toHaveAttribute('open');
  await expect(page.locator('[data-region="solar-wind"]')).toBeHidden();
  await captureHeliosphere(page, testInfo, 'phone-collapsed');
  await page.getByRole('button', { name: 'Play simulation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause simulation', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Orbit left', exact: true }).click();
  await summary.click();
  for (const [region, name] of regionCases) {
    await page.locator(`[data-region="${region}"]`).click();
    await expect(page.locator('#planet-name')).toHaveText(name);
  }
  await page.locator('[data-heliosphere-layer="labels"]').uncheck();
  await expect(page.locator('[data-region="solar-wind"]')).toBeEnabled();
  await captureHeliosphere(page, testInfo, 'phone-sheet-open');
});

test('Heliosphere region replacement ends Follow without pausing or moving the camera', async ({ page }) => {
  await page.goto('./?view=sun&body=earth');
  await page.locator('#enter-heliosphere').click();
  await page.locator('#follow-planet').click();
  await expect(page.locator('#follow-planet')).toHaveText('Stop Following Earth');
  const before = await settledBoundingBox(page.locator('[data-body="earth"]'));
  await page.locator('[data-region="solar-wind"]').click();
  await expect(page.locator('#planet-name')).toHaveText('Solar wind');
  const after = await settledBoundingBox(page.locator('[data-body="earth"]'));
  expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(.5);
  await page.getByRole('button', { name: 'Select Earth', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#follow-planet')).toHaveText('Follow Planet');
});

test('Heliosphere reactivation restores its card and close focus while labels-off planets remain keyboard accessible', async ({ page }) => {
  await page.goto('./?view=sun&body=earth');
  await page.locator('#enter-heliosphere').click();
  await settledBoundingBox(page.locator('[data-body="earth"]'));
  await page.locator('[data-heliosphere-layer="labels"]').uncheck();
  for (const planet of ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']) {
    const button = page.getByRole('button', { name: `Select ${planet}`, exact: true });
    await button.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#planet-name')).toHaveText(planet);
  }
  await expect(page.locator('#heliosphere-regions button')).toHaveCount(5);
  await page.mouse.click(568.71, 372.70);
  await expect(page.locator('#planet-name')).toHaveText('Solar wind');
  await page.locator('#heliosphere-sheet > summary').click();
  await page.mouse.click(568.71, 372.70);
  await expect(page.locator('#heliosphere-sheet')).toHaveAttribute('open');
  await expect(page.locator('#planet-name')).toBeInViewport();
  await page.locator('#close-planet').click();
  await expect(page.locator('[data-region="solar-wind"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.locator('#close-planet').focus(); await page.keyboard.press('Escape');
  await expect(page.locator('[data-region="solar-wind"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.locator('[data-heliosphere-layer="labels"]').focus(); await page.keyboard.press('Escape');
  await expect(page.locator('[data-heliosphere-layer="labels"]')).toBeFocused();
});

test('Heliosphere effective layers preserve storage allowlists and restore usable scientific panels', async ({ page }) => {
  await page.goto('./?view=sun&body=earth');
  await page.locator('#enter-heliosphere').click();
  await page.locator('[data-region="heliopause"]').click();
  for (const layer of ['labels', 'orbitPaths', 'outerHeliosphere']) await page.locator(`[data-heliosphere-layer="${layer}"]`).uncheck();
  await page.locator('#options-button').click();
  await expect(page.locator('[data-view-option="labels"]')).not.toBeChecked();
  await expect(page.locator('[data-view-option="orbitPaths"]')).not.toBeChecked();
  await page.locator('#quality-select').selectOption('balanced');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('orbital-journey:preferences:v1') ?? '{}'));
  expect(Object.keys(stored).sort()).toEqual(['labels', 'quality', 'reducedMotion', 'trails']);
  expect(stored.labels).toBe(true);
  expect(page.url()).not.toMatch(/heliopause|heliosphere|outerHeliosphere|layers/);
  await page.locator('#leave-heliosphere').click();
  await expect(page.locator('#planet-name')).toHaveText('Earth');
  await page.locator('[data-view-option="labels"]').uncheck();
  await page.getByRole('button', { name: 'Close options', exact: true }).click();
  await page.locator('#explain-button').click();
  await page.locator('#sources-open').click(); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Close explanation', exact: true }).click();
  await page.locator('#share-button').click();
  const params = new URL(page.url()).searchParams;
  expect([...params.keys()].sort()).toEqual(['body', 'camera', 'date', 'view']);
  expect(params.get('body')).toBe('earth');
});

test('Heliosphere navigation releases retain card and Follow and labels-on overlap selects a planet at another pose', async ({ page }) => {
  await page.goto('./?view=sun&body=earth');
  await page.locator('#enter-heliosphere').click();
  await page.locator('#follow-planet').click();
  await settledBoundingBox(page.locator('[data-body="earth"]'));
  for (const button of ['left', 'right'] as const) {
    await page.mouse.move(600, 450); await page.mouse.down({ button });
    await page.mouse.move(650, 480, { steps: 8 }); await page.mouse.up({ button });
    await expect(page.locator('#planet-name')).toHaveText('Earth');
    await expect(page.locator('#follow-planet')).toHaveText('Stop Following Earth');
  }
  await page.mouse.click(500, 450, { button: 'right' });
  await expect(page.locator('#follow-planet')).toHaveText('Stop Following Earth');
  await page.locator('#heliosphere-reset-camera').click();
  await page.getByRole('button', { name: 'Orbit left', exact: true }).click();
  const earth = await settledBoundingBox(page.locator('[data-body="earth"]'));
  await page.mouse.click(earth.x + earth.width / 2, earth.y + earth.height / 2);
  await expect(page.locator('#planet-name')).toHaveText('Earth');
  await expect(page.locator('#planet-card')).toHaveCount(1);
});

test('Heliosphere short phone sheet preserves camera and Pause pointer access', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('./?view=sun');
  await page.locator('#enter-heliosphere').click();
  await page.locator('[data-region="heliopause"]').click();
  await page.getByRole('button', { name: 'Orbit left', exact: true }).click();
  await page.getByRole('button', { name: 'Play simulation', exact: true }).click();
  await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
  await captureHeliosphere(page, testInfo, 'short-phone-open');
});

test.describe('Heliosphere native touch controls', () => {
  test.use({ hasTouch: true });
  test.skip(({ browserName }) => browserName === 'firefox', 'Native touch emulation is supported in Chromium/WebKit; physical hardware remains unverified.');
  test('activates region, layer and sheet controls with touch', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./?view=sun');
    await page.locator('#enter-heliosphere').tap();
    await page.locator('[data-region="heliopause"]').tap();
    await expect(page.locator('#planet-name')).toHaveText('Heliopause');
    await page.locator('[data-heliosphere-layer="labels"]').tap();
    await expect(page.locator('[data-heliosphere-layer="labels"]')).not.toBeChecked();
    await page.locator('#heliosphere-sheet > summary').tap();
    await expect(page.locator('#heliosphere-sheet')).not.toHaveAttribute('open');
    await page.locator('#heliosphere-sheet > summary').tap();
    await expect(page.locator('#heliosphere-sheet')).toHaveAttribute('open');
  });
});

test('automatic poor-frame adaptation reaches actual renderer and retains phase mapping and semantic region access', async ({ page }) => {
  await observeHeliosphereRender(page);
  await page.route('**/src/rendering/adaptive-quality-monitor.ts*', async (route) => {
    const response = await route.fetch();
    // Supply controlled poor frame times to the original monitor policy; real
    // scene callback, main dispatch and quality renderer remain in the path.
    await route.fulfill({ response, body: `${await response.text()}
const sampleOriginal = AdaptiveQualityMonitor.prototype.sample;
let sampledAt = performance.now();
AdaptiveQualityMonitor.prototype.sample = function(preference, now) {
  return sampleOriginal.call(this, preference, window.__slowFrames ? (sampledAt += 30) : now);
};` });
  });
  await page.goto('./?view=sun&body=earth');
  await page.locator('#enter-heliosphere').click();
  await page.locator('#play-toggle').click();
  await expect.poll(async () => (await heliosphereRender(page)).phase).toBeGreaterThan(.2);
  await page.locator('#play-toggle').click();
  await renderedFrames(page);
  const before = await heliosphereRender(page);
  expect(before.phase).toBeGreaterThan(.2);
  await page.evaluate(() => { (window as unknown as { __slowFrames: boolean }).__slowFrames = true; });
  await expect(page.locator('#quality-select')).toHaveValue('balanced', { timeout: 20000 });
  await expect.poll(async () => (await heliosphereSky(page)).starCount).toBe(550);
  const after = await heliosphereRender(page);
  expect(after.positions).toEqual(before.positions);
  expect(after.phase).toBe(before.phase);
  expect(after.boundaryScale).toBe(before.boundaryScale);
  await expect(page.locator('#heliosphere-regions button')).toHaveCount(5);
  for (const button of await page.locator('#heliosphere-regions button').all()) {
    await button.click();
    await expect(page.locator('#planet-name')).toHaveText(await button.textContent() ?? '');
  }
});
