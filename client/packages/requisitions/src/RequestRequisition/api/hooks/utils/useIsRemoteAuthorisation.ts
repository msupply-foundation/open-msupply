import { RequisitionNodeApprovalStatus } from '@common/types';
import { useRequest } from '..';

export const useIsRemoteAuthorisation = () => {
  const { linkedRequisition } = useRequest.document.fields([
    'linkedRequisition',
  ]);

  const linkedRequisitionStatus =
    linkedRequisition?.approvalStatus ?? RequisitionNodeApprovalStatus.None;
  const usesRemoteAuthorisation =
    linkedRequisitionStatus != RequisitionNodeApprovalStatus.None;

  return { usesRemoteAuthorisation };
};
