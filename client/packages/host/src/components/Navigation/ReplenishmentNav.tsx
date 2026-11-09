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
  useAuthContext,
  UserPermission,
  useIsExtraSmallScreen,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';
import { usePluginNavLinksForCategory } from './usePluginNavLinks';

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
  const { userHasPermission } = useAuthContext();
  const canReadPurchaseOrders = userHasPermission(
    UserPermission.PurchaseOrderQuery
  );
  const isExtraSmallScreen = useIsExtraSmallScreen();
  const pluginLinks = usePluginNavLinksForCategory(AppRoute.Replenishment);

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Replenishment}>
      <AppNavLink
        to={AppRoute.Replenishment}
        icon={<SuppliersIcon color="primary" fontSize="small" />}
        text={t('replenishment')}
        isParent
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            visible={canReadPurchaseOrders && !isExtraSmallScreen}
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.PurchaseOrder)
              .build()}
            text={t('purchase-order')}
          />
          <AppNavLink
            visible={!isExtraSmallScreen}
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
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.SupplierReturn)
              .build()}
            text={t('supplier-returns')}
          />
          <AppNavLink
            visible={rnrVisible && !isExtraSmallScreen}
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
          {pluginLinks}
        </List>
      </Collapse>
    </AppNavSection>
  );
};
