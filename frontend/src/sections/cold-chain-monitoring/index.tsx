import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The Cold chain › Monitoring section route tree (spec/cold-chain-monitoring),
// mounted under /{storeId}/cold-chain/monitoring by App.tsx. ONE routed
// surface — the screen (S1) with its three tabs; the breach summary (S2) is a
// popover on the chart, the acknowledgement (S3) a modal over the Breaches
// tab, and the import (S4) a file chooser from the page actions, so there is
// no detail route. Lazy so the section is its own bundle.
//
// The notification band (S5) is NOT routed here: it stands above every screen
// and is mounted by the shell (src/nav/ShellLayout.tsx).
//
// No gate of its own: the destination's vaccine-module capability gate and
// its SENSOR_QUERY permission gate are declared in navConfig and applied by
// the router before this tree renders (spec/navigation).
const MonitoringScreen = lazy(() => import('./monitoring/MonitoringScreen'));

export const coldChainMonitoringRoutes = () => (
  <Route path="/" component={MonitoringScreen} />
);
