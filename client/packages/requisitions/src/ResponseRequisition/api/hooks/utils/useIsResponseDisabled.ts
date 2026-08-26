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
  // The other party's store may have been disabled (e.g. after a store merge);
  // such records remain viewable but must not be editable.
  if (data.otherParty?.store?.isDisabled) return true;
  return isResponseDisabled(data);
};
