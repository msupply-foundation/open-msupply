import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { DetailView, OutboundShipmentListView } from './OutboundShipment';
import {
  SupplierReturnsDetailView,
  SupplierReturnListView,
  CustomerReturnListView,
} from './Returns';
import {
  ListView as InboundShipmentListView,
  DetailView as InboundShipmentDetailView,
} from './InboundShipment';
import { PrescriptionListView, PrescriptionDetailView } from './Prescriptions';
import { CustomerReturnDetailView } from './Returns/CustomerDetailView';

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

  const supplierReturnsRoute = RouteBuilder.create(
    AppRoute.SupplierReturn
  ).build();

  const supplierReturnRoute = RouteBuilder.create(AppRoute.SupplierReturn)
    .addPart(':invoiceNumber')
    .build();

  const customerReturnsRoute = RouteBuilder.create(
    AppRoute.CustomerReturn
  ).build();

  const customerReturnRoute = RouteBuilder.create(AppRoute.CustomerReturn)
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

      <Route path={supplierReturnsRoute} element={<SupplierReturnListView />} />
      <Route
        path={supplierReturnRoute}
        element={<SupplierReturnsDetailView />}
      />

      <Route path={customerReturnsRoute} element={<CustomerReturnListView />} />
      <Route
        path={customerReturnRoute}
        element={<CustomerReturnDetailView />}
      />
    </Routes>
  );
};

export default InvoiceService;
