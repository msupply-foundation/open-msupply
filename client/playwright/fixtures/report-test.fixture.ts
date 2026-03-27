import { test as base } from '@playwright/test';
import { login } from '../helpers/login';
import { ReportsListPage } from '../pages/reports-list.page';
import { ReportArgumentsModal } from '../pages/report-arguments-modal.page';
import { ReportDetailPage } from '../pages/report-detail.page';

type ReportTestFixtures = {
  reportsListPage: ReportsListPage;
  reportArgumentsModal: ReportArgumentsModal;
  reportDetailPage: ReportDetailPage;
};

export const test = base.extend<ReportTestFixtures>({
  // Login before each test and provide page objects
  reportsListPage: async ({ page }, use) => {
    await login(page);
    await use(new ReportsListPage(page));
  },
  reportArgumentsModal: async ({ page }, use) => {
    await use(new ReportArgumentsModal(page));
  },
  reportDetailPage: async ({ page }, use) => {
    await use(new ReportDetailPage(page));
  },
});

export { expect } from '@playwright/test';
