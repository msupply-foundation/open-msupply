import {
  PatientRowFragment,
  ProgramEnrolmentRowFragment,
} from './operations.generated';

type ProgramEnrolmentRowFragmentWithId = {
  id: string;
} & ProgramEnrolmentRowFragment;

export * from './hooks';
export {
  PatientRowFragment,
  ProgramEnrolmentRowFragment,
  ProgramEnrolmentRowFragmentWithId as ProgramRowFragmentWithId,
};
