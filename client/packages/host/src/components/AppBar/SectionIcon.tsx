import React from 'react';
import {
  CustomersIcon,
  HelpIcon,
  InvoiceIcon,
  ListIcon,
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
  resolvePluginIcon,
  RouteBuilder,
  Tooltip,
  useLocation,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { usePluginNewCategories } from '../Navigation/usePluginNavLinks';

type Section = {
  icon: JSX.Element;
  title: string;
};

const getIcon = (section?: AppRoute) => {
  switch (section) {
    case AppRoute.Settings:
      return <SettingsIcon color="primary" fontSize="small" />;
    case AppRoute.Help:
      return <HelpIcon color="primary" fontSize="small" />;
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
    case AppRoute.Manage:
      return <SlidersIcon color="primary" fontSize="small" />;
    case AppRoute.Programs:
      return <InvoiceIcon color="primary" fontSize="small" />;
    default:
      return undefined;
  }
};

const useSection = (): Section | undefined => {
  const t = useTranslation();
  const routes = [
    AppRoute.Settings,
    AppRoute.Help,
    AppRoute.Catalogue,
    AppRoute.Coldchain,
    AppRoute.Dispensary,
    AppRoute.Distribution,
    AppRoute.Inventory,
    AppRoute.Replenishment,
    AppRoute.Reports,
    AppRoute.Manage,
    AppRoute.Programs,
  ];
  const location = useLocation();
  const pluginCategories = usePluginNewCategories();

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const match = matchPath(
      RouteBuilder.create(route ?? '')
        .addWildCard()
        .build(),
      location.pathname
    );
    if (!match) continue;
    const icon = getIcon(route);
    if (!icon) continue;
    return { icon, title: t(route as LocaleKey) };
  }

  for (const category of pluginCategories) {
    const match = matchPath(
      RouteBuilder.create(category.key).addWildCard().build(),
      location.pathname
    );
    if (!match) continue;
    return {
      icon: resolvePluginIcon(category.icon),
      title: category.label,
    };
  }

  return undefined;
};

export const SectionIcon: React.FC = () => {
  const section = useSection();

  if (!section) return null;

  return (
    <Tooltip title={section.title}>
      <div>{section.icon}</div>
    </Tooltip>
  );
};
