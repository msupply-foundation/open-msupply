/*
 * The form library's lazy chunk (kdd/custom-forms/specs.md § Forms in the UI,
 * kdd/bundling; implementation-plan H1): the fields, the AJV validator, the
 * base document schemas and the host's default forms, which a form needs
 * together and nothing else needs at all. Everything reaches it through a
 * dynamic import, the host's through loadFormLibrary and a plugin's through
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
  CheckboxInput,
  FieldGroup,
} from './fields';
export { validateDocument } from './validation';
export { baseSchemaFor } from './baseSchemas';
export { DefaultEnrolmentForm, DefaultEncounterForm } from './defaults';
