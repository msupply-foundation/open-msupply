import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The outbound-shipments section route tree, mounted under
// /{storeId}/distribution/outbound-shipment by App.tsx (the e2e URL contract's
// section path — e2e/TESTIDS.md § URLs). List (S1) and detail (S3) per
// spec/outbound-shipments/ui-surface.md; both lazy so the section is its own
// bundle.
const OutboundShipmentsList = lazy(() => import('./list/OutboundShipmentsList'));
const OutboundDetailView = lazy(() => import('./detail/OutboundDetailView'));

export const outboundShipmentsRoutes = () => (
  <>
    <Route path="/" component={OutboundShipmentsList} />
    <Route path="/:invoiceId" component={OutboundDetailView} />
  </>
);
