import { test } from '../../fixtures/report-test.fixture';

test.skip(
  () => !process.env['TEST_PROGRAM_MODULE'],
  'Requires TEST_PROGRAM_MODULE=true'
);

test.describe('Pending Encounters — report-specific filters', () => {
  test.beforeEach(async ({ reportsListPage }) => {
    await reportsListPage.goto();
    await reportsListPage.expectPageLoaded();
    await reportsListPage.clickReport('Pending Encounters');
  });

  test('displays expected filter fields', async ({
    reportArgumentsModal,
  }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.expectFieldVisible('Program');
  });
});
