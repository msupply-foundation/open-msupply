import { ProgramEnrolmentRowFragment } from '../../api/operations.generated';
export {
  ProgramEnrolmentRowFragment,
  ProgramEventFragment,
} from '../../api/operations.generated';
export * from './hooks';
export { ProgramEnrolmentFragment } from './operations.generated';
export type ProgramEnrolmentRowFragmentWithId = {
  id: string;
} & ProgramEnrolmentRowFragment;
