import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The asset catalogue section (spec/asset-catalogue), mounted under
// /{storeId}/catalogue/assets by App.tsx: the catalogue list, and beneath it
// the log reasons, reached from the list's Manage asset log reasons. Both are
// lazy so the section is its own bundle.
const CatalogueList = lazy(() => import('./catalogue/CatalogueList'));
const LogReasonsList = lazy(() => import('./reasons/LogReasonsList'));

export const assetCatalogueRoutes = () => (
  <>
    <Route path="/" component={CatalogueList} />
    <Route path="/log-reasons" component={LogReasonsList} />
  </>
);
