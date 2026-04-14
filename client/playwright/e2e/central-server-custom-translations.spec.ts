import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Note: right now this test primarily just takes screenshots, it doesn't correctly test functionality...


const screenshotDir = path.join(__dirname, '../screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function navigateToPreferences(page: Page) {
  await page.goto('/manage/global-preferences', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
}

async function dismissDialogs(page: Page) {
  const backdrop = page.locator('[role="presentation"]').first();
  if (await backdrop.isVisible({ timeout: 500 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

test.describe('Translation Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPreferences(page);
    await dismissDialogs(page);
  });

  test('capture global preferences page', async ({ page }: { page: Page }) => {
    await page.screenshot({
      path: path.join(screenshotDir, '01-global-preferences-initial.png'),
      fullPage: true,
    });
  });

  test('capture translations editor interface', async ({ page }: { page: Page }) => {
    const editButton = page.locator('button:has-text("Edit")').first();
    await expect(editButton).toBeVisible();
    await editButton.click({ force: true });
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(screenshotDir, '02-translations-editor.png'),
      fullPage: true,
    });

    const table = page.locator('table, [role="grid"], tbody').first();
    if (await table.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.screenshot({
        path: path.join(screenshotDir, '03-translations-table.png'),
        fullPage: true,
      });
    }
  });

  test('capture upload dialog and results', async ({ page }: { page: Page }) => {
    const editButton = page.locator('button:has-text("Edit")').first();
    await expect(editButton).toBeVisible();
    await editButton.click({ force: true });
    await page.waitForTimeout(1500);

    const uploadButton = page.locator('button:has-text("Import")').first();
    await expect(uploadButton).toBeVisible();
    await uploadButton.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotDir, '04-import-dialog.png'),
      fullPage: true,
    });

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(
      path.join(__dirname, '../fixtures/sample-translations.json')
    );
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(screenshotDir, '05-after-file-upload.png'),
      fullPage: true,
    });

    // Click the OK button to confirm the upload
    const okButton = page.locator('button:has-text("OK")').first();
    await expect(okButton).toBeVisible();
    await okButton.click();
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(screenshotDir, '06-upload-results.png'),
      fullPage: true,
    });
  });

  test('capture delete translation', async ({ page }: { page: Page }) => {
    const editButton = page.locator('button:has-text("Edit")').first();
    await expect(editButton).toBeVisible();
    await editButton.click({ force: true });
    await page.waitForTimeout(1500);

    const rows = await page.locator('tr, [role="row"]').all();

    if (rows.length > 1) {
      const deleteBtn = rows[1]!
        .locator(
          'button[aria-label*="delete" i], button[title*="delete" i], [class*="delete"]'
        )
        .first();
      if (await deleteBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: path.join(screenshotDir, '07-delete-confirmation.png'),
          fullPage: true,
        });
      }
    }
  });

  test('capture delete all confirmation', async ({ page }: { page: Page }) => {
    const editButton = page.locator('button:has-text("Edit")').first();
    await expect(editButton).toBeVisible();
    await editButton.click({ force: true });
    await page.waitForTimeout(1500);

    const deleteAllButton = page
      .locator('button:has-text("Delete All")')
      .first();
    await expect(deleteAllButton).toBeVisible();
    await deleteAllButton.click();
    await page.waitForTimeout(700);

    await page.screenshot({
      path: path.join(screenshotDir, '08-delete-all-confirmation.png'),
      fullPage: true,
    });
  });
});
