import { lazy, Show } from 'solid-js';
import { Navigate, Route, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { isCentralServer } from '../../api/serverInfo';
import { hasPermission } from '../../store/storeContext';

// Custom-fields vertical routes (spec/custom-fields). One screen, the
// configuration surface (S1), at the Manage nav group's 'manage/custom-fields'
// entry.
const CustomFieldsConfigPage = lazy(() => import('./CustomFieldsConfigPage'));

// Central-server + server-admin gate (spec/custom-fields rules § availability
// and permission; OMS-REG-CF-02.1/.15), mirroring the help-documents screen's
// CentralAdminOnly. Three surfaces, one condition: the nav entry carries the
// `centralAdmin` capability gate (navConfig) so the entry is absent elsewhere,
// and this layout route blocks direct-URL entry so the screen is unreachable
// either way.
//
// It renders under StoreGuardLayout, which withholds its children until the
// store context has loaded, so the permission is settled here — a non-central
// or non-admin session redirects to the store dashboard rather than briefly
// exposing a screen whose read and save the server refuses regardless (and
// refuses UNTYPED: the whole `centralServer` selection fails with "Not a
// central server" before any child field resolves, which is why the surface
// gates on the server's own central flag instead of attempting and handling).
const CentralAdminOnly = (props: RouteSectionProps) => {
  const params = useParams<{ storeId: string }>();
  return (
    <Show
      when={isCentralServer() && hasPermission('SERVER_ADMIN')}
      fallback={<Navigate href={`/${params.storeId}`} />}
    >
      {props.children}
    </Show>
  );
};

export const customFieldsRoutes = () => (
  <Route path="/" component={CentralAdminOnly}>
    <Route path="/" component={CustomFieldsConfigPage} />
  </Route>
);
