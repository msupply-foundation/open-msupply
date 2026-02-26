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
  useIsExtraSmallScreen,
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
  const visible = store?.preferences.vaccineModule ?? false;
  const isExtraSmallScreen = useIsExtraSmallScreen();

  return (
    <AppNavSection
      isActive={isExtraSmallScreen ? isExtraSmallScreen : isActive}
      to={AppRoute.Coldchain}
    >
      <AppNavLink
        visible={visible}
        isParent
        to={AppRoute.Coldchain}
        icon={<ThermometerIcon color="primary" fontSize="small" />}
        text={t('cold-chain')}
      />
      <Collapse in={isExtraSmallScreen ? isExtraSmallScreen : isActive}>
        <List>
          <AppNavLink
            visible={visible}
            to={RouteBuilder.create(AppRoute.Coldchain)
              .addPart(AppRoute.Equipment)
              .build()}
            text={t('equipment')}
          />
          {!isExtraSmallScreen && (
            <>
              <AppNavLink
                visible={visible}
                to={RouteBuilder.create(AppRoute.Coldchain)
                  .addPart(AppRoute.Monitoring)
                  .build()}
                text={t('monitoring')}
              />
              <AppNavLink
                visible={visible}
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
