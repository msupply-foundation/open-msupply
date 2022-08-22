import { ProgramRowFragment } from '../../api/operations.generated';
export {
  ProgramRowFragment,
  ProgramEventFragment,
} from '../../api/operations.generated';
export * from './hooks';
export { ProgramFragment } from './operations.generated';
export type ProgramRowFragmentWithId = { id: string } & ProgramRowFragment;
