import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { DetailView, OutboundShipmentListView } from './OutboundShipment';
import {
  OutboundReturnsDetailView,
  OutboundReturnListView,
  InboundReturnListView,
} from './Returns';
import {
  ListView as InboundShipmentListView,
  DetailView as InboundShipmentDetailView,
} from './InboundShipment';
import { PrescriptionListView, PrescriptionDetailView } from './Prescriptions';
import { InboundReturnDetailView } from './Returns/InboundDetailView';

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

  const outboundReturnsRoute = RouteBuilder.create(
    AppRoute.OutboundReturn
  ).build();

  const outboundReturnRoute = RouteBuilder.create(AppRoute.OutboundReturn)
    .addPart(':invoiceNumber')
    .build();

  const inboundReturnsRoute = RouteBuilder.create(
    AppRoute.InboundReturn
  ).build();

  const inboundReturnRoute = RouteBuilder.create(AppRoute.InboundReturn)
    .addPart(':invoiceNumber')
    .build();

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

      <Route path={outboundReturnsRoute} element={<OutboundReturnListView />} />
      <Route
        path={outboundReturnRoute}
        element={<OutboundReturnsDetailView />}
      />

      <Route path={inboundReturnsRoute} element={<InboundReturnListView />} />
      <Route path={inboundReturnRoute} element={<InboundReturnDetailView />} />
    </Routes>
  );
};

export default InvoiceService;
