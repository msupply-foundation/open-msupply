import { LocaleKey } from '@common/intl';
import { ProgramEnrolmentNodeStatus } from '@common/types';

const statusTranslation: Record<ProgramEnrolmentNodeStatus, LocaleKey> = {
  ACTIVE: 'label.program-enrolment-status-active',
  OPTED_OUT: 'label.program-enrolment-status-opt',
  PAUSED: 'label.program-enrolment-status-paused',
  TRANSFERRED_OUT: 'label.program-enrolment-status-transferred',
};

export const getStatusTranslation = (
  status: ProgramEnrolmentNodeStatus
): LocaleKey => {
  return statusTranslation[status];
};
