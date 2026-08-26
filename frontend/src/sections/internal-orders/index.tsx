import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The internal-orders section route tree, mounted under
// /{storeId}/replenishment/internal-order by App.tsx: the list screen (S1,
// with the create modal S2) and the detail screen (S3, with the line editor
// S4, side panel S5, and master-list picker S7).
// Lazy so the section is its own bundle.
const InternalOrdersList = lazy(() => import('./list/InternalOrdersList'));
const InternalOrderDetailView = lazy(
  () => import('./detail/InternalOrderDetailView')
);

export const internalOrdersRoutes = () => (
  <>
    <Route path="/" component={InternalOrdersList} />
    <Route path="/:orderId" component={InternalOrderDetailView} />
  </>
);
