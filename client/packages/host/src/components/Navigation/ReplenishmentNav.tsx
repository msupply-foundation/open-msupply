import React, { FC } from 'react';

import {
  SuppliersIcon,
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const ReplenishmentNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Replenishment).addWildCard().build()
  );
  const t = useTranslation('app');

  return (
    <>
      <AppNavLink
        end={false}
        to={AppRoute.Replenishment}
        icon={<SuppliersIcon color="primary" fontSize="small" />}
        expandOnHover
        text={t('replenishment')}
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.InboundShipment)
              .build()}
            text={t('inbound-shipment')}
          />
          <AppNavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.InternalOrder)
              .build()}
            text={t('internal-order')}
          />

          <AppNavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.Suppliers)
              .build()}
            text={t('suppliers')}
          />
        </List>
      </Collapse>
    </>
  );
};
