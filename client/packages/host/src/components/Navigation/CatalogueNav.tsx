import React from 'react';
import {
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  ListIcon,
  AppNavSection,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const CatalogueNav = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Catalogue).addWildCard().build()
  );
  const t = useTranslation();

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Catalogue}>
      <AppNavLink
        isParent
        to={AppRoute.Catalogue}
        icon={<ListIcon color="primary" style={{ width: 20 }} />}
        text={t('catalogue')}
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            to={RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.Assets)
              .build()}
            text={t('assets')}
          />
          <AppNavLink
            to={RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.Items)
              .build()}
            text={t('items')}
          />
          <AppNavLink
            to={RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.MasterLists)
              .build()}
            text={t('master-lists')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
