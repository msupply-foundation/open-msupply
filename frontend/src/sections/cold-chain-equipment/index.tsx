import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The Cold chain › Equipment section route tree (spec/cold-chain-equipment),
// mounted by App.tsx under BOTH of its destinations — /{storeId}/cold-chain/
// equipment and /{storeId}/manage/equipment. The same screens serve both; the
// only difference is whether the list is pinned to the active store, which the
// list reads off its own path (rules › the two destinations).
//
// TWO routed surfaces: the list (S1) and one asset's detail (S2). Everything
// else — create, import, status, mapping, the confirmations — is a modal over
// one of them. Lazy so the section is its own bundle.
//
// No gate of its own: the destination's vaccine-module capability gate and its
// ASSET_QUERY permission gate are declared in navConfig and applied by the
// router before this tree renders (spec/navigation; ui-surface § cross-cutting)
// — a capability-blocked URL lands on Home, an unpermitted one shows the
// no-permission notice.
const EquipmentList = lazy(() => import('./list/EquipmentList'));
const EquipmentDetailView = lazy(() => import('./detail/EquipmentDetailView'));

export const coldChainEquipmentRoutes = () => (
  <>
    <Route path="/" component={EquipmentList} />
    <Route path="/:id" component={EquipmentDetailView} />
  </>
);
