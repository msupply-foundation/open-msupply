import { PatientRowFragment, ProgramRowFragment } from './operations.generated';

type ProgramRowFragmentWithId = { id: string } & ProgramRowFragment;

export * from './hooks';
export { PatientRowFragment, ProgramRowFragment, ProgramRowFragmentWithId };
