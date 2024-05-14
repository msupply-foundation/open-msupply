import React, { FC } from 'react';
import {
  CustomersIcon,
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  AppNavSection,
  UserStoreNodeFragment,
  StoreModeNodeType,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export interface DispensaryNavProps {
  store?: UserStoreNodeFragment;
}

export const DispensaryNav: FC<DispensaryNavProps> = ({ store }) => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Dispensary).addWildCard().build()
  );
  const t = useTranslation('app');
  const visible = store?.storeMode === StoreModeNodeType.Dispensary;
  const isProgramModule = store?.preferences.omProgramModule;

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Dispensary}>
      <AppNavLink
        visible={visible}
        end={false}
        to={AppRoute.Dispensary}
        icon={<CustomersIcon color="primary" fontSize="small" />}
        text={t('dispensary')}
        inactive
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            visible={visible}
            end
            to={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Patients)
              .addQuery({ sort: 'code' })
              .build()}
            text={t('patients')}
          />
          <AppNavLink
            visible={visible}
            end
            to={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Prescription)
              .build()}
            text={t('prescription')}
          />
          <AppNavLink
            visible={isProgramModule}
            end
            to={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Encounter)
              .build()}
            text={t('encounter')}
          />
          <AppNavLink
            visible={isProgramModule}
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
