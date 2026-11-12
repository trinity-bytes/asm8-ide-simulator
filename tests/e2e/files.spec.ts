import { editor, expect, test } from './fixtures';

// Uses the browser workspace (OPFS), which works in every browser and in headless Chromium.
test.describe('files in the browser workspace', () => {
  test('create, edit, save, rename, reload and delete a file', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    await page.keyboard.press('Control+Shift+P');
    await page.keyboard.type('browser workspace');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'New file' }).first().click();
    // A new file starts in rename mode.
    const rename = page.getByRole('textbox', { name: /New name for/ });
    await rename.fill('blink.asm');
    await rename.press('Enter');
    await expect(page.getByRole('tab', { name: 'blink.asm' })).toBeVisible();

    await editor(page).click();
    await page.keyboard.type('MOV A, 1\nHLT');
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Saved blink.asm in the browser workspace')).toBeVisible();

    await page
      .getByRole('tree')
      .getByRole('button', { name: /^blink\.asm/ })
      .click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    await page.getByRole('textbox', { name: /New name for/ }).fill('main.asm');
    await page.getByRole('textbox', { name: /New name for/ }).press('Enter');
    await expect(page.getByRole('tab', { name: 'main.asm' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('tab', { name: 'main.asm' })).toBeVisible();
    await expect(editor(page)).toContainText('MOV A, 1');

    await page
      .getByRole('tree')
      .getByRole('button', { name: /^main\.asm/ })
      .click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog', { name: 'Delete main.asm?' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'main.asm' })).toBeHidden();
  });

  test('closing a tab with unsaved changes asks first', async ({ page, errors }) => {
    void errors;
    await page.goto('/');
    await page.getByRole('button', { name: 'hello.asm' }).first().click();
    await editor(page).click();
    await page.keyboard.type('; edit');
    await page
      .getByRole('tab', { name: /hello\.asm/ })
      .locator('.close')
      .click();
    await expect(page.getByRole('dialog', { name: 'Save changes to hello.asm?' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('tab', { name: 'hello.asm' })).toBeVisible();
  });
});
