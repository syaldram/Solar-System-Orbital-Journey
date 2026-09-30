import { expect, test, type Locator } from '@playwright/test';

type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

// Camera tweens and OrbitControls damping keep moving after input ends, and
// slower CI renderers stretch that motion out, so wait for the marker to rest.
async function settledBoundingBox(locator: Locator): Promise<Box> {
  let previous: Box | null = null;
  let stableSamples = 0;
  await expect.poll(async () => {
    const current = await locator.boundingBox();
    const moved = !current || !previous
      || Math.hypot(current.x - previous.x, current.y - previous.y) >= 0.25;
    stableSamples = moved ? 0 : stableSamples + 1;
    previous = current;
    return stableSamples;
  }, { timeout: 15_000, intervals: [150] }).toBeGreaterThanOrEqual(3);
  if (!previous) throw new Error('Marker has no bounding box');
  return previous;
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
  await page.getByLabel('Labels').uncheck();
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
  await expect(timeline).toHaveValue('0');
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
