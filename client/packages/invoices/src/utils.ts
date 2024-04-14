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
  Formatter,
  TypedTFunction,
} from '@openmsupply-client/common';
import { OutboundFragment, OutboundRowFragment } from './OutboundShipment/api';
import { InboundLineFragment } from './InboundShipment/api';
import { DraftStockOutLine, InboundItem } from './types';
import { PrescriptionRowFragment } from './Prescriptions/api';
import {
  InboundReturnFragment,
  InboundReturnRowFragment,
  OutboundReturnRowFragment,
} from './Returns';

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

export const prescriptionStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Verified,
];

export const outboundReturnStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Verified,
];

export const inboundReturnStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Verified,
];
export const manualInboundReturnStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Verified,
];

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

export const getNextOutboundReturnStatus = (
  currentStatus: InvoiceNodeStatus
): InvoiceNodeStatus | null => {
  const currentStatusIdx = outboundReturnStatuses.findIndex(
    status => currentStatus === status
  );
  const nextStatus = outboundReturnStatuses[currentStatusIdx + 1];
  return nextStatus ?? null;
};

export const getNextInboundStatus = (
  currentStatus: InvoiceNodeStatus
): InvoiceNodeStatus | null => {
  const nextStatus = nextStatusMap[currentStatus];
  return nextStatus ?? null;
};

export const getNextInboundReturnStatus = (
  currentStatus: InvoiceNodeStatus
): InvoiceNodeStatus | null => {
  const currentStatusIdx = inboundReturnStatuses.findIndex(
    status => currentStatus === status
  );
  const nextStatus = inboundReturnStatuses[currentStatusIdx + 1];
  return nextStatus ?? null;
};

export const getNextPrescriptionStatus = (
  currentStatus: InvoiceNodeStatus
): InvoiceNodeStatus | null => {
  const currentStatusIdx = prescriptionStatuses.findIndex(
    status => currentStatus === status
  );
  const nextStatus = prescriptionStatuses[currentStatusIdx + 1];
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

export const isOutboundDisabled = (
  outbound: OutboundRowFragment | OutboundReturnRowFragment
): boolean => {
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

export const isInboundReturnDisabled = (
  inboundReturn: InboundReturnRowFragment
): boolean => {
  const isManuallyCreated = !inboundReturn.linkedShipment?.id;
  return isManuallyCreated
    ? inboundReturn.status === InvoiceNodeStatus.Verified
    : inboundReturn.status === InvoiceNodeStatus.Picked ||
        inboundReturn.status === InvoiceNodeStatus.Shipped ||
        inboundReturn.status === InvoiceNodeStatus.Verified;
};

export const isPrescriptionDisabled = (
  prescription: PrescriptionRowFragment
): boolean => {
  return prescription.status === InvoiceNodeStatus.Verified;
};

export const isInboundListItemDisabled = (
  inbound: InboundRowFragment | InboundReturnRowFragment
): boolean => {
  const isManuallyCreated = !inbound.linkedShipment?.id;
  return isManuallyCreated
    ? inbound.status === InvoiceNodeStatus.Verified
    : inbound.status === InvoiceNodeStatus.Picked ||
        inbound.status === InvoiceNodeStatus.Verified;
};

export const isInboundPlaceholderRow = (row: InboundLineFragment): boolean =>
  row.type === InvoiceLineNodeType.StockIn && row.numberOfPacks === 0;

export const isInboundStatusChangeDisabled = (
  inbound: InboundFragment | InboundReturnFragment
): boolean => {
  if (inbound.onHold) return true;

  const isManuallyCreated = !inbound.linkedShipment?.id;
  return isManuallyCreated
    ? inbound.status === InvoiceNodeStatus.Verified
    : inbound.status === InvoiceNodeStatus.Picked ||
        inbound.status === InvoiceNodeStatus.Verified;
};

export const createSummaryItem = (
  itemId: string,
  lines: InboundLineFragment[]
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
export const canDeleteInvoice = (
  invoice: OutboundRowFragment | OutboundReturnRowFragment
): boolean =>
  invoice.status === InvoiceNodeStatus.New ||
  invoice.status === InvoiceNodeStatus.Allocated ||
  invoice.status === InvoiceNodeStatus.Picked;

export const canDeleteOutboundReturn = (
  outboundReturn: OutboundReturnRowFragment
): boolean =>
  outboundReturn.status === InvoiceNodeStatus.New ||
  outboundReturn.status === InvoiceNodeStatus.Picked;

export const canDeletePrescription = (
  invoice: PrescriptionRowFragment
): boolean =>
  invoice.status === InvoiceNodeStatus.New ||
  invoice.status === InvoiceNodeStatus.Picked;

export const canReturnInboundLines = (inbound: InboundFragment): boolean =>
  inbound.status === InvoiceNodeStatus.Delivered ||
  inbound.status === InvoiceNodeStatus.Verified;

export const canReturnOutboundLines = (outbound: OutboundFragment): boolean =>
  outbound.status === InvoiceNodeStatus.Shipped ||
  outbound.status === InvoiceNodeStatus.Delivered ||
  outbound.status === InvoiceNodeStatus.Verified;

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
  stockLineSubtotal: (line: DraftStockOutLine) =>
    line.numberOfPacks * (line.stockLine?.sellPricePerPack ?? 0),
};

export const outboundsToCsv = (
  invoices: OutboundRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.created'),
    t('label.reference'),
    t('label.comment'),
    t('label.total'),
  ];

  const data = invoices.map(node => [
    node.id,
    node.otherPartyName,
    node.status,
    node.invoiceNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    node.theirReference,
    node.comment,
    node.pricing.totalAfterTax,
  ]);
  return Formatter.csv({ fields, data });
};

export const outboundReturnsToCsv = (
  returns: OutboundReturnRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.created'),
  ];

  const data = returns.map(node => [
    node.id,
    node.otherPartyName,
    node.status,
    node.invoiceNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
  ]);
  return Formatter.csv({ fields, data });
};

export const inboundReturnsToCsv = (
  returns: InboundReturnRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.created'),
    t('label.confirmed'),
  ];

  const data = returns.map(node => [
    node.id,
    node.otherPartyName,
    node.status,
    node.invoiceNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    Formatter.csvDateTimeString(node.deliveredDatetime),
  ]);
  return Formatter.csv({ fields, data });
};

export const inboundsToCsv = (
  invoices: InboundRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.created'),
    t('label.confirmed'),
    t('label.comment'),
    t('label.total'),
  ];

  const data = invoices.map(node => [
    node.id,
    node.otherPartyName,
    node.status,
    node.invoiceNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    Formatter.csvDateTimeString(node.deliveredDatetime),
    node.comment,
    node.pricing.totalAfterTax,
  ]);
  return Formatter.csv({ fields, data });
};

export const prescriptionToCsv = (
  invoices: PrescriptionRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.created'),
    t('label.comment'),
  ];

  const data = invoices.map(node => [
    node.id,
    node.otherPartyName,
    node.status,
    node.invoiceNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    node.comment,
  ]);
  return Formatter.csv({ fields, data });
};

export const getPackQuantityCellId = (batch?: string | null) =>
  `pack_quantity_${batch}`;

// Returns the ID of the next *distinct* item from a collection of lines -- i.e.
// the next line that is for a different item
export const getNextItemId = (
  lines: { itemId: string }[],
  currentItemId: string | null
) => {
  if (!lines || !currentItemId) return undefined;

  const items = ArrayUtils.uniqBy(lines, line => line.itemId);

  const currentItemIndex = items.findIndex(
    line => line.itemId === currentItemId
  );
  if (currentItemIndex === -1) return;

  const nextItemIndex = items.findIndex(
    (line, index) => index > currentItemIndex && line.itemId !== currentItemId
  );
  return nextItemIndex === -1 ? undefined : items[nextItemIndex]?.itemId;
};
