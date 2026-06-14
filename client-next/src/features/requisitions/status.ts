import { RequisitionNodeStatus } from '@/gql/schema';
import { useTranslation, type TxKey } from '@/intl';

const STATUS_KEY: Record<RequisitionNodeStatus, TxKey> = {
  [RequisitionNodeStatus.Draft]: 'status.draft',
  [RequisitionNodeStatus.New]: 'status.new',
  [RequisitionNodeStatus.Sent]: 'status.sent',
  [RequisitionNodeStatus.Finalised]: 'status.finalised',
};

/** Returns a translator mapping a requisition status enum to a localised label. */
export function useRequisitionStatusName() {
  const { t } = useTranslation();
  return (status: RequisitionNodeStatus) => t(STATUS_KEY[status]);
}
