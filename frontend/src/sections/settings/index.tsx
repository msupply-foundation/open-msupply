import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// Settings vertical (spec/settings): the S1 settings page, plus the S2
// Test-scanner screen reached from Devices. Mounted by App.tsx under
// /:storeId/settings.
export const settingsRoutes = () => (
  <>
    <Route path="/" component={lazy(() => import('./SettingsPage'))} />
    <Route
      path="/test-scanner"
      component={lazy(() => import('./devices/TestScannerPage'))}
    />
  </>
);
