import { test } from '../fixtures/report-test.fixture';

test.describe('Inventory Adjustments — report-specific filters', () => {
  test.beforeEach(async ({ reportsListPage }) => {
    await reportsListPage.goto();
    await reportsListPage.expectPageLoaded();
    await reportsListPage.clickReport('Inventory Adjustments');
  });

  test('displays expected filter fields', async ({
    reportArgumentsModal,
  }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.expectFieldVisible('Item Code or Name');
    await reportArgumentsModal.expectFieldVisible('From date');
    await reportArgumentsModal.expectFieldVisible('To date');
    await reportArgumentsModal.expectFieldVisible('Master List');
    await reportArgumentsModal.expectFieldVisible('Location');
    await reportArgumentsModal.expectFieldVisible('Adjustment type');
    await reportArgumentsModal.expectFieldVisible('Adjustment source');
    await reportArgumentsModal.expectFieldVisible('Reason');
  });

  test('filters by item code or name', async ({
    reportArgumentsModal,
    reportDetailPage,
  }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.fillTextInput('Item Code or Name', 'amox');
    await reportArgumentsModal.clickOk();
    await reportDetailPage.waitForReportLoaded();
    await reportDetailPage.expectReportRendered();
  });

  test('filters by date range', async ({
    reportArgumentsModal,
    reportDetailPage,
  }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.fillDateField('From date', '2024-01-01');
    await reportArgumentsModal.fillDateField('To date', '2024-12-31');
    await reportArgumentsModal.clickOk();
    await reportDetailPage.waitForReportLoaded();
    await reportDetailPage.expectReportRendered();
  });
});
