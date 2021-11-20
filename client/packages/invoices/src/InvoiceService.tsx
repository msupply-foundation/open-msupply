import React, { FC } from 'react';
import { Routes, Route } from 'react-router-dom';

import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { DetailView, OutboundShipmentListView } from './OutboundShipment';
import { ListView as InboundShipmentListView } from './InboundShipment';

const InvoiceService: FC = () => {
  const outboundShipmentsRoute = RouteBuilder.create(
    AppRoute.OutboundShipment
  ).build();

  const outboundShipmentRoute = RouteBuilder.create(AppRoute.OutboundShipment)
    .addPart(':id')
    .build();

  const inboundShipmentsRoute = RouteBuilder.create(
    AppRoute.InboundShipment
  ).build();

  // const inboundShipmentRoute = RouteBuilder.create(AppRoute.InboundShipment)
  //   .addPart(':id')
  //   .build();

  return (
    <Routes>
      <Route
        path={outboundShipmentsRoute}
        element={<OutboundShipmentListView />}
      />
      <Route path={outboundShipmentRoute} element={<DetailView />} />
      <Route
        path={inboundShipmentsRoute}
        element={<InboundShipmentListView />}
      />
    </Routes>
  );
};

export default InvoiceService;
