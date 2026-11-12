import { editor, expect, openExample, test } from './fixtures';

test.describe('editor', () => {
  test('shows problems and applies the quick fix', async ({ page, errors }) => {
    void errors;
    await openExample(page, 'hello.asm');
    await editor(page).click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('start: MOVV A, 1\nJMP start');
    await page.getByRole('tab', { name: /Problems/ }).click();
    await expect(page.getByText('Invalid instruction: MOVV')).toBeVisible();
    await page.getByRole('button', { name: 'Did you mean MOV?' }).click();
    await expect(page.getByText('No problems in hello.asm.')).toBeVisible();
    await expect(editor(page)).toContainText('start: MOV A, 1');
  });

  test('hovering a mnemonic shows its documentation', async ({ page, errors }) => {
    void errors;
    await openExample(page, 'hello.asm');
    await editor(page).getByText('CALL', { exact: true }).hover();
    await expect(page.locator('.cm-hover-card')).toContainText('Call a routine.');
  });

  test('the address gutter shows where each line lands', async ({ page, errors }) => {
    void errors;
    await openExample(page, 'hello.asm');
    await expect(page.locator('.cm-address-gutter')).toContainText('0x22');
  });
});
