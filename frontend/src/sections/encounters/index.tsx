import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';
import { EntryPage } from '../../nav/EntryPage';
import { navDestinations } from '../../nav/navConfig';

// The encounters section (kdd/custom-forms implementation-plan H7), mounted
// under the navConfig path 'dispensary/encounter' in App.tsx. '/:encounterId'
// is the encounter record screen, its own lazy chunk. '/' is the encounter
// list, which is not built, so it shows the destination's entry page as every
// unbuilt destination does.
//
// TO-DO: the global encounter list (implementation-plan H15).
const EncounterDetailView = lazy(() => import('./EncounterDetailView'));

const listDestination = navDestinations.find(
  d => d.path === 'dispensary/encounter'
);

export const encountersRoutes = () => (
  <>
    <Route path="/" component={() => <EntryPage dest={listDestination} />} />
    <Route path="/:encounterId" component={EncounterDetailView} />
  </>
);
