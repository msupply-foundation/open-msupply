import React, { FC } from 'react';
import {
  TruckIcon,
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  NavLink,
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
      <NavLink
        end={false}
        to={AppRoute.Distribution}
        icon={<TruckIcon color="primary" fontSize="small" />}
        expandOnHover
        text={t('distribution')}
      />
      <Collapse in={isActive}>
        <List>
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.OutboundShipment)
              .build()}
            text={t('outbound-shipment')}
          />
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.CustomerRequisition)
              .build()}
            text={t('customer-requisition')}
          />
          <NavLink
            end
            expandOnHover
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
