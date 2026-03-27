import { test } from '../../fixtures/report-test.fixture';

test.describe('Inbound Shipments — report-specific filters', () => {
  test.beforeEach(async ({ reportsListPage }) => {
    await reportsListPage.goto();
    await reportsListPage.expectPageLoaded();
    await reportsListPage.clickReport('Inbound Shipments');
  });

  test('displays expected filter fields', async ({
    reportArgumentsModal,
  }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.expectFieldVisible('Supplier');
    await reportArgumentsModal.expectFieldVisible('From date');
    await reportArgumentsModal.expectFieldVisible('To date');
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
