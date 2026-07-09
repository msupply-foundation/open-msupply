import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';
import { EntryPage } from '../../nav/EntryPage';

// The stocktakes section route tree, mounted under /{storeId}/inventory/stocktakes
// by App.tsx. The list view is the reference list screen; the detail view is
// deferred ("detail view and beyond"), so its route lands on a placeholder for now.
// View components are lazy so the section is its own bundle.
const StocktakesList = lazy(() => import('./StocktakesList'));

export const stocktakesRoutes = () => (
  <>
    <Route path="/" component={StocktakesList} />
    <Route
      path="/:stocktakeId"
      component={() => <EntryPage labelKey="stocktake.detail-coming-soon" />}
    />
  </>
);
