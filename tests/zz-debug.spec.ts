import { expect, test } from '@playwright/test';

test('debug drift', async ({ page }) => {
  test.setTimeout(120_000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.RATE ?? 6) });
  await page.goto('./?view=sun&body=earth&camera=outer');
  const earth = page.getByRole('button', { name: 'Select Earth', exact: true });
  const saturn = page.getByRole('button', { name: 'Select Saturn', exact: true });
  const sample = async (label: string, n = 12) => {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const e = await earth.boundingBox(); const s = await saturn.boundingBox();
      out.push(`${e?.x.toFixed(2)},${e?.y.toFixed(2)} | ${s?.x.toFixed(2)},${s?.y.toFixed(2)}`);
      await page.waitForTimeout(250);
    }
    console.log(label + '\n  ' + out.join('\n  '));
  };
  await sample('initial');
  const canvas = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(canvas.x + canvas.width * 0.3, canvas.y + canvas.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(canvas.x + canvas.width * 0.3 + 65, canvas.y + canvas.height * 0.6 + 25, { steps: 8 });
  await page.mouse.up();
  await sample('after drag', 20);
  await page.getByRole('button', { name: 'Sun’s Gravity', exact: true }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await sample('after back', 20);
  console.log(await page.locator('#app').evaluate((el) => JSON.stringify((el as HTMLElement).dataset)));
  expect(1).toBe(1);
});
