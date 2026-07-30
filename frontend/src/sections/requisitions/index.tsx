import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The requisitions section route tree, mounted under
// /{storeId}/distribution/customer-requisition by App.tsx: the list screen
// (S1, with the create modals S3) and the detail screen (S2, with the side
// panel S5 and the Documents/Log tabs). The line editor (S4), supply and
// finalise actions, line deletion, master-list add, and the Indicators tab
// are later slices. Lazy so the section is its own bundle.
const RequisitionsList = lazy(() => import('./list/RequisitionsList'));
const RequisitionDetailView = lazy(
  () => import('./detail/RequisitionDetailView')
);

export const requisitionsRoutes = () => (
  <>
    <Route path="/" component={RequisitionsList} />
    <Route path="/:requisitionId" component={RequisitionDetailView} />
  </>
);
