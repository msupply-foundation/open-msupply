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
  usePreferences,
  useIsExtraSmallScreen,
  useAuthContext,
  UserPermission,
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
  const { useProcurementFunctionality } = usePreferences();
  const useProcurement = useProcurementFunctionality;
  const isExtraSmallScreen = useIsExtraSmallScreen();
  const { userHasPermission } = useAuthContext();

  const hasInboundShipmentPermission =
    userHasPermission(UserPermission.InboundShipmentQuery) ||
    userHasPermission(UserPermission.InboundShipmentMutate) ||
    userHasPermission(UserPermission.InboundShipmentVerify) ||
    userHasPermission(UserPermission.InboundShipmentExternalQuery) ||
    userHasPermission(UserPermission.InboundShipmentExternalMutate) ||
    userHasPermission(UserPermission.InboundShipmentExternalAuthorise);

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
            visible={useProcurement && !isExtraSmallScreen}
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
            visible={hasInboundShipmentPermission}
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
        </List>
      </Collapse>
    </AppNavSection>
  );
};
