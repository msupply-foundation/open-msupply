import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The names vertical (spec/names) mounts as THREE nav destinations over the one
// name entity: the Customer list under Distribution and the Supplier list under
// Replenishment (the same entity filtered by which per-store relationship it
// holds), and the facility register under Manage (every name that is itself a
// store — not store-scoped at all). Views are lazy so each is its own bundle.
// The customer detail is an in-place modal (owned by the list), so Customers
// has no detail route; the supplier detail is a routed page; the register's
// editor and import are both in-place modals.
const CustomersList = lazy(() => import('./list/CustomersList'));
const SuppliersList = lazy(() => import('./list/SuppliersList'));
const SupplierDetailPage = lazy(() => import('./detail/SupplierDetailPage'));
const FacilityRegister = lazy(() => import('./register/FacilityRegister'));

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

// Mounted at /{storeId}/manage/stores by App.tsx. The CENTRAL-SERVER gate is
// the navigation registry's (`manage/stores` sits under a `central`-gated
// section), not this route's: the register's read carries no requirement past
// store access (spec/names § access).
export const facilityRegisterRoutes = () => (
  <Route path="/" component={FacilityRegister} />
);
