import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The purchase-orders section route tree, mounted under
// /{storeId}/replenishment/purchase-order by App.tsx — a destination the
// navigation registry gates on the store's procurement functionality
// (spec/purchase-orders rules § availability), so the route itself redirects
// when the store has the preference off.
//
// The LIST screen (spec S1, with its create S2 and delete S3) and the
// outstanding-lines list (S5) are built. An order's own screen (S6) is the
// vertical's remaining screen: until it is registered here, the address a row
// click points at falls to the shell's not-found page. Lazy, so each screen is
// its own bundle.
const PurchaseOrdersList = lazy(() => import('./list/PurchaseOrdersList'));
const OutstandingLinesList = lazy(
  () => import('./outstanding/OutstandingLinesList')
);

// `outstanding` before an order's own `:id` route, so the word is this screen's
// address and never read as an order id.
export const purchaseOrdersRoutes = () => (
  <>
    <Route path="/" component={PurchaseOrdersList} />
    <Route path="/outstanding" component={OutstandingLinesList} />
  </>
);
