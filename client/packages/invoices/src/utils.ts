import {
  InboundFragment,
  InboundRowFragment,
} from './InboundShipment/api/operations.generated';
import {
  InvoiceLineNodeType,
  LocaleKey,
  InvoiceNodeStatus,
  useTranslation,
  ArrayUtils,
} from '@openmsupply-client/common';
import { OutboundRowFragment } from './OutboundShipment/api';
import { InboundLineFragment } from './InboundShipment/api';
import { DraftOutboundLine, InboundItem } from './types';

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

export const manualInboundStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
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
): InvoiceNodeStatus | null => {
  const currentStatusIdx = outboundStatuses.findIndex(
    status => currentStatus === status
  );
  const nextStatus = outboundStatuses[currentStatusIdx + 1];
  return nextStatus ?? null;
};

export const getNextInboundStatus = (
  currentStatus: InvoiceNodeStatus
): InvoiceNodeStatus | null => {
  const nextStatus = nextStatusMap[currentStatus];
  return nextStatus ?? null;
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

export const isOutboundDisabled = (outbound: OutboundRowFragment): boolean => {
  return (
    outbound.status === InvoiceNodeStatus.Shipped ||
    outbound.status === InvoiceNodeStatus.Verified ||
    outbound.status === InvoiceNodeStatus.Delivered
  );
};

export const isInboundDisabled = (inbound: InboundRowFragment): boolean => {
  const isManuallyCreated = !inbound.linkedShipment?.id;
  return isManuallyCreated
    ? inbound.status === InvoiceNodeStatus.Verified
    : inbound.status === InvoiceNodeStatus.Picked ||
        inbound.status === InvoiceNodeStatus.Shipped ||
        inbound.status === InvoiceNodeStatus.Verified;
};

export const useIsInboundStatusChangeDisabled = (
  inbound: InboundFragment
): boolean => {
  const isManuallyCreated = !inbound.linkedShipment?.id;
  return isManuallyCreated
    ? inbound.status === InvoiceNodeStatus.Verified
    : inbound.status === InvoiceNodeStatus.Picked ||
        inbound.status === InvoiceNodeStatus.Verified;
};

export const createSummaryItem = (
  itemId: string,
  lines: [InboundLineFragment, ...InboundLineFragment[]]
): InboundItem => {
  const item: InboundItem = {
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
  lines: InboundLineFragment[]
): InboundItem[] => {
  const grouped = ArrayUtils.groupBy(lines, line => line.item.id);
  return Object.entries(grouped).map(([itemId, lines]) =>
    createSummaryItem(itemId, lines)
  );
};
export const canDeleteInvoice = (invoice: OutboundRowFragment): boolean =>
  invoice.status === InvoiceNodeStatus.New ||
  invoice.status === InvoiceNodeStatus.Allocated;

export const isA = {
  stockOutLine: (line: { type: InvoiceLineNodeType }) =>
    line.type === InvoiceLineNodeType.StockOut,
  stockInLine: (line: { type: InvoiceLineNodeType }) =>
    line.type === InvoiceLineNodeType.StockIn,
  serviceLine: (line: { type: InvoiceLineNodeType }) =>
    line.type === InvoiceLineNodeType.Service,
  placeholderLine: (line: { type: InvoiceLineNodeType }) =>
    line.type === InvoiceLineNodeType.UnallocatedStock,
};

export const get = {
  stockLineSubtotal: (line: DraftOutboundLine) =>
    line.numberOfPacks * (line.stockLine?.sellPricePerPack ?? 0),
  stockLineTotal: ({
    numberOfPacks,
    taxPercentage,
    sellPricePerPack,
  }: DraftOutboundLine) => {
    const subtotal = numberOfPacks * sellPricePerPack;

    if (taxPercentage == null) return subtotal;
    if (taxPercentage === 0) return subtotal;

    return subtotal * (1 + taxPercentage / 100);
  },
  serviceChargeTotal: ({
    totalBeforeTax,
    taxPercentage,
  }: DraftOutboundLine) => {
    if (taxPercentage == null) return totalBeforeTax;
    if (taxPercentage === 0) return totalBeforeTax;

    return totalBeforeTax * (1 + taxPercentage / 100);
  },
};
