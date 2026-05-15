import React, { useMemo } from 'react';
import {
  AppNavLink,
  PluginIcon,
  PluginPage,
  useAuthContext,
  usePluginProvider,
  UserPermission,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const pluginPagePath = (categoryKey: string, page: PluginPage) =>
  `/${categoryKey}/${page.route}`;

const hasAllPermissions = (
  permissions: UserPermission[] | undefined,
  userHasPermission: (p: UserPermission) => boolean
) => !permissions?.length || permissions.every(userHasPermission);

const PluginNavLink: React.FC<{ to: string; label: string }> = ({
  to,
  label,
}) => <AppNavLink to={to} text={label} />;

/**
 * Plugin nav links targeting an existing category. Render inside that
 * category's `<Collapse>` list.
 */
export const usePluginNavLinksForCategory = (
  appRoute: AppRoute
): React.ReactNode[] => {
  const { plugins } = usePluginProvider();
  const { userHasPermission } = useAuthContext();

  return (plugins.pages ?? [])
    .filter(
      page =>
        page.pluginCode &&
        page.menu.category.type === 'existing' &&
        page.menu.category.appRoute === appRoute &&
        hasAllPermissions(page.menu.permissions, userHasPermission)
    )
    .map(page => (
      <PluginNavLink
        key={`${page.pluginCode}/${page.route}`}
        to={pluginPagePath(appRoute, page)}
        label={page.menu.label}
      />
    ));
};

export type PluginNewCategory = {
  key: string;
  label: string;
  icon?: PluginIcon;
  order: number;
  pages: PluginPage[];
};

/**
 * Returns `type: 'new'` plugin categories, grouped by key and ordered.
 * Category-level metadata (label/icon/order) is taken from the first page
 * that declared the category; subsequent pages with the same key contribute
 * only their own page entry.
 */
export const usePluginNewCategories = (): PluginNewCategory[] => {
  const { plugins } = usePluginProvider();

  return useMemo(() => {
    const byKey = new Map<string, PluginNewCategory>();
    for (const page of plugins.pages ?? []) {
      if (!page.pluginCode) continue;
      if (page.menu.category.type !== 'new') continue;
      const cat = page.menu.category;
      const existing = byKey.get(cat.key);
      if (existing) {
        existing.pages.push(page);
      } else {
        byKey.set(cat.key, {
          key: cat.key,
          label: cat.label,
          icon: cat.icon,
          order: cat.order ?? 1000,
          pages: [page],
        });
      }
    }
    return [...byKey.values()].sort(
      (a, b) => a.order - b.order || a.key.localeCompare(b.key)
    );
  }, [plugins.pages]);
};

export { pluginPagePath, PluginNavLink, hasAllPermissions };
