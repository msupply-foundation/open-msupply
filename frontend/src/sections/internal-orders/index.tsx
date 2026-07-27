import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The internal-orders section route tree, mounted under
// /{storeId}/replenishment/internal-order by App.tsx. Only the list view (the
// reference list screen) is built in this cut; the create modal (S2) and detail
// screen (S3) are out of scope, so a New-order / row-click navigation into the
// section's detail space currently falls through to the app's not-found entry
// page until those screens land. Lazy so the section is its own bundle.
const InternalOrdersList = lazy(() => import('./list/InternalOrdersList'));

export const internalOrdersRoutes = () => (
  <>
    <Route path="/" component={InternalOrdersList} />
  </>
);
