import { lazy, Show } from 'solid-js';
import { Navigate, Route, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { isDispensary } from '../../store/storeContext';

// The patients vertical routes (spec/patients), mounted under the navConfig
// path 'dispensary/patients' in App.tsx. Views are lazy so the section is its
// own bundle. Paths are relative to the mount point: '/' = the list,
// '/:patientId' = the detail screen.
const PatientsList = lazy(() => import('./list/PatientsList'));
const PatientDetailView = lazy(() => import('./detail/PatientDetailView'));

// The create-patient modal is reused by other dispensary surfaces (the
// prescription create dialog's create-on-no-match flow — spec/prescriptions
// AC-C5) via its `onCreated` callback. Re-exported here so consumers depend on
// the patients vertical's public surface, not a deep path.
export {
  CreatePatientModal,
  type CreatePatientModalProps,
} from './list/CreatePatientModal';

// Dispensary-mode gate (spec/patients AC-G1): the whole patient surface is
// reachable only in dispensary mode. The Dispensary nav group is hidden in
// other modes (ShellLayout); this layout route blocks direct-URL entry so no
// patient screen is reachable either way. It renders under StoreGuardLayout,
// which withholds its children until the store context has loaded, so the
// store's mode is settled here — a non-dispensary store redirects to the store
// dashboard rather than briefly exposing a patient screen.
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

export const patientsRoutes = () => (
  <Route path="/" component={DispensaryOnly}>
    <Route path="/" component={PatientsList} />
    <Route path="/:patientId" component={PatientDetailView} />
  </Route>
);
