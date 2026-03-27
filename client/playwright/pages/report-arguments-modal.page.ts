import { Page, expect } from '@playwright/test';

export class ReportArgumentsModal {
  private modal;

  constructor(private page: Page) {
    this.modal = this.page.getByRole('dialog');
  }

  async expectOpen() {
    await expect(this.modal).toBeVisible();
    await expect(
      this.modal.getByText('Report Filters')
    ).toBeVisible();
  }

  async expectClosed() {
    await expect(this.modal).not.toBeVisible();
  }

  async clickOk() {
    await this.modal.getByRole('button', { name: 'OK' }).click();
  }

  async clickCancel() {
    await this.modal.getByRole('button', { name: 'Cancel' }).click();
  }

  /**
   * JSONForms renders: div container > [label text with colon] + textbox/input
   * We find the narrowest div containing the label text AND an input/textbox.
   */
  async fillTextInput(label: string, value: string) {
    const container = this.modal
      .locator('div')
      .filter({ hasText: label })
      .filter({ has: this.page.getByRole('textbox') });
    await container.first().getByRole('textbox').first().fill(value);
  }

  async fillDateField(label: string, dateString: string) {
    const container = this.modal
      .locator('div')
      .filter({ hasText: label })
      .filter({ has: this.page.locator('input') });
    await container.first().locator('input').first().fill(dateString);
  }

  async selectDropdownOption(label: string, optionText: string) {
    const container = this.modal
      .locator('div')
      .filter({ hasText: label })
      .filter({ has: this.page.getByRole('combobox') });
    await container.first().getByRole('combobox').click();
    await this.page.getByRole('option', { name: optionText }).click();
  }

  async toggleCheckbox(label: string) {
    await this.modal.getByText(label).click();
  }

  async fillNameSearch(label: string, searchText: string) {
    const container = this.modal
      .locator('div')
      .filter({ hasText: label })
      .filter({ has: this.page.getByRole('textbox') });
    await container.first().getByRole('textbox').fill(searchText);
    await this.page
      .getByRole('option')
      .first()
      .waitFor({ state: 'visible' });
    await this.page.getByRole('option').first().click();
  }

  async fillMasterListSearch(label: string, searchText: string) {
    await this.fillNameSearch(label, searchText);
  }

  async fillLocationSearch(label: string, searchText: string) {
    await this.fillNameSearch(label, searchText);
  }

  async fillDateRange(fromDate: string, toDate: string) {
    const dateInputs = this.modal.locator('input[type="date"]');
    await dateInputs.nth(0).fill(fromDate);
    await dateInputs.nth(1).fill(toDate);
  }

  async expectFieldVisible(label: string) {
    await expect(this.modal.getByText(label, { exact: false })).toBeVisible();
  }
}
