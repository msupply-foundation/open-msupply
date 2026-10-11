/*
 * The form library's lazy chunk (kdd/custom-forms/specs.md § Forms in the UI,
 * kdd/bundling; implementation-plan H1): the fields, the AJV validator, the
 * base document schemas, the host's default forms and its patient fields,
 * which a form needs together and nothing else needs at all. Everything
 * reaches it through a dynamic import, the host's through loadFormLibrary and
 * a plugin's through
 * the lazy wrappers in plugin-sdk/lazyComponents.ts, so it is one chunk,
 * fetched when the first form opens and shared by the host and every plugin.
 * A site that never opens a form never loads it; vite/lazyChunkGuard.ts fails
 * the build if any of it reaches the eager entry.
 */
export {
  TextInput,
  TextAreaInput,
  NumberInput,
  DateInput,
  DateTimeInput,
  SelectInput,
  AutocompleteInput,
  CheckboxInput,
  DateOfBirthInput,
  FieldGroup,
  FormDivider,
} from './fields';
export { NotesInput } from './NotesInput';
export { validateDocument } from './validation';
export { baseSchemaFor } from './baseSchemas';
export { DefaultEnrolmentForm, DefaultEncounterForm } from './defaults';
// The host's patient fields over a patient document, and the default patient
// form they make up: a form on the document path needs them together.
export {
  PatientCodeField,
  PatientCode2Field,
  PatientFirstNameField,
  PatientLastNameField,
  PatientDateOfBirthField,
  PatientGenderField,
  PatientAddressField,
  PatientPhoneField,
  PatientNextOfKinField,
  PatientDeceasedFields,
  DefaultPatientForm,
} from '../patient/documentFields';
