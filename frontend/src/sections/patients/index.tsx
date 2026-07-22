import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

// The patients vertical routes (spec/patients), mounted under the navConfig
// path 'dispensary/patients' in App.tsx. Views are lazy so the section is its
// own bundle. Paths are relative to the mount point: '/' = the list,
// '/:patientId' = the detail screen.
const PatientsList = lazy(() => import('./list/PatientsList'));
const PatientDetailView = lazy(() => import('./detail/PatientDetailView'));

export const patientsRoutes = () => (
  <>
    <Route path="/" component={PatientsList} />
    <Route path="/:patientId" component={PatientDetailView} />
  </>
);
