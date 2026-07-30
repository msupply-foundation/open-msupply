import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The requisitions section route tree, mounted under
// /{storeId}/distribution/customer-requisition by App.tsx: the list screen
// (S1, with the create modals S3). The detail screen (S2) is not yet built,
// so navigation into the section's detail space (a row click, a successful
// create) currently falls through to the app's not-found entry page until it
// lands. Lazy so the section is its own bundle.
const RequisitionsList = lazy(() => import('./list/RequisitionsList'));

export const requisitionsRoutes = () => (
  <>
    <Route path="/" component={RequisitionsList} />
  </>
);
