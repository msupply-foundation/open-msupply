import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The campaigns section route tree, mounted under
// /{storeId}/manage/campaigns by App.tsx. The register is the WHOLE vertical
// (spec/campaigns ui-surface): there is no detail screen, so there is no child
// route — a row opens the editor dialog in place. Lazy, so the section is its
// own bundle.
const CampaignsList = lazy(() => import('./CampaignsList'));

export const campaignsRoutes = () => (
  <Route path="/" component={CampaignsList} />
);
