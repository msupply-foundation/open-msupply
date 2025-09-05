import React from 'react';
import {
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  AppNavSection,
  useIsCentralServerApi,
  UserStoreNodeFragment,
  UserPermission,
  useAuthContext,
} from '@openmsupply-client/common';
import { SlidersIcon } from '@common/icons';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const ManageNav = ({ store }: { store?: UserStoreNodeFragment }) => {
  const isManageActive = useNestedNav(
    RouteBuilder.create(AppRoute.Manage).addWildCard().build()
  ).isActive;
  const isCatalogueActive = useNestedNav(
    RouteBuilder.create(AppRoute.Catalogue).addWildCard().build()
  ).isActive;
  const isActive = isManageActive || isCatalogueActive;
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const vaccineModuleEnabled = store?.preferences.vaccineModule;
  const { userHasPermission } = useAuthContext();
  const isServerAdmin = userHasPermission(UserPermission.ServerAdmin);

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Manage}>
      <AppNavLink
        end={false}
        to={AppRoute.Manage}
        icon={<SlidersIcon color="primary" fontSize="small" />}
        text={t('manage')}
        inactive
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            visible={isCentralServer}
            end
            to={RouteBuilder.create(AppRoute.Manage)
              .addPart(AppRoute.Stores)
              .build()}
            text={t('stores')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.Assets)
              .build()}
            text={t('assets')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.Items)
              .build()}
            text={t('items')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.MasterLists)
              .build()}
            text={t('master-lists')}
          />

          <AppNavLink
            visible={isCentralServer && vaccineModuleEnabled}
            end
            to={RouteBuilder.create(AppRoute.Manage)
              .addPart(AppRoute.IndicatorsDemographics)
              .build()}
            text={t('indicators-demographics')}
          />
          <AppNavLink
            visible={isCentralServer}
            end
            to={RouteBuilder.create(AppRoute.Manage)
              .addPart(AppRoute.GlobalPreferences)
              .build()}
            text={t('global-preferences')}
          />
          <AppNavLink
            visible={isCentralServer && vaccineModuleEnabled}
            end
            to={RouteBuilder.create(AppRoute.Manage)
              .addPart(AppRoute.Equipment)
              .build()}
            text={t('equipment')}
          />
          <AppNavLink
            visible={isCentralServer}
            end
            to={RouteBuilder.create(AppRoute.Manage)
              .addPart(AppRoute.Campaigns)
              .build()}
            text={t('campaigns')}
          />
          <AppNavLink
            visible={isCentralServer && isServerAdmin}
            end
            to={RouteBuilder.create(AppRoute.Manage)
              .addPart(AppRoute.Reports)
              .build()}
            text={t('reports')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
