import { expect, test } from '@playwright/test';
import baseline from '../_bmad-output/implementation-artifacts/story-1-6-science-baseline.json' with { type: 'json' };
import { PLANET_IDS, getPlanetProfile } from '../src/astronomy/planet-data';

for (const stored of ['null', '[]', '1', '"low"', '{bad', '{"quality":"ultra","labels":null,"privateId":"secret"}']) {
  test(`stored external preferences recover useful startup: ${stored}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((value) => localStorage.setItem('orbital-journey:preferences:v1', value), stored);
    await page.goto('./');
    await page.getByRole('button', { name: 'Explore Freely' }).click();
    await page.locator('#enter-heliosphere').click();
    await expect(page.locator('#heliosphere-regions button')).toHaveCount(5);
    expect(errors).toEqual([]);
  });
}

test('forced WebGL construction failure retains lesson, browser requirements and working sources', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith('webgl')) throw new Error('Forced WebGL construction failure');
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto('./');
  const fallback = page.locator('#webgl-fallback');
  await expect(fallback).toBeVisible();
  await expect(fallback).toContainText('planets orbit the Sun locally');
  await expect(fallback).toContainText('Chrome, Edge, Firefox, or Safari');
  await fallback.getByRole('button', { name: 'Sources & Credits' }).click();
  await expect(page.locator('#sources-dialog')).toBeVisible();
  await expect(page.locator('#sources-dialog a').first()).toHaveAttribute('href', /^https:/);
  await page.screenshot({ path: info.outputPath('webgl-fallback-sources.png') });
  expect(errors).toEqual([]);
});

for (const sample of baseline.samples) for (const frame of ['sun', 'space']) {
  test(`frozen actual rounded physical cards: ${sample.label} from ${frame}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.clock.setFixedTime(new Date(baseline.anchorUtc));
    await page.goto(`./?view=${frame}&date=${encodeURIComponent(sample.instantUtc)}&body=earth`);
    await page.locator('#enter-heliosphere').click();
    const instantMs = Date.parse(sample.instantUtc);
    const anchorMs = Date.parse(baseline.anchorUtc);
    const endMs = anchorMs + baseline.spanJulianYears * 365.25 * 86400000;
    await expect(page.locator('#current-date')).toHaveText(new Intl.DateTimeFormat('en', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
    }).format(instantMs));
    await expect(page.locator('#timeline-range')).toHaveAttribute('data-start', String(anchorMs));
    await expect(page.locator('#timeline-range')).toHaveAttribute('data-end', String(endMs));
    await expect(page.locator('#timeline-range')).toHaveValue(String(Math.round((instantMs - anchorMs) / (endMs - anchorMs) * 10000)));
    let index = 0;
    for (const quality of ['high', 'balanced', 'low']) {
      await page.getByRole('button', { name: 'View options' }).click();
      await page.getByLabel('Visual quality').selectOption(quality);
      await page.getByRole('button', { name: 'Close options' }).click();
      for (const speed of ['day', 'month', 'year', 'decade']) {
        await page.getByLabel('Speed', { exact: true }).selectOption(speed);
        const id = PLANET_IDS[index++ % PLANET_IDS.length];
        if (!id) throw new Error('Missing fixture planet');
        const profile = getPlanetProfile(id);
        // Semantic marker activation reaches real selection and main card wiring.
        await page.getByRole('button', { name: `Select ${profile.name}`, exact: true }).evaluate((element) => (element as HTMLElement).click());
        const expected = sample.planets[id];
        const r = Math.hypot(expected.positionAu.x, expected.positionAu.y, expected.positionAu.z);
        const format = (value: number, digits: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
        await expect(page.locator('#planet-distance')).toHaveText(`${format(r, r < 2 ? 3 : 2)} AU`);
        await expect(page.locator('#planet-speed')).toHaveText(`${format(expected.speedKmPerSecond, 1)} km/s`);
        await expect(page.locator('#planet-period')).toHaveText(profile.siderealOrbitYears < 1 ? `${format(profile.siderealOrbitYears * 365.25, 1)} days` : `${format(profile.siderealOrbitYears, 2)} years`);
        await expect(page.locator('#play-toggle')).toHaveAttribute('aria-pressed', 'false');
      }
    }
  });
}

test('nonzero Galactic progress survives Heliosphere entry, playback and Back', async ({ page }) => {
  await page.goto('./?view=galaxy');
  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('42');
  await page.getByLabel('Speed', { exact: true }).selectOption('25');
  await page.getByRole('button', { name: 'Travel with Sun', exact: true }).click();
  await page.locator('#enter-heliosphere').click();
  const dateBeforePlay = await page.locator('#current-date').textContent();
  await page.locator('#play-toggle').click();
  await expect.poll(() => page.locator('#current-date').textContent()).not.toBe(dateBeforePlay);
  await expect(page.locator('#play-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#leave-heliosphere').click();
  await page.getByRole('button', { name: 'Galaxy Overview', exact: true }).click();
  await expect(page.getByText('42 million years', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Speed', { exact: true })).toHaveValue('25');
  await expect(page.locator('#play-toggle')).toHaveAttribute('aria-pressed', 'false');
});

test('full five-chapter journey exposes intended speeds, completes and replays without uncaught errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('./');
  await page.getByRole('button', { name: 'Begin Journey' }).click();
  const speeds = ['month', 'year', 'month', 'year', '5'];
  const titles = ['Meet the Solar System', 'Set Time in Motion', 'Change Your Point of View', 'The Sun Is Moving Too', 'Our Place in the Milky Way'];
  for (let index = 0; index < 5; index++) {
    await expect(page.getByRole('heading', { name: titles[index], exact: true })).toBeVisible();
    await expect(page.getByLabel('Speed', { exact: true })).toHaveValue(speeds[index]);
    await page.getByRole('button', { name: index === 4 ? 'Finish Journey' : 'Continue', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Replay Journey' }).click();
  await expect(page.getByText('Chapter 1 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'Skip journey' }).click();
  await expect(page.getByText('Chapter 1 of 5')).toBeHidden();
  expect(errors).toEqual([]);
});

test('valid allowlisted preferences preserve explicit motion override and omit unknown fields on normal write', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('orbital-journey:preferences:v1', JSON.stringify({
    reducedMotion: false, quality: 'low', labels: false, trails: true,
    privateId: 'secret', presentation: 'heliosphere', phaseSeconds: 9, cameraReturn: [1, 2, 3],
  })));
  await page.goto('./?view=sun');
  await page.getByRole('button', { name: 'View options' }).click();
  await expect(page.getByLabel('Reduce motion')).not.toBeChecked();
  await expect(page.getByLabel('Visual quality')).toHaveValue('low');
  await expect(page.locator('#options-panel').getByLabel('Labels', { exact: true })).not.toBeChecked();
  await expect(page.locator('#options-panel').getByLabel('Motion trails', { exact: true })).toBeChecked();
  await page.getByLabel('Visual quality').selectOption('balanced');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('orbital-journey:preferences:v1') ?? '{}'));
  expect(stored).toEqual({ reducedMotion: false, quality: 'balanced', labels: false, trails: true });
  expect(errors).toEqual([]);
});
