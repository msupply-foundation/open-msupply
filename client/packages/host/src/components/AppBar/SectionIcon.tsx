import React from 'react';
import {
  CustomersIcon,
  InvoiceIcon,
  ListIcon,
  RadioIcon,
  ReportsIcon,
  SettingsIcon,
  SlidersIcon,
  StockIcon,
  SuppliersIcon,
  ThermometerIcon,
  TruckIcon,
} from '@common/icons';
import {
  LocaleKey,
  matchPath,
  RouteBuilder,
  Tooltip,
  useLocation,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

type Section = {
  icon?: JSX.Element;
  titleKey: LocaleKey;
};

const getIcon = (section?: AppRoute) => {
  switch (section) {
    case AppRoute.Settings:
      return <SettingsIcon color="primary" fontSize="small" />;
    case AppRoute.Catalogue:
      return <ListIcon color="primary" fontSize="small" />;
    case AppRoute.Coldchain:
      return <ThermometerIcon color="primary" fontSize="small" />;
    case AppRoute.Dispensary:
      return <CustomersIcon color="primary" fontSize="small" />;
    case AppRoute.Distribution:
      return <TruckIcon color="primary" fontSize="small" />;
    case AppRoute.Inventory:
      return <StockIcon color="primary" fontSize="small" />;
    case AppRoute.Replenishment:
      return <SuppliersIcon color="primary" fontSize="small" />;
    case AppRoute.Reports:
      return <ReportsIcon color="primary" fontSize="small" />;
    case AppRoute.Sync:
      return <RadioIcon color="primary" fontSize="small" />;
    case AppRoute.Manage:
      return <SlidersIcon color="primary" fontSize="small" />;
    case AppRoute.Programs:
      return <InvoiceIcon color="primary" fontSize="small" />;
    default:
      return undefined;
  }
};

const useSection = (): Section | undefined => {
  const routes = [
    AppRoute.Settings,
    AppRoute.Catalogue,
    AppRoute.Coldchain,
    AppRoute.Dispensary,
    AppRoute.Distribution,
    AppRoute.Inventory,
    AppRoute.Replenishment,
    AppRoute.Reports,
    AppRoute.Sync,
    AppRoute.Manage,
    AppRoute.Programs,
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
    if (!!match)
      return {
        icon: getIcon(route),
        titleKey: route as LocaleKey,
      };
  }
  return undefined;
};

export const SectionIcon: React.FC = () => {
  const t = useTranslation('app');
  const section = useSection();

  return section?.icon ? (
    <Tooltip title={t(section?.titleKey)}>
      <div>{section.icon}</div>
    </Tooltip>
  ) : null;
};
