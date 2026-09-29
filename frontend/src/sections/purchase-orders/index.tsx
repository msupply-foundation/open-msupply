import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The purchase-orders section route tree, mounted under
// /{storeId}/replenishment/purchase-order by App.tsx — a destination the
// navigation registry gates on the store's procurement functionality
// (spec/purchase-orders rules § availability), so the route itself redirects
// when the store has the preference off.
//
// The LIST screen (spec S1, with its create S2 and delete S3), the
// outstanding-lines list (S5) and an order's own screen (S6, with S7-S9 and
// S11-S13) are built. What an order's screen does NOT yet reach: the line
// editor (S10), add-from-master-list (S14), the bulk delivery-date modal (S15)
// and the line import (S16). Lazy, so each screen is its own bundle.
const PurchaseOrdersList = lazy(() => import('./list/PurchaseOrdersList'));
const OutstandingLinesList = lazy(
  () => import('./outstanding/OutstandingLinesList')
);
const PurchaseOrderDetailView = lazy(
  () => import('./detail/PurchaseOrderDetailView')
);

// `outstanding` before an order's own `:id` route, so the word is this screen's
// address and never read as an order id.
export const purchaseOrdersRoutes = () => (
  <>
    <Route path="/" component={PurchaseOrdersList} />
    <Route path="/outstanding" component={OutstandingLinesList} />
    <Route path="/:id" component={PurchaseOrderDetailView} />
  </>
);
