import {
  RequisitionNodeApprovalStatus,
  useAuthContext,
} from '@openmsupply-client/common';
import { useResponse } from '..';

export const useIsRemoteAuthorisation = () => {
  const { store } = useAuthContext();

  const { approvalStatus } = useResponse.document.fields(['approvalStatus']);
  const authoriseResponseRequisitions =
    !!store?.preferences?.responseRequisitionRequiresAuthorisation;
  const isRemoteAuthorisation =
    authoriseResponseRequisitions &&
    approvalStatus !== RequisitionNodeApprovalStatus.None;

  return { isRemoteAuthorisation };
};
