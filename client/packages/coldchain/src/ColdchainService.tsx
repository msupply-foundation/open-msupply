import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ListView } from './Sensor/ListView';
import { ListView as MonitoringListView } from './Monitoring/ListView';
import { EquipmentListView } from './Equipment/ListView';

export const ColdchainService: FC = () => {
  const monitoringRoute = RouteBuilder.create(AppRoute.Monitoring).build();
  const sensorRoute = RouteBuilder.create(AppRoute.Sensors).build();
  const equipmentListRoute = RouteBuilder.create(AppRoute.Equipment).build();
  // const equipmentRoute = RouteBuilder.create(AppRoute.Assets)
  //   .addPart(':id')
  //   .build();

  return (
    <Routes>
      <Route path={monitoringRoute} element={<MonitoringListView />} />
      <Route path={sensorRoute} element={<ListView />} />
      <Route path={equipmentListRoute} element={<EquipmentListView />} />
      {/* <Route path={equipmentRoute} element={<AssetDetailView />} /> */}
    </Routes>
  );
};

export default ColdchainService;
