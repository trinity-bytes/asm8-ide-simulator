import { test as base, expect, type Page } from '@playwright/test';

/** Fails the test on any uncaught page error or console error. */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await use(errors);
    expect(errors, 'page errors').toEqual([]);
  },
});
export { expect };

export async function openExample(page: Page, file: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: file }).first().click();
  await expect(page.getByRole('tab', { name: file })).toBeVisible();
}

/** Picks a speed from the title-bar menu. */
export async function setSpeed(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: /^Speed / }).click();
  await page.getByRole('menuitemradio', { name: new RegExp(`^${label}`) }).click();
}

export const editor = (page: Page) => page.locator('.cm-content');
