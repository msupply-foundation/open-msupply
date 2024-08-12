import React from 'react';

import {
  SuppliersIcon,
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  AppNavSection,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const ReplenishmentNav = ({
  store,
}: {
  store?: UserStoreNodeFragment;
}) => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Replenishment).addWildCard().build()
  );
  const t = useTranslation('app');
  const rnrVisible = store?.preferences.omProgramModule;

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
              .addPart(AppRoute.SupplierReturn)
              .build()}
            text={t('supplier-returns')}
          />
          <AppNavLink
            visible={rnrVisible}
            end
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.RnRForms)
              .build()}
            text={t('r-and-r-forms')}
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
