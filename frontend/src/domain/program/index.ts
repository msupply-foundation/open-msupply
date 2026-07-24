// The Program domain module (kdd/domain-modules). Two distinct pickers over
// two distinct entities:
//  - ProgramNameSelect: the store's programs (ProgramNode.id) — a
//    prescription's programId (spec/prescriptions).
//  - ProgramDocumentSelect: program-enrolment DOCUMENT registries (context id)
//    — the report/patient-enrolment surfaces (spec/reports AC-R10).
export {
  programRegistriesResource,
  programsResource,
  type ProgramRegistry,
  type ProgramListItem,
} from './programResource';
export {
  ProgramNameSelect,
  type ProgramNameSelectProps,
} from './ProgramNameSelect';
export {
  ProgramDocumentSelect,
  type ProgramDocumentSelectProps,
} from './ProgramDocumentSelect';
