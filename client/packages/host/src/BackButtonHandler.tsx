import React from 'react';

import { useBackButtonHandler } from '@common/hooks';
import { AppRoute } from '@openmsupply-client/config';
import {
  RouteBuilder,
  matchPath,
  useLocation,
} from '@openmsupply-client/common';

export const BackButtonHandler = () => {
  const location = useLocation();
  const isRouteMatch = (route: string) =>
    matchPath(
      RouteBuilder.create(route).addWildCard().build(),
      location.pathname
    ) !== null;

  const isPageMatch = (route: string) =>
    matchPath(RouteBuilder.create(route).build(), location.pathname) !== null;

  const isNavigateEnabled = (() => {
    if (isPageMatch(AppRoute.Android)) return false;
    if (isPageMatch(AppRoute.Discovery)) return false;
    if (isRouteMatch(AppRoute.Login)) return false;
    if (isRouteMatch(AppRoute.Initialise)) return false;

    return true;
  })();

  useBackButtonHandler({
    isNavigateEnabled,
  });

  return <></>;
};
