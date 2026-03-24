import { Page, expect } from '@playwright/test';

export class ReportDetailPage {
  constructor(private page: Page) {}

  async waitForReportLoaded() {
    // Wait for loading spinner to disappear
    await this.page
      .locator('text=Loading')
      .waitFor({ state: 'hidden', timeout: 30000 });
  }

  async expectReportRendered() {
    const iframe = this.page.locator('iframe');
    await expect(iframe).toBeVisible({ timeout: 30000 });
    const src = await iframe.getAttribute('src');
    expect(src).toContain('/files?id=');
  }

  async clickFilter() {
    await this.page.getByRole('button', { name: 'Filters' }).click();
  }

  async clickPrint() {
    await this.page.getByRole('button', { name: 'Print' }).click();
  }

  async clickExportAndWaitForDownload() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.getByRole('button', { name: 'Export' }).click();
    return downloadPromise;
  }

  async expectFilterButtonEnabled() {
    await expect(
      this.page.getByRole('button', { name: 'Filters' })
    ).toBeEnabled();
  }
}
