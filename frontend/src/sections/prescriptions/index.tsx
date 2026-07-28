import { lazy, Show } from 'solid-js';
import { Navigate, Route, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { isDispensary } from '../../store/storeContext';

// The prescriptions vertical routes (spec/prescriptions), mounted under the
// navConfig path 'dispensary/prescription' in App.tsx. Views are lazy so the
// section is its own bundle: '/' = the list, '/:prescriptionId' = the detail.
const PrescriptionsList = lazy(() => import('./list/PrescriptionsList'));
const PrescriptionDetailView = lazy(
  () => import('./detail/PrescriptionDetailView')
);

// Dispensary-mode gate (the patients section's guard, shared reflex): the
// whole dispensing surface is reachable only in dispensary mode — the nav
// group is hidden elsewhere and this layout route blocks direct-URL entry.
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

export const prescriptionsRoutes = () => (
  <Route path="/" component={DispensaryOnly}>
    <Route path="/" component={PrescriptionsList} />
    <Route path="/:prescriptionId" component={PrescriptionDetailView} />
  </Route>
);
