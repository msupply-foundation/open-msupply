import { lazy, Show } from 'solid-js';
import { Navigate, Route, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { isDispensary } from '../../store/storeContext';

// The prescription-orders vertical routes (spec/prescription-orders), mounted
// under the navConfig path 'dispensary/prescription-order' in App.tsx. Views
// are lazy so the section is its own bundle: '/' = the list, '/:orderId' =
// the detail.
const PrescriptionOrdersList = lazy(() => import('./list/PrescriptionOrdersList'));
const PrescriptionOrderDetailView = lazy(
  () => import('./detail/PrescriptionOrderDetailView')
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

export const prescriptionOrdersRoutes = () => (
  <Route path="/" component={DispensaryOnly}>
    <Route path="/" component={PrescriptionOrdersList} />
    <Route path="/:orderId" component={PrescriptionOrderDetailView} />
  </Route>
);
