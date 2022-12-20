import React, { FC } from 'react';
import {
  StockIcon,
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  AppNavSection,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const InventoryNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Inventory).addWildCard().build()
  );
  const t = useTranslation('app');

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Inventory}>
      <AppNavLink
        end={false}
        to={AppRoute.Inventory}
        icon={<StockIcon color="primary" fontSize="small" />}
        text={t('inventory')}
        inactive
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Inventory)
              .addPart(AppRoute.Locations)
              .build()}
            text={t('locations')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Inventory)
              .addPart(AppRoute.Stock)
              .build()}
            text={t('stock')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Inventory)
              .addPart(AppRoute.Stocktakes)
              .build()}
            text={t('stocktakes')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
