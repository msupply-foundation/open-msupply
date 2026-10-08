import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// Manage › Plugins (spec/plugin-management), mounted under
// /{storeId}/manage/plugins by App.tsx. One screen; its dialogs open over it.
// Lazy, so the section is its own bundle.
const PluginsList = lazy(() => import('./PluginsList'));

export const pluginManagementRoutes = () => (
  <Route path="/" component={PluginsList} />
);
