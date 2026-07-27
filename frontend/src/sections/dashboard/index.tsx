import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The dashboard section (spec/dashboard): a single screen — the store landing
// page. Lazy so the section is its own bundle, mirroring the other sections. It
// renders in two places: the store root `/` (the landing screen) and the nav's
// `dashboard` destination — both mount the same page, wired in App.tsx.
export const DashboardPage = lazy(() => import('./DashboardPage'));

export const dashboardRoutes = () => (
  <Route path="/" component={DashboardPage} />
);
