import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const DashboardService = React.lazy(
  () => import('@openmsupply-client/dashboard/src/DashboardService')
);

const fullDashboardPath = RouteBuilder.create(AppRoute.Dashboard).build();

export const DashboardRouter: FC = () => {
  if (useMatch(fullDashboardPath)) {
    return <DashboardService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
