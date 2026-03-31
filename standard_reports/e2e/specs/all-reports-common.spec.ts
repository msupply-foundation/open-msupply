import { test, expect } from '../fixtures/report-test.fixture';
import { STANDARD_REPORTS } from '../data/report-definitions';
import { getFilterStrategy } from '../data/filter-strategies';

for (const report of STANDARD_REPORTS) {
  test.describe(`Report: ${report.displayName}`, () => {
    test('appears in reports list under correct category', async ({
      reportsListPage,
    }) => {
      await reportsListPage.goto();
      await reportsListPage.expectPageLoaded();
      await reportsListPage.expectCategoryVisible(report.category);
      await reportsListPage.expectReportVisible(report.displayName);
    });

    if (report.hasArguments) {
      test('opens arguments modal when clicked', async ({
        reportsListPage,
        reportArgumentsModal,
      }) => {
        await reportsListPage.goto();
        await reportsListPage.expectPageLoaded();
        await reportsListPage.clickReport(report.displayName);
        await reportArgumentsModal.expectOpen();
      });

      test('cancel closes modal without navigating', async ({
        reportsListPage,
        reportArgumentsModal,
      }) => {
        await reportsListPage.goto();
        await reportsListPage.expectPageLoaded();
        await reportsListPage.clickReport(report.displayName);
        await reportArgumentsModal.expectOpen();
        await reportArgumentsModal.clickCancel();
        await reportArgumentsModal.expectClosed();
        // Still on reports list
        await expect(reportsListPage['page']).toHaveURL(/\/reports$/);
      });
    }

    test('generates report with default filters', async ({
      reportsListPage,
      reportArgumentsModal,
      reportDetailPage,
    }) => {
      await reportsListPage.goto();
      await reportsListPage.expectPageLoaded();
      await reportsListPage.clickReport(report.displayName);

      if (report.hasArguments) {
        await reportArgumentsModal.expectOpen();
        const strategy = getFilterStrategy(report.code);
        await strategy(reportArgumentsModal);
        await reportArgumentsModal.clickOk();
      }

      await reportDetailPage.waitForReportLoaded();
      await reportDetailPage.expectReportRendered();
    });

    test('filter button reopens modal from detail view', async ({
      reportsListPage,
      reportArgumentsModal,
      reportDetailPage,
    }) => {
      await reportsListPage.goto();
      await reportsListPage.expectPageLoaded();
      await reportsListPage.clickReport(report.displayName);

      if (report.hasArguments) {
        await reportArgumentsModal.expectOpen();
        await reportArgumentsModal.clickOk();
      }

      await reportDetailPage.waitForReportLoaded();
      await reportDetailPage.expectReportRendered();
      await reportDetailPage.clickFilter();
      await reportArgumentsModal.expectOpen();
    });

    test('print button triggers report generation', async ({
      page,
      reportsListPage,
      reportArgumentsModal,
      reportDetailPage,
    }) => {
      await reportsListPage.goto();
      await reportsListPage.expectPageLoaded();
      await reportsListPage.clickReport(report.displayName);

      if (report.hasArguments) {
        await reportArgumentsModal.expectOpen();
        await reportArgumentsModal.clickOk();
      }

      await reportDetailPage.waitForReportLoaded();
      await reportDetailPage.expectReportRendered();

      // Intercept the GraphQL generateReport request
      const requestPromise = page.waitForRequest(
        request =>
          request.url().includes('/graphql') &&
          request.postData()?.includes('generateReport') === true
      );

      await reportDetailPage.clickPrint();
      const request = await requestPromise;
      expect(request).toBeTruthy();
    });

    test('export button triggers file download', async ({
      reportsListPage,
      reportArgumentsModal,
      reportDetailPage,
    }) => {
      await reportsListPage.goto();
      await reportsListPage.expectPageLoaded();
      await reportsListPage.clickReport(report.displayName);

      if (report.hasArguments) {
        await reportArgumentsModal.expectOpen();
        await reportArgumentsModal.clickOk();
      }

      await reportDetailPage.waitForReportLoaded();
      await reportDetailPage.expectReportRendered();

      const download =
        await reportDetailPage.clickExportAndWaitForDownload();
      expect(download).toBeTruthy();
    });
  });
}
