import React, { FC } from 'react';
import {
  TruckIcon,
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  AppNavSection,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const DistributionNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Distribution).addWildCard().build()
  );
  const t = useTranslation();

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Distribution}>
      <AppNavLink
        isParent
        to={AppRoute.Distribution}
        icon={<TruckIcon color="primary" fontSize="small" />}
        text={t('distribution')}
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.CustomerRequisition)
              .build()}
            text={t('customer-requisition')}
          />
          <AppNavLink
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.OutboundShipment)
              .build()}
            text={t('outbound-shipment')}
          />
          <AppNavLink
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.CustomerReturn)
              .build()}
            text={t('customer-returns')}
          />
          <AppNavLink
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.Customer)
              .build()}
            text={t('customers')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
