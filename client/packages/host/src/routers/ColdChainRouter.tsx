import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const SensorService = React.lazy(
  () => import('@openmsupply-client/coldchain/src/ColdchainService')
);

const fullSensorPath = RouteBuilder.create(AppRoute.Coldchain)
  .addPart(AppRoute.Sensors)
  .addWildCard()
  .build();

export const ColdChainRouter: FC = () => {
  const gotoSensor = useMatch(fullSensorPath);

  if (gotoSensor) {
    return <SensorService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
