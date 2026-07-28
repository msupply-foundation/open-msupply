import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The internal-orders section route tree, mounted under
// /{storeId}/replenishment/internal-order by App.tsx. The list screen (S1) and
// the detail screen (S3, scoped to view + header edits + send) are built; the
// create modal (S2), line editor (S4), side panel (S5), and master-list picker
// (S7) are out of scope, so their entry points (New order, Add item, More,
// row-click-to-line-editor) currently fall through to not-yet-built surfaces.
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
