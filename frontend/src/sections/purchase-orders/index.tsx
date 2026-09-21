import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The purchase-orders section route tree, mounted under
// /{storeId}/replenishment/purchase-order by App.tsx — a destination the
// navigation registry gates on the store's procurement functionality
// (spec/purchase-orders rules § availability), so the route itself redirects
// when the store has the preference off.
//
// Only the LIST screen (spec S1, with its create S2 and delete S3) is built so
// far. The order's own screen (S6) and the outstanding-lines list (S5) are the
// vertical's remaining screens: until they are registered here, the addresses
// the list points at — a row click and the Outstanding lines button — fall to
// the shell's not-found page. Lazy, so the section is its own bundle.
const PurchaseOrdersList = lazy(() => import('./list/PurchaseOrdersList'));

export const purchaseOrdersRoutes = () => (
  <>
    <Route path="/" component={PurchaseOrdersList} />
  </>
);
