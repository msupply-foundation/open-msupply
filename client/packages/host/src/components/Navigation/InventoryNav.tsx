import React, { FC } from 'react';
import {
  StockIcon,
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  NavLink,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const InventoryNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Inventory).addWildCard().build()
  );
  const t = useTranslation('app');

  return (
    <>
      <NavLink
        end={false}
        to={AppRoute.Inventory}
        icon={<StockIcon color="primary" fontSize="small" />}
        expandOnHover
        text={t('inventory')}
      />
      <Collapse in={isActive}>
        <List>
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Inventory)
              .addPart(AppRoute.Stock)
              .build()}
            text={t('stock')}
          />
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Inventory)
              .addPart(AppRoute.Stocktake)
              .build()}
            text={t('stocktake')}
          />
        </List>
      </Collapse>
    </>
  );
};
