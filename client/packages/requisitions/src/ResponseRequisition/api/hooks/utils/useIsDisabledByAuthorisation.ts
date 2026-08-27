import { useResponse } from '../document/useResponse';
import { RequisitionNodeApprovalStatus } from '@common/types';
import { useIsRemoteAuthorisation } from './useIsRemoteAuthorisation';

export const useIsDisabledByAuthorisation = (): boolean => {
  const { data } = useResponse();
  const authorisation = useIsRemoteAuthorisation();

  if (
    authorisation &&
    (data?.approvalStatus === RequisitionNodeApprovalStatus.Denied ||
      data?.approvalStatus === RequisitionNodeApprovalStatus.Pending)
  ) {
    return true;
  }
  return false;
};
