import React, { FC } from 'react';
import { Navigate, useMatch } from 'react-router-dom';
import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const DashboardService = React.lazy(
  () => import('@openmsupply-client/dashboard/src/DashboardService')
);

const fullDashboardPath = RouteBuilder.create(AppRoute.Dashboard)
.build();

export const DashboardRouter: FC = () => {
  if (useMatch(fullDashboardPath)) {
    return <DashboardService />;
  } else {
    const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
    return <Navigate to={notFoundRoute} />;
  }
};
