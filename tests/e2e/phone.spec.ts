import { expect, test } from './fixtures';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('phone: one region at a time, run and see the result in the console', async ({ page, errors }) => {
  void errors;
  await page.goto('/');
  await page.getByRole('button', { name: 'Files' }).click();
  await page.getByRole('button', { name: 'Open browser workspace' }).click();
  // The first visit seeds the browser workspace with hello.asm and shows the code.
  await expect(page.locator('.top strong')).toHaveText('hello.asm');
  await expect(page.locator('.cm-content')).toContainText('Simple example');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.getByRole('button', { name: 'Console' }).click();
  await expect(page.getByRole('log', { name: 'Console output' })).toContainText('Run started');
  await page.getByRole('button', { name: 'Machine' }).click();
  await expect(page.getByRole('group', { name: 'Registers' })).toBeVisible();
  await page.getByRole('button', { name: 'More' }).click();
  await expect(page.getByRole('button', { name: 'Instruction set' })).toBeVisible();
});

test('phone: settings and files can be closed back to the editor', async ({ page, errors }) => {
  void errors;
  await page.goto('/');
  await page.getByRole('button', { name: 'Files' }).click();
  await page.getByRole('button', { name: 'Open browser workspace' }).click();
  await expect(page.locator('.top strong')).toHaveText('hello.asm');
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('.top strong')).toHaveText('Settings');
  await page.getByRole('button', { name: 'Back to editor' }).click();
  await expect(page.locator('.top strong')).toHaveText('hello.asm');
  await expect(page.locator('.cm-content')).toBeVisible();
  await page.getByRole('button', { name: 'Close hello.asm' }).click();
  await expect(page.locator('.cm-content')).toHaveCount(0);
});

test('phone: the edited line stays visible when the keyboard shrinks the screen', async ({
  page,
  errors,
}) => {
  void errors;
  await page.goto('/');
  await page.getByRole('button', { name: 'Files' }).click();
  await page.getByRole('button', { name: 'Open browser workspace' }).click();
  await expect(page.locator('.cm-content')).toContainText('Simple example');
  const lines = page.locator('.cm-line');
  const n = await lines.count();
  // Pick the lowest line still on screen, put the cursor there, then "open the keyboard".
  let target = 0;
  for (let i = 0; i < n; i++) {
    const box = await lines.nth(i).boundingBox();
    if (box && box.y + box.height < 700) target = i;
  }
  await lines.nth(target).click();
  await page.setViewportSize({ width: 390, height: 420 });
  await page.waitForTimeout(300);
  const box = await page.locator('.cm-activeLine').boundingBox();
  const scroller = await page.locator('.cm-scroller').boundingBox();
  expect(box).not.toBeNull();
  expect(scroller).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(scroller!.y + scroller!.height);
});
