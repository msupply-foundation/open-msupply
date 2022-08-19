import { ProgramRowFragment } from './operations.generated';

export * from './hooks';
export { PatientRowFragment, ProgramRowFragment } from './operations.generated';
export type ProgramRowFragmentWithId = { id: string } & ProgramRowFragment;
