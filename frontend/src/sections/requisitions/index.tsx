import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The requisitions section route tree, mounted under
// /{storeId}/distribution/customer-requisition by App.tsx: the list screen
// (S1, with the create modals S3) and the detail screen (S2, with the line
// editor S4, the side panel S5, the Documents/Log/Indicators tabs, and the
// supply, finalise, line-deletion, and master-list-add actions). Lazy so the
// section is its own bundle.
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
