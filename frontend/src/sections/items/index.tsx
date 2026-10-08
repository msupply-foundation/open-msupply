import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// Items (catalogue) vertical routes — mounted under the store-scoped
// `catalogue/items` path (spec/items). List at the section root; the item
// detail at /:itemId (spec/items S2). The Catalogue › Items nav entry already
// exists in navConfig.
const ItemsList = lazy(() => import('./list/ItemsList'));
const ItemDetailView = lazy(() => import('./detail/ItemDetailView'));

export const itemsRoutes = () => (
  <>
    <Route path="/" component={ItemsList} />
    <Route path="/:itemId" component={ItemDetailView} />
  </>
);
