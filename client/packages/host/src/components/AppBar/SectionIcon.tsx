import React from 'react';
import {
  ListIcon,
  LocaleKey,
  matchPath,
  ReportsIcon,
  RouteBuilder,
  StockIcon,
  SuppliersIcon,
  Tooltip,
  TruckIcon,
  useLocation,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const getSection = () => {
  const routes = [
    AppRoute.Catalogue,
    AppRoute.Distribution,
    AppRoute.Inventory,
    AppRoute.Replenishment,
    AppRoute.Reports,
  ];
  const location = useLocation();

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const match = matchPath(
      RouteBuilder.create(route ?? '')
        .addWildCard()
        .build(),
      location.pathname
    );
    if (!!match) return route;
  }
  return undefined;
};

export const SectionIcon: React.FC = () => {
  const t = useTranslation('app');
  const section = getSection();
  const icon = getIcon(section);

  return icon ? (
    <Tooltip title={t(section as LocaleKey)}>
      <div>{icon}</div>
    </Tooltip>
  ) : null;
};

const getIcon = (section?: AppRoute) => {
  switch (section) {
    case AppRoute.Catalogue:
      return <ListIcon color="primary" fontSize="small" />;
    case AppRoute.Distribution:
      return <TruckIcon color="primary" fontSize="small" />;
    case AppRoute.Inventory:
      return <StockIcon color="primary" fontSize="small" />;
    case AppRoute.Replenishment:
      return <SuppliersIcon color="primary" fontSize="small" />;
    case AppRoute.Reports:
      return <ReportsIcon color="primary" fontSize="small" />;
    default:
      return undefined;
  }
};
