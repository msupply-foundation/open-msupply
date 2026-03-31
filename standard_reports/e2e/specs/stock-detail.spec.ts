import { test } from '../fixtures/report-test.fixture';

test.describe('Stock Detail — report-specific filters', () => {
  test.beforeEach(async ({ reportsListPage }) => {
    await reportsListPage.goto();
    await reportsListPage.expectPageLoaded();
    await reportsListPage.clickReport('Stock Detail');
  });

  test('displays expected filter fields', async ({
    reportArgumentsModal,
  }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.expectFieldVisible('Item Code or Name');
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
});
