import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The sites section route tree, mounted under /{storeId}/manage/sites by
// App.tsx. ONE screen and no per-site route: the register is the whole read
// surface, and everything a site can have done to it happens in the modal a row
// click opens (spec/sites/README.md § how it fits together). Lazy, so the
// section is its own bundle — central-administration plumbing that most
// sessions never open.
const SitesList = lazy(() => import('./list/SitesList'));

export const sitesRoutes = () => <Route path="/" component={SitesList} />;
