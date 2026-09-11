import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The Cold chain › Sensors section route tree (spec/cold-chain-sensors),
// mounted under /{storeId}/cold-chain/sensors by App.tsx. ONE routed surface —
// the list (S1); the details editor is a modal over it (S2), so there is no
// detail route, and there is no create or delete surface anywhere. Lazy so the
// section is its own bundle.
//
// No gate of its own: the destination's vaccine-module capability gate and its
// SENSOR_QUERY permission gate are declared in navConfig and applied by the
// router before this tree renders (spec/navigation; ui-surface § cross-cutting)
// — a capability-blocked URL lands on Home, an unpermitted one shows the
// no-permission notice.
const SensorsList = lazy(() => import('./list/SensorsList'));

export const coldChainSensorsRoutes = () => (
  <Route path="/" component={SensorsList} />
);
