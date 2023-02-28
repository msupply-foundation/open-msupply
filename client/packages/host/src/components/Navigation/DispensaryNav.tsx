import React, { FC } from 'react';
import {
  CustomersIcon,
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  AppNavSection,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const DispensaryNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Dispensary).addWildCard().build()
  );
  const t = useTranslation('app');

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Dispensary}>
      <AppNavLink
        end={false}
        to={AppRoute.Dispensary}
        icon={<CustomersIcon color="primary" fontSize="small" />}
        text={t('dispensary')}
        inactive
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Patients)
              .build()}
            text={t('patients')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Encounter)
              .build()}
            text={t('encounter')}
          />
          <AppNavLink
            end
            to={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Reports)
              .build()}
            text={t('reports')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
