import React, { FC } from 'react';
import {
  Collapse,
  List,
  useTranslation,
  RouteBuilder,
  AppNavLink,
  ListIcon,
  AppNavSection,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { useNestedNav } from './useNestedNav';

export const CatalogueNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Catalogue).addWildCard().build()
  );
  const t = useTranslation('app');
  const isCentralServer = useIsCentralServerApi();

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
          {Environment.FEATURE_GAPS && (
            <AppNavLink
              visible={isCentralServer}
              end
              to={RouteBuilder.create(AppRoute.Catalogue)
                .addPart(AppRoute.Immunisations)
                .build()}
              text={t('label.programs-immunisations')}
            />
          )}
        </List>
      </Collapse>
    </AppNavSection>
  );
};
