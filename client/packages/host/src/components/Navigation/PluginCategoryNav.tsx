import React from 'react';
import {
  AppNavLink,
  AppNavSection,
  Collapse,
  List,
  resolvePluginIcon,
  useAuthContext,
} from '@openmsupply-client/common';
import { useNestedNav } from './useNestedNav';
import {
  hasAllPermissions,
  PluginNavLink,
  pluginPagePath,
  PluginNewCategory,
} from './usePluginNavLinks';

export const PluginCategoryNav: React.FC<{ category: PluginNewCategory }> = ({
  category,
}) => {
  const { userHasPermission } = useAuthContext();
  const visiblePages = category.pages.filter(page =>
    hasAllPermissions(page.menu.permissions, userHasPermission)
  );
  const { isActive } = useNestedNav(`/${category.key}/*`);

  if (!visiblePages.length) return null;

  const categoryPath = `/${category.key}`;

  return (
    <AppNavSection isActive={isActive} to={categoryPath}>
      <AppNavLink
        isParent
        to={categoryPath}
        icon={resolvePluginIcon(category.icon)}
        text={category.label}
      />
      <Collapse in={isActive}>
        <List>
          {visiblePages.map(page => (
            <PluginNavLink
              key={`${page.pluginCode}/${page.route}`}
              to={pluginPagePath(category.key, page)}
              label={page.menu.label}
            />
          ))}
        </List>
      </Collapse>
    </AppNavSection>
  );
};
