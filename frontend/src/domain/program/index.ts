// The Program domain module (kdd/domain-modules): the store-scoped
// program-enrolment registries resource + type, and the reusable
// ProgramSelect picker (reports the program's context id — spec/reports
// AC-R10).
export {
  programRegistriesResource,
  type ProgramRegistry,
} from './programResource';
export { ProgramSelect, type ProgramSelectProps } from './ProgramSelect';
