import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ListView } from './Sensor/ListView';
import { ListView as MonitoringListView } from './Monitoring/ListView';

export const ColdchainService: FC = () => {
  const monitoringRoute = RouteBuilder.create(AppRoute.Monitoring).build();
  const sensorRoute = RouteBuilder.create(AppRoute.Sensors).build();

  return (
    <Routes>
      <Route path={monitoringRoute} element={<MonitoringListView />} />
      <Route path={sensorRoute} element={<ListView />} />
    </Routes>
  );
};

export default ColdchainService;
