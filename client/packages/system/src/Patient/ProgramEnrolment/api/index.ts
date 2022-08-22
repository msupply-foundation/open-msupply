import { ProgramRowFragment } from './operations.generated';

export * from './hooks';
export {
  ProgramFragment,
  ProgramRowFragment,
  ProgramEventFragment,
} from './operations.generated';
export type ProgramRowFragmentWithId = { id: string } & ProgramRowFragment;
