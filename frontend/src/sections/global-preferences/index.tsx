import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// Global preferences vertical routes (spec/global-preferences). One screen at
// the Manage nav group's 'manage/global-preferences' destination. No gate on
// the route itself: the Manage menu is central-only (navigation), but the page
// reads anywhere — every control is disabled off-central or without the
// central-data permission, and the server enforces both on write
// (OMS-REG-GPREF-01.14/.15).
const GlobalPreferencesPage = lazy(() => import('./GlobalPreferencesPage'));

export const globalPreferencesRoutes = () => (
  <Route path="/" component={GlobalPreferencesPage} />
);
