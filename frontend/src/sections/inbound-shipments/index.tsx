import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The inbound-shipments section route tree, mounted under
// /{storeId}/replenishment/inbound-shipment by App.tsx. The list is the
// standard list screen; the detail view (one shipment's header + lines) is
// reached by a row-click or after creating/duplicating. Both are lazy so the
// section is its own bundle. Spec: spec/inbound-shipments (S1/S3).
const InboundShipmentsList = lazy(() => import('./list/InboundShipmentsList'));
const InboundShipmentDetailView = lazy(
  () => import('./detail/InboundShipmentDetailView')
);

export const inboundShipmentsRoutes = () => (
  <>
    <Route path="/" component={InboundShipmentsList} />
    <Route path="/:invoiceId" component={InboundShipmentDetailView} />
  </>
);
