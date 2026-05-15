import React, { useEffect } from 'react';
import {
  DetailLoadingSkeleton,
  LocalizedString,
  PluginPage,
  QueryClientProviderProxy,
  Route,
  ThemeProviderProxy,
  useAuthContext,
  useBreadcrumbs,
  useLocalizedString,
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
 * Set the breadcrumb shown in the AppBar to the plugin's localized page
 * label, so we render e.g. "Stock aging" instead of the raw URL segment.
 * useBreadcrumbs skips the first URL segment for shallow routes (the same
 * way built-in pages show "Stock" rather than "Inventory > Stock"), so the
 * single visible crumb sits at index 0.
 */
const PluginBreadcrumbs: React.FC<{ pageLabel: LocalizedString }> = ({
  pageLabel,
}) => {
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const localizedPage = useLocalizedString(pageLabel);

  useEffect(() => {
    setCustomBreadcrumbs({ 0: localizedPage });
  }, [localizedPage, setCustomBreadcrumbs]);

  return null;
};

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
                <ThemeProviderProxy>
                  <QueryClientProviderProxy>
                    <PluginBreadcrumbs pageLabel={page.menu.label} />
                    <Component />
                  </QueryClientProviderProxy>
                </ThemeProviderProxy>
              </PluginPageGuard>
            </React.Suspense>
          }
        />
      );
    });
};
