import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { DetailView, OutboundShipmentListView } from './OutboundShipment';
import {
  ListView as InboundShipmentListView,
  DetailView as InboundShipmentDetailView,
} from './InboundShipment';
import { PrescriptionListView, PrescriptionDetailView } from './Prescriptions';
import { InboundReturnListView, OutboundReturnListView } from './Returns';

const InvoiceService: FC = () => {
  const outboundShipmentsRoute = RouteBuilder.create(
    AppRoute.OutboundShipment
  ).build();

  const outboundShipmentRoute = RouteBuilder.create(AppRoute.OutboundShipment)
    .addPart(':invoiceNumber')
    .build();

  const inboundShipmentsRoute = RouteBuilder.create(
    AppRoute.InboundShipment
  ).build();

  const inboundShipmentRoute = RouteBuilder.create(AppRoute.InboundShipment)
    .addPart(':invoiceNumber')
    .build();

  const prescriptionsRoute = RouteBuilder.create(AppRoute.Prescription).build();

  const prescriptionRoute = RouteBuilder.create(AppRoute.Prescription)
    .addPart(':invoiceNumber')
    .build();

  const outboundReturnRoute = RouteBuilder.create(
    AppRoute.OutboundReturn
  ).build();

  const inboundReturnRoute = RouteBuilder.create(
    AppRoute.InboundReturn
  ).build();

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
      <Route
        path={inboundShipmentRoute}
        element={<InboundShipmentDetailView />}
      />
      <Route path={prescriptionsRoute} element={<PrescriptionListView />} />
      <Route path={prescriptionRoute} element={<PrescriptionDetailView />} />
      <Route path={outboundReturnRoute} element={<OutboundReturnListView />} />
      <Route path={inboundReturnRoute} element={<InboundReturnListView />} />
    </Routes>
  );
};

export default InvoiceService;
