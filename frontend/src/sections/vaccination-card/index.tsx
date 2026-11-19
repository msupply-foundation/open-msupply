import { lazy } from 'solid-js';

// The vaccination card vertical (spec/vaccination-card). It has no navigation
// destination of its own, and both its surfaces load as the vertical's own
// lazy chunks:
// - the card from the patient (S1), mounted under the patients section at
//   '/:patientId/vaccination-card/:programEnrolmentId';
// - the card inside an immunisation encounter (S2), a region the encounter
//   record screen renders — under a Suspense boundary of its own there, so
//   loading the chunk never suspends the encounter screen around it.
export const VaccinationCardView = lazy(() => import('./VaccinationCardView'));
export const VaccinationCardRegion = lazy(() =>
  import('./VaccinationCardRegion').then(m => ({
    default: m.VaccinationCardRegion,
  }))
);
export type { VaccinationCardRegionProps } from './VaccinationCardRegion';
