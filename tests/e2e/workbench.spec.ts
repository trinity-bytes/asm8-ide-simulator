import AxeBuilder from '@axe-core/playwright';
import { expect, openExample, test } from './fixtures';

test.describe('workbench', () => {
  test('command palette runs commands and the theme picker switches theme', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    await page.keyboard.press('Control+Shift+P');
    await page.keyboard.type('theme');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Color theme' })).toBeVisible();
    await page.getByRole('option', { name: /Dracula/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
  });

  test('settings persist across reloads', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('combobox', { name: 'Font size' }).selectOption('16');
    await page.reload();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Font size' })).toHaveValue('16');
  });

  test('instruction set reference opens and lists real opcodes', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    await page.getByRole('button', { name: 'Instruction set' }).click();
    await page.getByRole('textbox', { name: 'Filter instructions' }).fill('mov');
    await page.getByRole('button', { name: /^MOV/ }).click();
    await expect(page.getByRole('heading', { name: 'MOV' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'MOV reg, value' })).toBeVisible();
  });

  for (const [name, setup] of [
    ['welcome', async () => {}],
    ['paused', 'paused'],
  ] as const) {
    test(`no serious accessibility violations: ${name}`, async ({ page, errors }) => {
      void errors;
      if (setup === 'paused') {
        await openExample(page, 'hello.asm');
        for (let i = 0; i < 8; i++) await page.keyboard.press('F10');
      } else {
        await page.goto('/');
      }
      // CodeMirror's scroller holds a focusable contenteditable, which axe does not count.
      const results = await new AxeBuilder({ page })
        .disableRules(['region'])
        .exclude('.cm-scroller')
        .analyze();
      const serious = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map(
          (v) =>
            `${v.id}: ${v.nodes
              .map((n) => n.target.join(' '))
              .slice(0, 3)
              .join(' | ')}`,
        );
      expect(serious).toEqual([]);
    });
  }
});
