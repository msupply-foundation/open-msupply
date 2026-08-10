import { lazy, Show } from 'solid-js';
import { Navigate, Route, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { isCentralServer } from '@/api/serverInfo';
import { hasPermission } from '@/store/storeContext';
import { canReachRegister } from './reach';

// The sync-message section route tree, mounted under
// /{storeId}/manage/sync-message by App.tsx. ONE routed surface — the register
// (spec/sync-message S1); authoring (S2) and inspecting (S3) are modals over
// it, so a message has no route of its own. Lazy so the section is its own
// bundle.
const SyncMessagesList = lazy(() => import('./list/SyncMessagesList'));

/*
 * Central-server + server-admin gate (rules § reach and visibility,
 * OMS-REG-MNG-04.1), mirroring the help-documents management screen: the nav
 * entry is already withheld elsewhere (navConfig's `centralAdmin` capability),
 * and this layout route blocks direct-URL entry so the screen is unreachable
 * either way. It renders under StoreGuardLayout, which withholds its children
 * until the store context has loaded, so the permission is settled here — a
 * non-central or non-admin session redirects to the store dashboard rather
 * than briefly exposing a register whose reads the server would refuse.
 */
const CentralAdminOnly = (props: RouteSectionProps) => {
  const params = useParams<{ storeId: string }>();
  return (
    <Show
      when={canReachRegister(isCentralServer(), hasPermission('SERVER_ADMIN'))}
      fallback={<Navigate href={`/${params.storeId}`} />}
    >
      {props.children}
    </Show>
  );
};

export const syncMessageRoutes = () => (
  <Route path="/" component={CentralAdminOnly}>
    <Route path="/" component={SyncMessagesList} />
  </Route>
);
