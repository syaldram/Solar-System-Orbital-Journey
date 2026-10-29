import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

test('built repository-subpath Heliosphere renders and preserves entry controls playback and Back', async ({ page }, testInfo) => {
  // npm run check builds dist before the browser gate. Fulfill the existing
  // browser origin directly from those bytes: no Vite modules or test hooks.
  const base = '/Solar-System-Orbital-Journey/';
  const dist = new URL('../dist/', import.meta.url);
  const errors: string[] = [];
  const served: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:4173' || !url.pathname.startsWith(base)) {
      errors.push(`Unexpected runtime resource: ${url.href}`);
      await route.abort();
      return;
    }
    const relative = url.pathname.slice(base.length) || 'index.html';
    const file = new URL(relative, dist);
    if (!file.href.startsWith(dist.href)) throw new Error('Resource outside dist');
    const type = relative.endsWith('.html') ? 'text/html' : relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : 'image/jpeg';
    try {
      const body = await readFile(fileURLToPath(file));
      served.push(relative);
      await route.fulfill({ body, contentType: type });
    } catch (error) {
      errors.push(`Built resource unavailable: ${relative}: ${String(error)}`);
      await route.abort();
    }
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('./?view=sun');
  await expect(page.locator('script[type="module"]')).toHaveAttribute('src', /^\/Solar-System-Orbital-Journey\/assets\/[^/]+\.js$/);
  await page.locator('#enter-heliosphere').click();
  await expect(page.locator('#app')).toHaveAttribute('data-heliosphere', 'true');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('[data-body="earth"]')).toBeVisible();
  await expect(page.locator('#hero')).toHaveCSS('opacity', '0');
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const overviewPath = testInfo.outputPath(`built-heliosphere-band-overview-${testInfo.project.name}.png`);
  await page.screenshot({ path: overviewPath });
  await testInfo.attach('built-heliosphere-band-overview', { path: overviewPath, contentType: 'image/png' });
  for (const [id, title] of [['solar-wind', 'Solar wind'], ['termination-shock', 'Termination shock'], ['heliosheath', 'Heliosheath'], ['heliopause', 'Heliopause'], ['interstellar-space', 'Interstellar space']]) {
    await page.locator(`[data-region="${id}"]`).click();
    await expect(page.locator('#planet-name')).toHaveText(title);
  }
  await page.locator('[data-heliosphere-layer="outerHeliosphere"]').uncheck();
  await page.locator('[data-region="heliopause"]').click();
  await expect(page.locator('#planet-name')).toHaveText('Heliopause');
  await expect(page.locator('[data-heliosphere-layer="outerHeliosphere"]')).not.toBeChecked();
  await page.locator('[data-heliosphere-layer="outerHeliosphere"]').check();
  await page.locator('[data-heliosphere-layer="labels"]').uncheck();
  await expect(page.locator('#heliosphere-regions button')).toHaveCount(5);
  await page.getByLabel('Speed', { exact: true }).selectOption('year');
  const date = await page.locator('#current-date').textContent();
  await page.locator('#play-toggle').click();
  await expect.poll(() => page.locator('#current-date').textContent()).not.toBe(date);
  await page.locator('#play-toggle').click();
  await page.getByRole('button', { name: 'Explain this view' }).click();
  await expect(page.getByText(/The faint Milky Way band and distant stars are decorative artwork/)).toBeVisible();
  const disclosurePath = testInfo.outputPath(`built-heliosphere-semantic-disclosure-${testInfo.project.name}.png`);
  await page.screenshot({ path: disclosurePath });
  await testInfo.attach('built-heliosphere-semantic-disclosure', { path: disclosurePath, contentType: 'image/png' });
  await page.getByRole('button', { name: 'Close explanation', exact: true }).click();
  await page.locator('#leave-heliosphere').click();
  await expect(page.locator('#app')).toHaveAttribute('data-heliosphere', 'false');
  await expect(page.locator('#enter-heliosphere')).toBeFocused();
  expect(served).toContain('index.html');
  expect(served.some((path) => /^assets\/[^/]+\.js$/.test(path))).toBe(true);
  expect(served).toContain('assets/textures/earth.jpg');
  expect(served.some((path) => path.startsWith('src/') || path.includes('@vite'))).toBe(false);
  expect(errors).toEqual([]);
});
