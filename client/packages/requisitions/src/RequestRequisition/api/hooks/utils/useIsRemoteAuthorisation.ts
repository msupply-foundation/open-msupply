import { RequisitionNodeApprovalStatus } from '@common/types';
import { useRequest } from '..';

export const useIsRemoteAuthorisation = () => {
  const { approvalStatus, linkedRequisition } = useRequest.document.fields([
    'approvalStatus',
    'linkedRequisition',
  ]);

  const linkedRequisitionStatus =
    linkedRequisition?.approvalStatus ?? RequisitionNodeApprovalStatus.None;
  const usesRemoteAuthorisation =
    approvalStatus != RequisitionNodeApprovalStatus.None ||
    linkedRequisitionStatus != RequisitionNodeApprovalStatus.None;

  return { usesRemoteAuthorisation };
};
