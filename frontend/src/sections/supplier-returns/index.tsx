import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The supplier-returns section route tree, mounted under
// /{storeId}/replenishment/supplier-return by App.tsx
// (spec/supplier-returns/ui-surface.md). List (S1, with the S2 create flow) and
// detail (S3, hosting the S4 return-items modal); both lazy so the section is
// its own bundle.
const SupplierReturnsList = lazy(() => import('./list/SupplierReturnsList'));
const SupplierReturnDetailView = lazy(
  () => import('./detail/SupplierReturnDetailView')
);

export const supplierReturnsRoutes = () => (
  <>
    <Route path="/" component={SupplierReturnsList} />
    <Route path="/:returnId" component={SupplierReturnDetailView} />
  </>
);
