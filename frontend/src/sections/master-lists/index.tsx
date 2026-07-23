import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// Master-lists (catalogue) vertical routes — mounted under the store-scoped
// `catalogue/master-lists` path (spec/master-lists). List at the section root;
// the detail at /:masterListId. The Catalogue › Master Lists nav entry already
// exists in navConfig. Read-only end to end.
const MasterListsList = lazy(() => import('./list/MasterListsList'));
const MasterListDetailView = lazy(
  () => import('./detail/MasterListDetailView')
);

export const masterListsRoutes = () => (
  <>
    <Route path="/" component={MasterListsList} />
    <Route path="/:masterListId" component={MasterListDetailView} />
  </>
);
