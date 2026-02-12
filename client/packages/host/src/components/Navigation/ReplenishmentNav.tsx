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
  useIsCentralServerApi,
  usePreferences,
  useIsExtraSmallScreen,
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
  const t = useTranslation();
  const rnrVisible = store?.preferences.omProgramModule;
  const isCentralServer = useIsCentralServerApi();
  const { useProcurementFunctionality } = usePreferences();
  const useProcurement = isCentralServer && useProcurementFunctionality;
  const isExtraSmallScreen = useIsExtraSmallScreen();

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
            visible={useProcurement && !isExtraSmallScreen}
            end
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.PurchaseOrder)
              .build()}
            text={t('purchase-order')}
          />
          <AppNavLink
            visible={useProcurement}
            end
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.GoodsReceived)
              .build()}
            text={t('goods-received')}
          />
          <AppNavLink
            visible={!isExtraSmallScreen}
            end
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.InternalOrder)
              .build()}
            text={t('internal-order')}
          />
          <AppNavLink
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.InboundShipment)
              .build()}
            text={t('inbound-shipment')}
          />
          <AppNavLink
            visible={!isExtraSmallScreen}
            end
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.SupplierReturn)
              .build()}
            text={t('supplier-returns')}
          />
          <AppNavLink
            visible={rnrVisible && !isExtraSmallScreen}
            end
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.RnRForms)
              .build()}
            text={t('r-and-r-forms')}
          />
          <AppNavLink
            visible={!isExtraSmallScreen}
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
