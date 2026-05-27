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
import { usePluginNavLinksForCategory } from './usePluginNavLinks';

export const ProgramsNav = ({ store }: { store?: UserStoreNodeFragment }) => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Programs).addWildCard().build()
  );
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const immunisationsVisible =
    isCentralServer && store?.preferences.vaccineModule;
  const pluginLinks = usePluginNavLinksForCategory(AppRoute.Programs);

  return (
    <AppNavSection isActive={isActive} to={AppRoute.Programs}>
      <AppNavLink
        visible={immunisationsVisible}
        isParent
        to={AppRoute.Programs}
        icon={<InvoiceIcon color="primary" fontSize="small" />}
        text={t('programs')}
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            visible={immunisationsVisible}
            to={RouteBuilder.create(AppRoute.Programs)
              .addPart(AppRoute.ImmunisationPrograms)
              .build()}
            text={t('label.programs-immunisations')}
          />
          {pluginLinks}
        </List>
      </Collapse>
    </AppNavSection>
  );
};
