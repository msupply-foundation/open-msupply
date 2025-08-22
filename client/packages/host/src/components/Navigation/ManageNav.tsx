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
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Manage).addWildCard().build()
  );
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const vaccineModuleEnabled = store?.preferences.vaccineModule;
  const { userHasPermission } = useAuthContext();
  const isServerAdmin = userHasPermission(UserPermission.ServerAdmin);

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Manage}>
      <AppNavLink
        visible={isCentralServer}
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
            visible={isCentralServer && vaccineModuleEnabled}
            end
            to={RouteBuilder.create(AppRoute.Manage)
              .addPart(AppRoute.IndicatorsDemographics)
              .build()}
            text={t('indicators-demographics')}
          />
          <AppNavLink
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
          <AppNavLink
            visible={isCentralServer && isServerAdmin}
            end
            to={RouteBuilder.create(AppRoute.Manage)
              .addPart(AppRoute.SyncMessage)
              .build()}
            text={t('sync-message')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
