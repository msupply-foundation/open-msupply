import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The customer-returns section route tree, mounted under
// /{storeId}/distribution/customer-return by App.tsx
// (spec/customer-returns/ui-surface.md). List (S1, with the S2 create flow) and
// detail (S3, hosting the S4 return-items modal); both lazy so the section is
// its own bundle.
const CustomerReturnsList = lazy(() => import('./list/CustomerReturnsList'));
const CustomerReturnDetailView = lazy(
  () => import('./detail/CustomerReturnDetailView')
);

export const customerReturnsRoutes = () => (
  <>
    <Route path="/" component={CustomerReturnsList} />
    <Route path="/:returnId" component={CustomerReturnDetailView} />
  </>
);
