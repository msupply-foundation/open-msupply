import { Page, expect } from '@playwright/test';

export class ReportsListPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('/reports', { waitUntil: 'networkidle' });
    // Dismiss any auth error or notification dialogs that may appear
    await this.dismissDialogIfPresent();
  }

  async expectPageLoaded() {
    // Wait for report cards to render, with dialog dismissal as fallback
    try {
      await expect(
        this.page.locator('[class*="MuiCard"]').first()
      ).toBeVisible({ timeout: 15000 });
    } catch {
      // A dialog may have appeared over the page — dismiss and retry
      await this.dismissDialogIfPresent();
      await expect(
        this.page.locator('[class*="MuiCard"]').first()
      ).toBeVisible({ timeout: 10000 });
    }
  }

  async clickReport(displayName: string) {
    // Target report links inside the card grid, not sidebar nav items
    await this.page
      .locator('[class*="MuiCard"] a, [class*="MuiCard"] [role="button"]')
      .filter({ hasText: displayName })
      .first()
      .click();
  }

  async expectReportVisible(displayName: string) {
    await expect(
      this.page
        .locator('[class*="MuiCard"]')
        .filter({ hasText: displayName })
        .first()
    ).toBeVisible();
  }

  async expectCategoryVisible(
    category: 'Stock & Items' | 'Distribution' | 'Replenishment' | 'Programs' | 'Other'
  ) {
    // Match category headings in cards, not sidebar
    await expect(
      this.page.locator('[class*="MuiCard"]').filter({ hasText: category }).first()
    ).toBeVisible();
  }

  private async dismissDialogIfPresent() {
    const dialog = this.page.getByRole('dialog');
    if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      const okButton = dialog.getByRole('button', { name: 'OK' });
      if (await okButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await okButton.click();
        await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      }
    }
  }
}
