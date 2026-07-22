import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The Settings utility destination, mounted under /{storeId}/settings by
// App.tsx (spec/chrome § utility destinations). Lazy so the page is its own
// bundle, mirroring the other sections.
const SettingsPage = lazy(() => import('./SettingsPage'));

export const settingsRoutes = () => <Route path="/" component={SettingsPage} />;
