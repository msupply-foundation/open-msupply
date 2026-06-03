import React, { FC, Suspense } from 'react';
import {
  RouteBuilder,
  Routes,
  Route,
  Navigate,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

// All sub-areas are lazy so navigating to (e.g.) Inbound doesn't pull in
// Outbound + Prescriptions (JsonForms, Patient, Encounter, ~700KB combined)
// + Returns. Each route is its own async chunk.
const OutboundShipmentListView = React.lazy(() =>
  import('./OutboundShipment').then(m => ({ default: m.OutboundShipmentListView }))
);
const OutboundShipmentDetailView = React.lazy(() =>
  import('./OutboundShipment').then(m => ({ default: m.DetailView }))
);
const InboundListView = React.lazy(() =>
  import('./InboundShipment').then(m => ({ default: m.InboundListView }))
);
const InboundShipmentDetailView = React.lazy(() =>
  import('./InboundShipment').then(m => ({ default: m.DetailView }))
);
const PrescriptionListView = React.lazy(() =>
  import('./Prescriptions').then(m => ({ default: m.PrescriptionListView }))
);
const PrescriptionDetailView = React.lazy(() =>
  import('./Prescriptions').then(m => ({ default: m.PrescriptionDetailView }))
);
const PrescriptionLineEditView = React.lazy(() =>
  import('./Prescriptions/LineEditView').then(m => ({
    default: m.PrescriptionLineEditView,
  }))
);
const SupplierReturnListView = React.lazy(() =>
  import('./Returns').then(m => ({ default: m.SupplierReturnListView }))
);
const SupplierReturnsDetailView = React.lazy(() =>
  import('./Returns').then(m => ({ default: m.SupplierReturnsDetailView }))
);
const CustomerReturnListView = React.lazy(() =>
  import('./Returns').then(m => ({ default: m.CustomerReturnListView }))
);
const CustomerReturnDetailView = React.lazy(() =>
  import('./Returns/CustomerDetailView').then(m => ({
    default: m.CustomerReturnDetailView,
  }))
);

const InvoiceService: FC = () => {
  const outboundShipmentsRoute = RouteBuilder.create(
    AppRoute.OutboundShipment
  ).build();

  const outboundShipmentRoute = RouteBuilder.create(AppRoute.OutboundShipment)
    .addPart(':invoiceId')
    .build();

  const inboundShipmentsRoute = RouteBuilder.create(
    AppRoute.InboundShipment
  ).build();

  const inboundShipmentRoute = RouteBuilder.create(AppRoute.InboundShipment)
    .addPart(':invoiceId')
    .build();

  const inboundShipmentExternalRoute = RouteBuilder.create(
    AppRoute.InboundShipmentExternal
  )
    .addPart(':invoiceId')
    .build();

  const prescriptionsRoute = RouteBuilder.create(AppRoute.Prescription).build();

  const prescriptionRoute = RouteBuilder.create(AppRoute.Prescription)
    .addPart(':invoiceId')
    .build();

  const prescriptionLineRoute = RouteBuilder.create(AppRoute.Prescription)
    .addPart(':invoiceId')
    .addPart(':itemId')
    .build();

  const supplierReturnsRoute = RouteBuilder.create(
    AppRoute.SupplierReturn
  ).build();

  const supplierReturnRoute = RouteBuilder.create(AppRoute.SupplierReturn)
    .addPart(':invoiceId')
    .build();

  const customerReturnsRoute = RouteBuilder.create(
    AppRoute.CustomerReturn
  ).build();

  const customerReturnRoute = RouteBuilder.create(AppRoute.CustomerReturn)
    .addPart(':invoiceId')
    .build();

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route
          path={outboundShipmentsRoute}
          element={<OutboundShipmentListView />}
        />
        <Route
          path={outboundShipmentRoute}
          element={<OutboundShipmentDetailView />}
        />
        <Route path={inboundShipmentsRoute} element={<InboundListView />} />
        <Route
          path={inboundShipmentRoute}
          element={<InboundShipmentDetailView />}
        />
        <Route
          path={RouteBuilder.create(AppRoute.InboundShipmentExternal).build()}
          element={
            <Navigate
              to={RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InboundShipment)
                .build()}
              replace
            />
          }
        />
        <Route
          path={inboundShipmentExternalRoute}
          element={<InboundShipmentDetailView />}
        />
        <Route path={prescriptionsRoute} element={<PrescriptionListView />} />
        <Route path={prescriptionRoute} element={<PrescriptionDetailView />} />
        <Route
          path={prescriptionLineRoute}
          element={<PrescriptionLineEditView />}
        />

        <Route
          path={supplierReturnsRoute}
          element={<SupplierReturnListView />}
        />
        <Route
          path={supplierReturnRoute}
          element={<SupplierReturnsDetailView />}
        />

        <Route
          path={customerReturnsRoute}
          element={<CustomerReturnListView />}
        />
        <Route
          path={customerReturnRoute}
          element={<CustomerReturnDetailView />}
        />
      </Routes>
    </Suspense>
  );
};

export default InvoiceService;
