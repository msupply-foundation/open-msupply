import { test } from '../../fixtures/report-test.fixture';

test.describe('Item List — report-specific filters', () => {
  test.beforeEach(async ({ reportsListPage }) => {
    await reportsListPage.goto();
    await reportsListPage.expectPageLoaded();
    await reportsListPage.clickReport('Item List');
  });

  test('displays expected filter fields', async ({
    reportArgumentsModal,
  }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.expectFieldVisible('Item code');
    await reportArgumentsModal.expectFieldVisible('Item name');
    await reportArgumentsModal.expectFieldVisible('Master List');
    await reportArgumentsModal.expectFieldVisible('VEN category');
  });

  test('filters by item name', async ({
    reportArgumentsModal,
    reportDetailPage,
  }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.fillTextInput('Item name', 'amox');
    await reportArgumentsModal.clickOk();
    await reportDetailPage.waitForReportLoaded();
    await reportDetailPage.expectReportRendered();
  });
});
