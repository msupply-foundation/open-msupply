import { lazy, Show } from 'solid-js';
import { Navigate, Route, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { isDispensary } from '../../store/storeContext';

// The prescription-requests vertical routes (spec/prescription-requests), mounted
// under the navConfig path 'dispensary/prescription-request' in App.tsx. Views
// are lazy so the section is its own bundle: '/' = the list, '/:requestId' =
// the detail.
const PrescriptionRequestsList = lazy(() => import('./list/PrescriptionRequestsList'));
const PrescriptionRequestDetailView = lazy(
  () => import('./detail/PrescriptionRequestDetailView')
);

// Dispensary-mode gate (the prescriptions section's guard, shared reflex):
// the whole prescribing surface is reachable only in dispensary mode — the
// nav group is hidden elsewhere and this layout route blocks direct-URL entry.
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

export const prescriptionRequestsRoutes = () => (
  <Route path="/" component={DispensaryOnly}>
    <Route path="/" component={PrescriptionRequestsList} />
    <Route path="/:requestId" component={PrescriptionRequestDetailView} />
  </Route>
);
