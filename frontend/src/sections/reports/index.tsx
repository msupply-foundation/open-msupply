import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The reports section route tree, mounted under /{storeId}/reports by App.tsx.
// S1 is the reports dashboard (browse + launch); S2 is the single-report detail
// (generate + show + re-filter/print/export). Both are lazy so the section is
// its own bundle, mirroring stocktakes.
const ReportsPage = lazy(() => import('./list/ReportsPage'));
const ReportDetailView = lazy(() => import('./detail/ReportDetailView'));

// S4 — the record-screen report selector is domain/reports' SelectReportModal
// (cross-vertical: hosts like stocktakes lazy-import it behind their own
// Export/Print trigger — see stocktakes' ExportPrintAction). Nothing selector-
// related lives in this section.

export const reportsRoutes = () => (
  <>
    <Route path="/" component={ReportsPage} />
    <Route path="/:reportId" component={ReportDetailView} />
  </>
);
