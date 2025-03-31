import React, { FC } from 'react';
import {
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  AppNavSection,
  ThermometerIcon,
  UserStoreNodeFragment,
  useIsGapsStoreOnly,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export interface ColdChainNavProps {
  store?: UserStoreNodeFragment;
}

export const ColdChainNav: FC<ColdChainNavProps> = ({ store }) => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Coldchain).addWildCard().build()
  );
  const t = useTranslation();
  const permission = UserPermission.AssetQuery;
  const { userHasPermission } = useAuthContext();
  const visible = (store?.preferences.vaccineModule && userHasPermission(permission)) ?? false;
  const isGapsStore = useIsGapsStoreOnly();

  return (
    <AppNavSection
      isActive={isGapsStore ? isGapsStore : isActive}
      to={AppRoute.Coldchain}
    >
      <AppNavLink
        visible={visible}
        end={false}
        to={AppRoute.Coldchain}
        icon={<ThermometerIcon color="primary" fontSize="small" />}
        text={t('cold-chain')}
        inactive
      />
      <Collapse in={isGapsStore ? isGapsStore : isActive}>
        <List>
          <AppNavLink
            visible={visible}
            end
            to={RouteBuilder.create(AppRoute.Coldchain)
              .addPart(AppRoute.Equipment)
              .build()}
            text={t('equipment')}
          />
          {!isGapsStore && (
            <>
              <AppNavLink
                visible={visible}
                end
                to={RouteBuilder.create(AppRoute.Coldchain)
                  .addPart(AppRoute.Monitoring)
                  .build()}
                text={t('monitoring')}
              />
              <AppNavLink
                visible={visible}
                end
                to={RouteBuilder.create(AppRoute.Coldchain)
                  .addPart(AppRoute.Sensors)
                  .build()}
                text={t('sensors')}
              />
            </>
          )}
        </List>
      </Collapse>
    </AppNavSection>
  );
};
