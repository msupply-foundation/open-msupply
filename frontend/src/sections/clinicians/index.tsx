import { lazy, Show } from 'solid-js';
import { Navigate, Route, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { isDispensary } from '../../store/storeContext';

// The clinicians vertical (spec/clinicians), mounted under the navConfig path
// 'dispensary/clinicians' in App.tsx. One screen — the read-only list; no
// detail, no mutations. The view is lazy so the section is its own bundle.
const CliniciansList = lazy(() => import('./list/CliniciansList'));

// Dispensary-mode gate (rules › access; the section is offered only in
// dispensary mode — chrome's rule). The Dispensary nav group is hidden in other
// modes (ShellLayout); this layout route blocks direct-URL entry so the list is
// not reachable either way. It renders under StoreGuardLayout, which withholds
// its children until the store context has loaded, so the store's mode is
// settled here — a non-dispensary store redirects to the store dashboard.
const DispensaryOnly = (props: RouteSectionProps) => {
  const params = useParams<{ storeId: string }>();
  return (
    <Show
      when={isDispensary()}
      fallback={<Navigate href={`/${params.storeId}`} />}
    >
      {props.children}
    </Show>
  );
};

export const cliniciansRoutes = () => (
  <Route path="/" component={DispensaryOnly}>
    <Route path="/" component={CliniciansList} />
  </Route>
);
