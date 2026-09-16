import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The locations section route tree, mounted under
// /{storeId}/inventory/locations by App.tsx. Locations has ONE routed surface —
// the list (spec/locations S1); create/edit is a modal over it (S2), so there
// is no detail route. Lazy so the section is its own bundle.
const LocationsList = lazy(() => import('./list/LocationsList'));

export const locationsRoutes = () => (
  <Route path="/" component={LocationsList} />
);
