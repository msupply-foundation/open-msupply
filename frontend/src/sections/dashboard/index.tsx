import { lazy } from 'solid-js';

// The dashboard section (spec/dashboard): a single screen — the store landing
// page, labelled Home in the nav. Lazy so the section is its own bundle,
// mirroring the other sections. It has ONE route, the store root `/`, wired
// directly in App.tsx — so unlike every other section it exports no route
// factory: there is no sub-tree to nest.
export const DashboardPage = lazy(() => import('./DashboardPage'));
