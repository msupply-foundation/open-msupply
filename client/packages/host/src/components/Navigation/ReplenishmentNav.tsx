import React, { FC } from 'react';

import {
  SuppliersIcon,
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  AppNavSection,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const ReplenishmentNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Replenishment).addWildCard().build()
  );
  const t = useTranslation('app');

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Replenishment}>
      <AppNavLink
        end={false}
        to={AppRoute.Replenishment}
        icon={<SuppliersIcon color="primary" fontSize="small" />}
        text={t('replenishment')}
        inactive
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.InboundShipment)
              .build()}
            text={t('inbound-shipment')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.InternalOrder)
              .build()}
            text={t('internal-order')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.OutboundReturn)
              .build()}
            text={t('outbound-return')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.Suppliers)
              .build()}
            text={t('suppliers')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
