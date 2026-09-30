import { expect, test } from '@playwright/test';

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

  await page.getByRole('button', { name: 'Return to Present' }).click();
  await page.getByLabel('Galactic elapsed time through one schematic orbit').fill('230');
  await page.getByRole('button', { name: 'Replay from Present' }).click();
  await expect(page.getByRole('button', { name: 'Pause Galactic Orbit' })).toHaveAttribute('aria-pressed', 'true');
});

test('moves the schematic Sun marker when Galactic elapsed time plays', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explore Freely' }).click();
  await page.getByRole('button', { name: 'Galaxy Overview' }).click();
  await page.getByLabel('Speed').selectOption('25');
  await page.waitForTimeout(900);

  const sunMarker = page.getByRole('button', { name: 'Select Sun' });
  const before = await sunMarker.boundingBox();
  await page.getByRole('button', { name: 'Play Galactic Orbit' }).click();
  await page.waitForTimeout(650);
  await page.getByRole('button', { name: 'Pause Galactic Orbit' }).click();
  const after = await sunMarker.boundingBox();

  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.hypot((after?.x ?? 0) - (before?.x ?? 0), (after?.y ?? 0) - (before?.y ?? 0))).toBeGreaterThan(2);
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
