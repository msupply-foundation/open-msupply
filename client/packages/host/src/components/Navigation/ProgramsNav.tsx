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
import { AppRoute, Environment } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';
import { PowerIcon } from '@openmsupply-client/common/src/ui/icons/Power';

export const ProgramsNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Programs).addWildCard().build()
  );
  const t = useTranslation('app');
  const isCentralServer = useIsCentralServerApi();
  const visible = isCentralServer;

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Programs}>
      <AppNavLink
        visible={visible}
        end={false}
        to={AppRoute.Programs}
        icon={<PowerIcon color="primary" fontSize="small" />}
        text={t('programs')}
        inactive
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            visible={isCentralServer && Environment.FEATURE_GAPS}
            end
            to={RouteBuilder.create(AppRoute.Programs)
              .addPart(AppRoute.Immunisations)
              .build()}
            text={t('label.programs-immunisations')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
