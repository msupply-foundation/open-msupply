import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The encounters section, mounted under the navConfig path
// 'dispensary/encounter' in App.tsx: '/' is the encounter list, '/:encounterId'
// the encounter record screen, each its own lazy chunk.
const EncountersList = lazy(() => import('./list/EncountersList'));
const EncounterDetailView = lazy(() => import('./EncounterDetailView'));

export const encountersRoutes = () => (
  <>
    <Route path="/" component={EncountersList} />
    <Route path="/:encounterId" component={EncounterDetailView} />
  </>
);
