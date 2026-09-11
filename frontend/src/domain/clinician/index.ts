// The shared clinician module (kdd/domain-modules): the store-scoped active
// clinician list + the reusable picker over it. First consumer: prescriptions
// (spec/prescriptions § patient, clinician, program, diagnosis).
export {
  cliniciansResource,
  clinicianName,
  clinicianForUsername,
  clinicianMatchingUser,
  type Clinician,
} from './clinicianResource';
export { ClinicianSelect, type ClinicianSelectProps } from './ClinicianSelect';
