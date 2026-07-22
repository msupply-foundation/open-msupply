import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The Help utility destination, mounted under /{storeId}/help by App.tsx
// (spec/chrome § utility destinations). Lazy so the page is its own bundle,
// mirroring the other sections.
const HelpPage = lazy(() => import('./HelpPage'));

export const helpRoutes = () => <Route path="/" component={HelpPage} />;
