import { editor, expect, openExample, setSpeed, test } from './fixtures';

test.describe('running programs', () => {
  test('hello.asm runs to HLT and prints Hello World! on the display', async ({ page, errors }) => {
    void errors;
    await openExample(page, 'hello.asm');
    await setSpeed(page, 'Max');
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Halted' })).toBeVisible();
    const log = page.getByRole('log', { name: 'Console output' });
    await expect(log).toContainText('Hello World!');
    await expect(log).toContainText('Halted at 0x17 (HLT, line 12) after 83 steps');
    await page.getByRole('tab', { name: 'Display' }).click();
    await expect(page.getByRole('img', { name: 'Display: Hello World!' })).toBeVisible();
  });

  test('a breakpoint pauses on line 20 with A = 0x48', async ({ page, errors }) => {
    void errors;
    await openExample(page, 'hello.asm');
    await editor(page).locator('.cm-line').nth(19).click();
    await page.keyboard.press('F9');
    await setSpeed(page, 'Max');
    await page.keyboard.press('F5');
    await expect(page.getByRole('status').filter({ hasText: 'Paused' })).toBeVisible();
    await expect(page.getByRole('log', { name: 'Console output' })).toContainText(
      'Paused at breakpoint hello.asm:20 (0x22) · step 8',
    );
    await expect(page.getByRole('button', { name: /^A 0x48/ })).toBeVisible();
    await expect(page.locator('.cm-run-hint')).toHaveText('paused at breakpoint · step 8');
    // Continue stops at the same breakpoint again for the next character.
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('log', { name: 'Console output' })).toContainText('step 14');
  });

  test('step, reset and undo', async ({ page, errors }) => {
    void errors;
    await openExample(page, 'hello.asm');
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect(page.getByText('3 steps')).toBeVisible();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByText('3 steps')).toBeHidden();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('3 steps')).toBeVisible();
  });

  test('keyboard input goes from the console to IN and back out through OUT', async ({ page, errors }) => {
    void errors;
    await openExample(page, 'keyboard-echo.asm');
    await setSpeed(page, '64 Hz');
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Waiting for input' })).toBeVisible();
    const input = page.getByRole('textbox', { name: 'Keyboard input for the program' });
    await input.focus();
    await page.keyboard.type('hi');
    await expect(page.getByRole('log', { name: 'Console output' })).toContainText('hi');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'Halted' })).toBeVisible();
  });

  test('a runtime fault stops on the faulting line', async ({ page, errors }) => {
    void errors;
    await openExample(page, 'hello.asm');
    await editor(page).click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('MOV A, 5\nDIV 0\nHLT');
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Error' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('alert').filter({ hasText: 'Division by 0 at 0x03, line 2' })).toBeVisible();
  });
});
