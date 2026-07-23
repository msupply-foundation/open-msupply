import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// Help vertical routes (spec/help). S1 (the Help page) at the sidebar's Help
// entry — universal, every signed-in user. The central-only help-document
// management screen (S2/S3) lives under the Manage nav group and is registered
// separately (central-gated); see BUILD_REPORT for its status.
const HelpPage = lazy(() => import('./HelpPage'));

export const helpRoutes = () => <Route path="/" component={HelpPage} />;
