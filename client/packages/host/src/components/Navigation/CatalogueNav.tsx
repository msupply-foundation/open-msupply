import React from 'react';
import {
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  ListIcon,
  AppNavSection,
  useIsCentralServerApi,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const CatalogueNav = ({ store }: { store?: UserStoreNodeFragment }) => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Catalogue).addWildCard().build()
  );
  const t = useTranslation('app');
  const isCentralServer = useIsCentralServerApi();
  const vaccineModuleEnabled = store?.preferences.vaccineModule;

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Catalogue}>
      <AppNavLink
        end={false}
        to={AppRoute.Catalogue}
        icon={<ListIcon color="primary" style={{ width: 20 }} />}
        text={t('catalogue')}
        inactive
      />
      <Collapse in={isActive}>
        <List>
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
            to={RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.IndicatorsDemographics)
              .build()}
            text={t('indicators-demographics')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
