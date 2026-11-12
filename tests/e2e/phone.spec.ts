import { expect, test } from './fixtures';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('phone: one region at a time, run and see the result in the console', async ({ page, errors }) => {
  void errors;
  await page.goto('/');
  await page.getByRole('button', { name: 'Files' }).click();
  await page.getByRole('button', { name: 'Open browser workspace' }).click();
  // The first visit seeds the browser workspace with hello.asm.
  await page.getByRole('button', { name: /^hello\.asm/ }).click();
  await expect(page.getByRole('heading', { level: 1 }).or(page.locator('.top strong'))).toContainText(
    'hello.asm',
  );
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.getByRole('button', { name: 'Console' }).click();
  await expect(page.getByRole('log', { name: 'Console output' })).toContainText('Run started');
  await page.getByRole('button', { name: 'Machine' }).click();
  await expect(page.getByRole('group', { name: 'Registers' })).toBeVisible();
  await page.getByRole('button', { name: 'More' }).click();
  await expect(page.getByRole('button', { name: 'Instruction set' })).toBeVisible();
});
