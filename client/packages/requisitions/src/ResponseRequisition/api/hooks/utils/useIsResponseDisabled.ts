import { isResponseDisabled } from './../../../../utils';
import { useResponse } from '../document/useResponse';
import { RequisitionNodeApprovalStatus } from '@common/types';
import { useIsRemoteAuthorisation } from './useIsRemoteAuthorisation';

export const useIsResponseDisabled = (): boolean => {
  const { data } = useResponse();
  const authorisation = useIsRemoteAuthorisation();

  if (
    !data ||
    (authorisation &&
      (data?.approvalStatus === RequisitionNodeApprovalStatus.Denied ||
        data?.approvalStatus === RequisitionNodeApprovalStatus.Pending))
  )
    return true;
  return isResponseDisabled(data);
};
