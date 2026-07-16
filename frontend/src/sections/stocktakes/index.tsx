import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The stocktakes section route tree, mounted under
// /{storeId}/inventory/stocktakes by App.tsx. The list view is the reference
// list screen; the detail view (a stocktake's lines) is reached by a list
// row-click or after creating a stocktake. Both are lazy so the section is its
// own bundle.
const StocktakesList = lazy(() => import('./StocktakesList'));
const StocktakeDetailView = lazy(() => import('./StocktakeDetailView'));

export const stocktakesRoutes = () => (
  <>
    <Route path="/" component={StocktakesList} />
    <Route path="/:stocktakeId" component={StocktakeDetailView} />
  </>
);
