import React, { FC } from 'react';
import {
  RouteBuilder,
  Routes,
  Route,
  useIsExtraSmallScreen,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { SensorListView } from './Sensor';
import { ListView as MonitoringListView } from './Monitoring/ListView';
import { EquipmentListView } from './Equipment/ListView';
import { EquipmentDetailView } from './Equipment/DetailView';
import { EquipmentDetailView as MobileEquipmentDetailView } from './Mobile/Equipment/DetailView/DetailView';
import { MobileTemperatureChart } from './Mobile/Monitoring/MobileTemperatureChart';

export const ColdchainService: FC = () => {
  const monitoringRoute = RouteBuilder.create(AppRoute.Monitoring).build();
  const sensorRoute = RouteBuilder.create(AppRoute.Sensors).build();
  const equipmentListRoute = RouteBuilder.create(AppRoute.Equipment).build();
  const equipmentRoute = RouteBuilder.create(AppRoute.Equipment)
    .addPart(':id')
    .build();
  const isExtraSmallScreen = useIsExtraSmallScreen();

  return (
    <Routes>
      <Route
        path={monitoringRoute}
        element={!isExtraSmallScreen ? <MonitoringListView /> : <MobileTemperatureChart />}
      />
      <Route path={sensorRoute} element={<SensorListView />} />
      <Route path={equipmentListRoute} element={<EquipmentListView />} />
      <Route
        path={equipmentRoute}
        element={
          !isExtraSmallScreen ? <EquipmentDetailView /> : <MobileEquipmentDetailView />
        }
      />
    </Routes>
  );
};

