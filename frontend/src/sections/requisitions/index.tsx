import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The requisitions section route tree, mounted under
// /{storeId}/distribution/customer-requisition by App.tsx. Only the list view
// (S1) is built in this cut; the create modals (S3) and detail screen (S2)
// are out of scope, so a New-requisition / row-click navigation into the
// section's detail space currently falls through to the app's not-found entry
// page until those screens land. Lazy so the section is its own bundle.
const RequisitionsList = lazy(() => import('./list/RequisitionsList'));

export const requisitionsRoutes = () => (
  <>
    <Route path="/" component={RequisitionsList} />
  </>
);
