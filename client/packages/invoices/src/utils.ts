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
  noOtherVariants,
  InvoiceNodeType,
  SplitButtonOption,
} from '@openmsupply-client/common';
import { OutboundFragment, OutboundRowFragment } from './OutboundShipment/api';
import { InboundLineFragment } from './InboundShipment/api';
import { InboundItem } from './types';
import {
  PrescriptionLineFragment,
  PrescriptionRowFragment,
} from './Prescriptions/api';
import {
  CustomerReturnFragment,
  CustomerReturnRowFragment,
  SupplierReturnRowFragment,
} from './Returns';

export const outboundStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Allocated,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Received,
  InvoiceNodeStatus.Verified,
];

export const inboundStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Received,
  InvoiceNodeStatus.Verified,
];

export const manualInboundStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Received,
  InvoiceNodeStatus.Verified,
];

export const prescriptionStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Verified,
  InvoiceNodeStatus.Cancelled,
];

export const supplierReturnStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Received,
  InvoiceNodeStatus.Verified,
];

export const customerReturnStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Received,
  InvoiceNodeStatus.Verified,
];
export const manualCustomerReturnStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Received,
  InvoiceNodeStatus.Verified,
];

const statusTranslation: Record<InvoiceNodeStatus, LocaleKey> = {
  ALLOCATED: 'label.allocated',
  PICKED: 'label.picked',
  SHIPPED: 'label.shipped',
  DELIVERED: 'label.delivered',
  RECEIVED: 'label.received',
  NEW: 'label.new',
  VERIFIED: 'label.verified',
  CANCELLED: 'label.cancelled',
};

export const getPreviousStatus = (
  currentStatus: InvoiceNodeStatus,
  validStatuses: InvoiceNodeStatus[],
  sequence: InvoiceNodeStatus[]
): InvoiceNodeStatus => {
  const currentIndex = sequence.findIndex(status => status === currentStatus);

  const previousValidStatus = sequence
    .slice(0, currentIndex)
    .reverse()
    .find(status => validStatuses.includes(status));

  return previousValidStatus ?? InvoiceNodeStatus.New;
};

export const getNextStatusOption = (
  status: InvoiceNodeStatus | undefined,
  options: SplitButtonOption<InvoiceNodeStatus>[]
): SplitButtonOption<InvoiceNodeStatus> | null => {
  if (!status) return options[0] ?? null;

  const currentIndex = options.findIndex(o => o.value === status);
  const nextOption = options[currentIndex + 1];
  return nextOption || null;
};

export const getButtonLabel =
  (t: ReturnType<typeof useTranslation>) =>
  (invoiceStatus: InvoiceNodeStatus): string => {
    return t('button.save-and-confirm-status', {
      status: getStatusTranslator(t)(invoiceStatus),
    });
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
  outbound: OutboundRowFragment | SupplierReturnRowFragment
): boolean => {
  switch (outbound.status) {
    case InvoiceNodeStatus.New:
    case InvoiceNodeStatus.Allocated:
    case InvoiceNodeStatus.Picked:
      return false;
    case InvoiceNodeStatus.Shipped:
    case InvoiceNodeStatus.Delivered:
    case InvoiceNodeStatus.Received:
    case InvoiceNodeStatus.Verified:
    case InvoiceNodeStatus.Cancelled:
      return true;
    default:
      return noOtherVariants(outbound.status);
  }
};

/** Returns true if the inbound shipment cannot be edited */
export const isInboundDisabled = (inbound: InboundRowFragment): boolean => {
  const isManuallyCreated = !inbound.linkedShipment?.id;
  if (isManuallyCreated) {
    return inbound.status === InvoiceNodeStatus.Verified;
  }
  switch (inbound.status) {
    case InvoiceNodeStatus.New:
    case InvoiceNodeStatus.Delivered:
    // Inbound shipments can be edited when having been received (Note: was previous known as Delivered)
    case InvoiceNodeStatus.Received:
      return false;
    case InvoiceNodeStatus.Verified:
    case InvoiceNodeStatus.Allocated:
    case InvoiceNodeStatus.Picked:
    case InvoiceNodeStatus.Shipped:
    case InvoiceNodeStatus.Cancelled:
      return true;
    default:
      return noOtherVariants(inbound.status);
  }
};

/** Returns true if the inbound shipment can be put on hold */
export const isInboundHoldable = (inbound: InboundRowFragment): boolean =>
  inbound.status !== InvoiceNodeStatus.Verified;

export const isCustomerReturnDisabled = (
  customerReturn: CustomerReturnRowFragment
): boolean => {
  const isManuallyCreated = !customerReturn.linkedShipment?.id;
  return isManuallyCreated
    ? customerReturn.status === InvoiceNodeStatus.Verified
    : customerReturn.status === InvoiceNodeStatus.Picked ||
        customerReturn.status === InvoiceNodeStatus.Shipped ||
        customerReturn.status === InvoiceNodeStatus.Verified;
};

export const isPrescriptionDisabled = (
  prescription: PrescriptionRowFragment
): boolean => {
  return (
    prescription.status === InvoiceNodeStatus.Verified ||
    prescription.status === InvoiceNodeStatus.Cancelled
  );
};

export const isPrescriptionPlaceholderRow = (row: PrescriptionLineFragment) =>
  row.type === InvoiceLineNodeType.UnallocatedStock && !row.numberOfPacks;

export const isInboundListItemDisabled = (
  inbound: InboundRowFragment | CustomerReturnRowFragment
): boolean => {
  const isManuallyCreated = !inbound.linkedShipment?.id;
  return isManuallyCreated
    ? inbound.status === InvoiceNodeStatus.Verified
    : inbound.status === InvoiceNodeStatus.Picked ||
        inbound.status === InvoiceNodeStatus.Verified;
};

export const isInboundPlaceholderRow = (row: InboundLineFragment): boolean =>
  row.type === InvoiceLineNodeType.StockIn &&
  row.numberOfPacks === 0 &&
  !row.shippedNumberOfPacks;

export const isInboundStatusChangeDisabled = (
  inbound: InboundFragment | CustomerReturnFragment
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
  invoice:
    | OutboundRowFragment
    | SupplierReturnRowFragment
    | PrescriptionRowFragment
): boolean =>
  invoice.status === InvoiceNodeStatus.New ||
  invoice.status === InvoiceNodeStatus.Allocated ||
  invoice.status === InvoiceNodeStatus.Picked;

export const canCancelInvoice = (invoice: PrescriptionRowFragment) =>
  invoice.type === InvoiceNodeType.Prescription &&
  invoice.status === InvoiceNodeStatus.Verified &&
  !invoice.isCancellation;

export const canDeleteSupplierReturn = (
  SupplierReturn: SupplierReturnRowFragment
): boolean =>
  SupplierReturn.status === InvoiceNodeStatus.New ||
  SupplierReturn.status === InvoiceNodeStatus.Picked;

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

export const outboundsToCsv = (
  invoices: OutboundRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.created'),
    t('label.reference'),
    t('label.total'),
    t('label.comment'),
  ];

  const data = invoices.map(node => [
    node.otherPartyName,
    node.status,
    node.invoiceNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    node.theirReference,
    node.pricing.totalAfterTax,
    node.comment,
  ]);
  return Formatter.csv({ fields, data });
};

export const supplierReturnsToCsv = (
  returns: SupplierReturnRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.created'),
    t('label.reference'),
  ];

  const data = returns.map(node => [
    node.otherPartyName,
    node.status,
    node.invoiceNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    node.theirReference,
  ]);
  return Formatter.csv({ fields, data });
};

export const customerReturnsToCsv = (
  returns: CustomerReturnRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.created'),
    t('label.reference'),
    t('label.comment'),
  ];

  const data = returns.map(node => [
    node.otherPartyName,
    node.status,
    node.invoiceNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    node.theirReference,
    node.comment,
  ]);
  return Formatter.csv({ fields, data });
};

export const inboundsToCsv = (
  invoices: InboundRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    t('label.name'),
    t('label.invoice-number'),
    t('label.created'),
    t('label.delivered'),
    t('label.status'),
    t('label.reference'),
    t('label.total'),
    t('label.comment'),
  ];

  const data = invoices.map(node => [
    node.otherPartyName,
    node.invoiceNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    Formatter.csvDateTimeString(node.deliveredDatetime),
    node.status,
    node.theirReference,
    node.pricing.totalAfterTax,
    node.comment,
  ]);
  return Formatter.csv({ fields, data });
};

export const prescriptionToCsv = (
  invoices: PrescriptionRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.prescription-date'),
    t('label.reference'),
    t('label.comment'),
  ];

  const data = invoices.map(node => [
    node.otherPartyName,
    t(getStatusTranslation(node.status)),
    node.invoiceNumber,
    Formatter.csvDateTimeString(node.prescriptionDate || node.createdDatetime),
    node.theirReference,
    node.comment,
  ]);
  return Formatter.csv({ fields, data });
};

export const getStockOutQuantityCellId = (batch?: string | null) =>
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
