import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The report-administration route tree, mounted under
// /{storeId}/manage/reports by App.tsx. The register is the WHOLE vertical
// (spec/manage-reports ui-surface): there is no detail screen, so there is no
// child route — a row opens the editor dialog in place. Lazy, so the section
// is its own bundle.
//
// Distinct from the report RUNNER at /{storeId}/reports (spec/reports), which
// generates documents. Same word, different destination.
const ReportsList = lazy(() => import('./ReportsList'));

export const manageReportsRoutes = () => (
  <Route path="/" component={ReportsList} />
);
