import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DetailLoadingSkeleton,
  LocaleKey,
  PluginPage,
  QueryClientProviderProxy,
  Route,
  ThemeProviderProxy,
  useAuthContext,
  useBreadcrumbs,
  usePluginProvider,
  UserPermission,
  useTranslation,
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

// `${category}/${route}` for a regular page; just `${category}` for a
// category-root page (page.route === '').
const pluginRoutePath = (page: PluginPage): string => {
  const category = categoryKeyFor(page);
  return page.route ? `/${category}/${page.route}` : `/${category}`;
};

/**
 * Set the breadcrumb shown in the AppBar to the plugin's page label, so we
 * render e.g. "Stock aging" instead of the raw URL segment. useBreadcrumbs
 * skips the first URL segment for shallow routes (the same way built-in
 * pages show "Stock" rather than "Inventory > Stock"), so the single
 * visible crumb sits at index 0.
 *
 * `useBreadcrumbs` internally clears `customBreadcrumbs` on every `pathname`
 * change, and this component stays mounted across navigations within the
 * plugin's wildcard route subtree (e.g. list ↔ detail). So we add
 * `pathname` to the effect deps to re-set our crumb after every internal
 * navigation — otherwise the breadcrumb collapses to the raw URL segment
 * on the way back from a detail view.
 */
const PluginBreadcrumbs: React.FC<{ pageLabel: string }> = ({ pageLabel }) => {
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { pathname } = useLocation();
  // Custom breadcrumbs are rendered verbatim, so translate the plugin label
  // before setting it (see usePluginLabelTranslation / #12090).
  const label = t(pageLabel as LocaleKey);

  useEffect(() => {
    setCustomBreadcrumbs({ 0: label });
  }, [label, setCustomBreadcrumbs, pathname]);

  return null;
};

/**
 * Returns `<Route>` children for every registered plugin page. Rendered
 * inside the top-level `<Routes>` in Site.tsx; React Router picks these
 * static paths over the wildcard category routers by specificity.
 *
 * The trailing `/*` lets a plugin page host its own React Router and own
 * any subpaths beneath its registered route — useful for list → detail
 * style flows where the plugin framework's single-segment `route` rule
 * would otherwise require a second top-level `PluginPage` registration.
 */
export const usePluginRoutes = (): React.ReactNode => {
  const { plugins } = usePluginProvider();

  return (plugins.pages ?? [])
    .filter(page => !!page.pluginCode)
    .map(page => {
      const path = pluginRoutePath(page);
      const Component = page.Component;
      return (
        <Route
          key={path}
          path={`${path}/*`}
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
