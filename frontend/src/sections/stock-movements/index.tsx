import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

const StockMovementsList = lazy(() => import('./list/StockMovementsList'));
const StockMovementDetailView = lazy(
  () => import('./detail/StockMovementDetailView')
);

export const stockMovementsRoutes = () => (
  <>
    <Route path="/" component={StockMovementsList} />
    <Route path="/:movementId" component={StockMovementDetailView} />
  </>
);
