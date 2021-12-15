import React, { FC } from 'react';
import {
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  ListIcon,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const CatalogueNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Catalogue).addWildCard().build()
  );
  const t = useTranslation('app');

  return (
    <>
      <AppNavLink
        end={false}
        to={AppRoute.Catalogue}
        icon={<ListIcon color="primary" />}
        expandOnHover
        text={t('catalogue')}
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.Items)
              .build()}
            text={t('items')}
          />
        </List>
      </Collapse>
    </>
  );
};
