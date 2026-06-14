import { InvoiceNodeStatus } from '@/gql/schema';
import { useTranslation, type TxKey } from '@/intl';

const STATUS_KEY: Record<InvoiceNodeStatus, TxKey> = {
  [InvoiceNodeStatus.New]: 'status.new',
  [InvoiceNodeStatus.Allocated]: 'status.allocated',
  [InvoiceNodeStatus.Picked]: 'status.picked',
  [InvoiceNodeStatus.Shipped]: 'status.shipped',
  [InvoiceNodeStatus.Delivered]: 'status.delivered',
  [InvoiceNodeStatus.Received]: 'status.received',
  [InvoiceNodeStatus.Verified]: 'status.verified',
  [InvoiceNodeStatus.Cancelled]: 'status.cancelled',
};

/** Returns a translator mapping an invoice status enum to a localised label. */
export function useInvoiceStatusName() {
  const { t } = useTranslation();
  return (status: InvoiceNodeStatus) => t(STATUS_KEY[status]);
}
