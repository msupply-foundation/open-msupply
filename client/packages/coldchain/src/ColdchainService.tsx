import React, { FC } from 'react';
import { RouteBuilder, Routes, Route, useIsGapsStoreOnly } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ListView } from './Sensor/ListView';
import { ListView as MonitoringListView } from './Monitoring/ListView';
import { EquipmentListView } from './Equipment/ListView';
import { EquipmentDetailView } from './Equipment/DetailView';
import { CardListView } from './Mobile/Equipment/CardListView';
import { EquipmentDetailView as MobileEquipmentDetailView } from './Mobile/Equipment/DetailView/DetailView'

export const ColdchainService: FC = () => {
  const monitoringRoute = RouteBuilder.create(AppRoute.Monitoring).build();
  const sensorRoute = RouteBuilder.create(AppRoute.Sensors).build();
  const equipmentListRoute = RouteBuilder.create(AppRoute.Equipment).build();
  const equipmentRoute = RouteBuilder.create(AppRoute.Equipment)
    .addPart(':id')
    .build();
  const isGaps = useIsGapsStoreOnly();

  return (
    <Routes>
      <Route path={monitoringRoute} element={<MonitoringListView />} />
      <Route path={sensorRoute} element={<ListView />} />
      <Route path={equipmentListRoute} element={!isGaps ? <EquipmentListView /> : <CardListView />} />
      <Route path={equipmentRoute} element={!isGaps ? <EquipmentDetailView /> : <MobileEquipmentDetailView />} />
    </Routes>
  );
};

export default ColdchainService;
