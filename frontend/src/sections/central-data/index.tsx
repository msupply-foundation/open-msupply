import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// Central data import and export (spec/central-data), one screen under Manage.
// Lazy, so this admin-only screen is its own bundle.
const CentralDataPage = lazy(() => import('./CentralDataPage'));

export const centralDataRoutes = () => (
  <Route path="/" component={CentralDataPage} />
);
