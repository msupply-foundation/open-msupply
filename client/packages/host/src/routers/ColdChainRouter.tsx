import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const ColdChainService = React.lazy(
  () => import('@openmsupply-client/coldchain/src/ColdchainService')
);

const fullMonitoringPath = RouteBuilder.create(AppRoute.Coldchain)
  .addPart(AppRoute.Monitoring)
  .addWildCard()
  .build();

const fullSensorPath = RouteBuilder.create(AppRoute.Coldchain)
  .addPart(AppRoute.Sensors)
  .addWildCard()
  .build();

export const ColdChainRouter: FC = () => {
  const gotoSensor = useMatch(fullSensorPath);
  const gotoMonitoring = useMatch(fullMonitoringPath);

  if (gotoMonitoring) {
    return <ColdChainService />;
  }

  if (gotoSensor) {
    return <ColdChainService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
