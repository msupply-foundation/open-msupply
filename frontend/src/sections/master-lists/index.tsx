import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// Master-lists (catalogue) vertical routes — mounted under the store-scoped
// `catalogue/master-lists` path (spec/master-lists). ONE screen: the list at
// the section root. There is no per-list detail route — selecting a row opens
// the ITEMS list scoped to that master list, which is the richer view of the
// same membership fact (issue #776). Read-only end to
// end.
const MasterListsList = lazy(() => import('./list/MasterListsList'));

export const masterListsRoutes = () => (
  <Route path="/" component={MasterListsList} />
);
