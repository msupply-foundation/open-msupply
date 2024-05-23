import React, { FC } from 'react';
import {
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  AppNavSection,
  SettingsIcon,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const ManageNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Manage).addWildCard().build()
  );
  const t = useTranslation('app');

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Manage}>
      <AppNavLink
        end={false}
        to={AppRoute.Manage}
        icon={<SettingsIcon color="primary" fontSize="small" />}
        text={t('manage')}
        inactive
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Manage)
              .addPart(AppRoute.Facilities)
              .build()}
            text={t('facilities')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
