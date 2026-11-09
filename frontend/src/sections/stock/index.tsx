import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The stock section route tree, mounted under /{storeId}/inventory/stock by
// App.tsx. The list view is the stock register (S1); the detail view (one stock
// line, S2) is reached by a list row-click or after creating new stock. Both
// are lazy so the section is its own bundle.
const StockList = lazy(() => import('./list/StockList'));
const StockLineDetailView = lazy(() => import('./detail/StockLineDetailView'));

export const stockRoutes = () => (
  <>
    <Route path="/" component={StockList} />
    <Route path="/:stockLineId" component={StockLineDetailView} />
  </>
);
