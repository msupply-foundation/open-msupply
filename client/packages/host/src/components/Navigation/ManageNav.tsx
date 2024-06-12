import React, { FC } from 'react';
import {
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  AppNavSection,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import { SlidersIcon } from '@common/icons';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const ManageNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Manage).addWildCard().build()
  );
  const t = useTranslation('app');
  const isCentralServer = useIsCentralServerApi();

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
              .addPart(AppRoute.Facilities)
              .build()}
            text={t('facilities')}
          />
          <AppNavLink
            visible={isCentralServer && Environment.FEATURE_GAPS}
            end
            to={RouteBuilder.create(AppRoute.Manage)
              .addPart(AppRoute.IndicatorsDemographics)
              .build()}
            text={t('indicators-demographics')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
