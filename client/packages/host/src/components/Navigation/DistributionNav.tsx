import React, { FC } from 'react';
import {
  TruckIcon,
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const DistributionNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Distribution).addWildCard().build()
  );
  const t = useTranslation('app');

  return (
    <>
      <AppNavLink
        end={false}
        to={AppRoute.Distribution}
        icon={<TruckIcon color="primary" fontSize="small" />}
        text={t('distribution')}
        inactive
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.OutboundShipment)
              .build()}
            text={t('outbound-shipment')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.CustomerRequisition)
              .build()}
            text={t('customer-requisition')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.Customer)
              .build()}
            text={t('customers')}
          />
        </List>
      </Collapse>
    </>
  );
};
