import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The immunisation-programs section route tree, mounted under
// /{storeId}/programs/immunisations by App.tsx (spec/immunisation-programs).
// Two screens: the program list (S1) and a program's detail — its course list
// (S2) — which opens the course editor (S3) in place. Both lazy, so the
// section is its own bundle.
//
// The destination's two gates — central server, vaccine module — are
// navigation's: navConfig carries them (the section on `central`, the entry on
// `vaccineModule`), so the destination is absent from the menu and palette
// where either fails and ShellLayout's routeAccess redirects a direct URL.
// Nothing is gated here: reading needs no permission, and the write permission
// is mirrored at the click, not the route (rules § access).
const ProgramsList = lazy(() => import('./ProgramsList'));
const ProgramDetail = lazy(() => import('./ProgramDetail'));

export const immunisationProgramsRoutes = () => (
  <>
    <Route path="/" component={ProgramsList} />
    <Route path="/:programId" component={ProgramDetail} />
  </>
);
