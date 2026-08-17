import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The names vertical (spec/names) mounts as TWO nav destinations: the Customer
// list under Distribution and the Supplier list under Replenishment (the same
// entity filtered by which per-store relationship it holds). Views are lazy so
// each is its own bundle. The customer detail is an in-place modal (owned by
// the list), so Customers has no detail route; the supplier detail is a routed
// page.
const CustomersList = lazy(() => import('./list/CustomersList'));
const SuppliersList = lazy(() => import('./list/SuppliersList'));
const SupplierDetailPage = lazy(() => import('./detail/SupplierDetailPage'));

// Mounted at /{storeId}/distribution/customers by App.tsx.
export const customersRoutes = () => (
  <Route path="/" component={CustomersList} />
);

// Mounted at /{storeId}/replenishment/suppliers by App.tsx (list + detail
// page).
export const suppliersRoutes = () => (
  <>
    <Route path="/" component={SuppliersList} />
    <Route path="/:nameId" component={SupplierDetailPage} />
  </>
);
