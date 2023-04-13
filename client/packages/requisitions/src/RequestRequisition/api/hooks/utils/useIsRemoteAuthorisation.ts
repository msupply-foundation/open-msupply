import { RequisitionNodeApprovalStatus } from '@common/types';
import { useRequest } from '..';

export const useIsRemoteAuthorisation = () => {
  const { approvalStatus, linkedRequisition } = useRequest.document.fields([
    'approvalStatus',
    'linkedRequisition',
  ]);

  const usesRemoteAuthorisation =
    approvalStatus != RequisitionNodeApprovalStatus.None ||
    linkedRequisition?.approvalStatus != RequisitionNodeApprovalStatus.None;

  return { usesRemoteAuthorisation };
};
