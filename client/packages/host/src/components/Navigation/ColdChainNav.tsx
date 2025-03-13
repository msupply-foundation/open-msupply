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
  const isGapsStore = useIsGapsStoreOnly();

  return (
    <AppNavSection isActive={isGapsStore ? isGapsStore : isActive} to={AppRoute.Coldchain}>
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
        </List>
      </Collapse>
    </AppNavSection>
  );
};
