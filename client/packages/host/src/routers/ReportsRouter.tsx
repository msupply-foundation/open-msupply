import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const ReportRouter = React.lazy(
  () => import('@openmsupply-client/reports/src/ReportsService')
);

const fullReportsPath = RouteBuilder.create(AppRoute.Reports)
  .addWildCard()
  .build();

export const ReportsRouter: FC = () => {
  const goToReports = useMatch(fullReportsPath);
  if (goToReports) {
    return <ReportRouter />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
