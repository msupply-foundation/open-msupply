import { ProgramFragment } from './operations.generated';

export * from './hooks';
export { ProgramFragment, ProgramRowFragment } from './operations.generated';
export type ProgramRowFragmentWithId = { id: string } & ProgramFragment;
