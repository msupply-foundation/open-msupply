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
} from '@openmsupply-client/common';
import { InvoiceIcon } from '@common/icons';
import { AppRoute } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const ProgramsNav = ({ store }: { store?: UserStoreNodeFragment }) => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Programs).addWildCard().build()
  );
  const t = useTranslation('app');
  const isCentralServer = useIsCentralServerApi();
  const immunisationsVisible = isCentralServer && store?.preferences.vaccineModule;
  const rnrVisible = store?.preferences.omProgramModule;

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Programs}>
      <AppNavLink
        visible={immunisationsVisible || rnrVisible}
        end={false}
        to={AppRoute.Programs}
        icon={<InvoiceIcon color="primary" fontSize="small" />}
        text={t('programs')}
        inactive
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            visible={immunisationsVisible}
            end
            to={RouteBuilder.create(AppRoute.Programs)
              .addPart(AppRoute.ImmunisationPrograms)
              .build()}
            text={t('label.programs-immunisations')}
          />
          <AppNavLink
            visible={rnrVisible}
            end
            to={RouteBuilder.create(AppRoute.Programs)
              .addPart(AppRoute.RnRForms)
              .build()}
            text={t('r-and-r-forms')}
          />
        </List>
      </Collapse>
    </AppNavSection>
  );
};
