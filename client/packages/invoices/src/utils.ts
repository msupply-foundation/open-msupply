import {
  LocaleKey,
  InvoiceNodeStatus,
  useTranslation,
  groupBy,
} from '@openmsupply-client/common';
import {
  OutboundShipment,
  OutboundShipmentRow,
  OutboundShipmentSummaryItem,
  InboundShipmentItem,
  Invoice,
  InvoiceLine,
  InvoiceRow,
} from './types';

export const outboundStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Allocated,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Verified,
];

export const inboundStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Verified,
];

export const nextStatusMap: { [k in InvoiceNodeStatus]?: InvoiceNodeStatus } = {
  [InvoiceNodeStatus.New]: InvoiceNodeStatus.Delivered,
  [InvoiceNodeStatus.Shipped]: InvoiceNodeStatus.Delivered,
  [InvoiceNodeStatus.Delivered]: InvoiceNodeStatus.Verified,
};

const statusTranslation: Record<InvoiceNodeStatus, LocaleKey> = {
  ALLOCATED: 'label.allocated',
  PICKED: 'label.picked',
  SHIPPED: 'label.shipped',
  DELIVERED: 'label.delivered',
  NEW: 'label.new',
  VERIFIED: 'label.verified',
};

export const getStatusTranslation = (status: InvoiceNodeStatus): LocaleKey => {
  return statusTranslation[status];
};

export const getNextOutboundStatus = (
  currentStatus: InvoiceNodeStatus
): InvoiceNodeStatus => {
  const currentStatusIdx = outboundStatuses.findIndex(
    status => currentStatus === status
  );

  const nextStatus = outboundStatuses[currentStatusIdx + 1];

  if (!nextStatus) throw new Error('Could not find the next status');

  return nextStatus;
};

export const getNextInboundStatus = (
  currentStatus: InvoiceNodeStatus
): InvoiceNodeStatus => {
  const nextStatus = nextStatusMap[currentStatus];
  if (!nextStatus) throw new Error('Could not find the next status');
  return nextStatus;
};

export const getNextOutboundStatusButtonTranslation = (
  currentStatus: InvoiceNodeStatus
): LocaleKey | undefined => {
  const nextStatus = getNextOutboundStatus(currentStatus);

  if (nextStatus) return statusTranslation[nextStatus];

  return undefined;
};

export const getNextInboundStatusButtonTranslation = (
  currentStatus: InvoiceNodeStatus
): LocaleKey | undefined => {
  const nextStatus = getNextInboundStatus(currentStatus);

  if (nextStatus) return statusTranslation[nextStatus];

  return undefined;
};

export const getStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: InvoiceNodeStatus): string => {
    return t(
      statusTranslation[currentStatus] ??
        statusTranslation[InvoiceNodeStatus.New]
    );
  };

export const isInvoiceEditable = (outbound: OutboundShipment): boolean => {
  return outbound.status === 'NEW' || outbound.status === 'ALLOCATED';
};

export const isInboundEditable = (inbound: Invoice): boolean => {
  // return inbound.status !== 'VERIFIED' && inbound.status !== 'DELIVERED';
  return inbound.status === 'NEW';
};

export const flattenOutboundItems = (
  summaryItems: OutboundShipmentSummaryItem[]
): OutboundShipmentRow[] => {
  return summaryItems.map(({ batches }) => Object.values(batches)).flat();
};

export const createSummaryItem = (
  itemId: string,
  lines: [InvoiceLine, ...InvoiceLine[]]
): InboundShipmentItem => {
  const item: InboundShipmentItem = {
    // TODO: Could generate a unique UUID here if wanted for the id. But not needed for now.
    // the lines all have the itemID in common, so we can use that. Have added the itemID also
    // as it is explicit that this is the itemID in common for all of the invoice lines.
    id: itemId,
    itemId,
    lines,
  };

  return item;
};

export const inboundLinesToSummaryItems = (
  lines: InvoiceLine[]
): InboundShipmentItem[] => {
  const grouped = groupBy(lines, 'itemId');
  return Object.entries(grouped).map(([itemId, lines]) =>
    createSummaryItem(itemId, lines)
  );
};
export const canDeleteInvoice = (invoice: InvoiceRow): boolean =>
  invoice.status === InvoiceNodeStatus.New ||
  invoice.status === InvoiceNodeStatus.Allocated;
