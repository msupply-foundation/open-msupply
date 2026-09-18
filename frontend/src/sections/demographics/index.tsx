import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// Demographics vertical routes (spec/demographics). One screen, the grid (S1),
// at the Manage nav group's 'manage/indicators-demographics' entry.
//
// Its two gates — central server, vaccine module — are navigation's: navConfig
// carries them on the entry, so the destination is absent from the menu and
// palette where either fails, and ShellLayout's routeAccess redirects a direct
// URL the same way. Nothing is gated here: reading needs no permission, and the
// write permission is mirrored at the click, not the route (rules § access).
const DemographicsPage = lazy(() => import('./DemographicsPage'));

export const demographicsRoutes = () => (
  <Route path="/" component={DemographicsPage} />
);
