import React from 'react';
import {
  DetailLoadingSkeleton,
  PluginPage,
  Route,
  useAuthContext,
  usePluginProvider,
  UserPermission,
} from '@openmsupply-client/common';
import { NotFound } from './components';

const PluginPageGuard: React.FC<{
  permissions: UserPermission[] | undefined;
  children: React.ReactNode;
}> = ({ permissions, children }) => {
  const { userHasPermission } = useAuthContext();
  if (permissions?.length && !permissions.every(userHasPermission)) {
    return <NotFound />;
  }
  return <>{children}</>;
};

const categoryKeyFor = (page: PluginPage): string =>
  page.menu.category.type === 'existing'
    ? page.menu.category.appRoute
    : page.menu.category.key;

/**
 * Returns `<Route>` children for every registered plugin page. Rendered
 * inside the top-level `<Routes>` in Site.tsx; React Router picks these
 * static paths over the wildcard category routers by specificity.
 */
export const usePluginRoutes = (): React.ReactNode => {
  const { plugins } = usePluginProvider();

  return (plugins.pages ?? [])
    .filter(page => !!page.pluginCode)
    .map(page => {
      const path = `${categoryKeyFor(page)}/${page.route}`;
      const Component = page.Component;
      return (
        <Route
          key={path}
          path={path}
          element={
            <React.Suspense fallback={<DetailLoadingSkeleton />}>
              <PluginPageGuard permissions={page.menu.permissions}>
                <Component />
              </PluginPageGuard>
            </React.Suspense>
          }
        />
      );
    });
};
