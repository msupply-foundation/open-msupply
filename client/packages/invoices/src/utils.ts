import {
  getUnitQuantity,
  getSumOfKeyReducer,
  LocaleKey,
  InvoiceNodeStatus,
  useTranslation,
  InvoiceNodeType,
  groupBy,
  ifTheSameElseDefault,
  arrayToRecord,
} from '@openmsupply-client/common';
import {
  OutboundShipment,
  OutboundShipmentRow,
  OutboundShipmentSummaryItem,
  InboundShipment,
  InboundShipmentItem,
  InboundShipmentRow,
  Invoice,
  InvoiceLine,
} from './types';

export const placeholderInbound: InboundShipment = {
  id: '',
  otherPartyName: '',
  comment: '',
  theirReference: '',
  otherParty: undefined,
  otherPartyId: '',
  items: [],
  status: InvoiceNodeStatus.New,
  type: InvoiceNodeType.InboundShipment,
  createdDatetime: '',
  invoiceNumber: 0,
  lines: [],
  pricing: {
    totalAfterTax: 0,
  },
  onHold: false,
  allocatedDatetime: '',
  shippedDatetime: '',
  pickedDatetime: '',
  deliveredDatetime: '',

  // color: 'grey',
  // subtotal: 0,
  // taxPercentage: 0
  // dispatch: null,
  // purchaseOrderNumber: undefined,
  // goodsReceiptNumber: undefined,
  // requisitionNumber: undefined,
  // inboundShipmentNumber: undefined,
  // transportReference: undefined,
  // shippingMethod: undefined,
  // enteredByName: '',
  // donorName: '',
};

export const placeholderInvoice: Invoice = {
  id: '',
  otherPartyName: '',
  comment: '',
  theirReference: '',
  status: InvoiceNodeStatus.New,
  type: InvoiceNodeType.OutboundShipment,
  createdDatetime: '',
  allocatedDatetime: '',
  shippedDatetime: '',
  pickedDatetime: '',
  deliveredDatetime: '',
  invoiceNumber: 0,
  onHold: false,
  otherParty: undefined,
  otherPartyId: '',
  lines: [],
  pricing: {
    totalAfterTax: 0,
    //  subtotal: 0,
    //   taxPercentage: 0
  },
};

export const placeholderOutboundShipment: OutboundShipment = {
  id: '',
  otherPartyName: '',
  comment: '',
  theirReference: '',
  status: InvoiceNodeStatus.New,
  type: InvoiceNodeType.OutboundShipment,
  createdDatetime: '',
  allocatedDatetime: '',
  shippedDatetime: '',
  pickedDatetime: '',
  deliveredDatetime: '',
  invoiceNumber: 0,
  onHold: false,
  otherParty: undefined,
  otherPartyId: '',
  items: [],
  pricing: {
    totalAfterTax: 0,
    //  subtotal: 0,
    //   taxPercentage: 0
  },

  // color: 'grey',
  // purchaseOrderNumber: undefined,
  // goodsReceiptNumber: undefined,
  // requisitionNumber: undefined,
  // inboundShipmentNumber: undefined,
  // transportReference: undefined,
  // shippingMethod: undefined,
  // enteredByName: '',
  // donorName: '',
};

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

const statusTranslation: Record<InvoiceNodeStatus, LocaleKey> = {
  ALLOCATED: 'label.allocated',
  PICKED: 'label.picked',
  SHIPPED: 'label.shipped',
  DELIVERED: 'label.delivered',
  NEW: 'label.new',
  VERIFIED: 'label.verified',
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
  const currentStatusIdx = inboundStatuses.findIndex(
    status => currentStatus === status
  );

  const nextStatus = inboundStatuses[currentStatusIdx + 1];

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

export const isInboundEditable = (inbound: InboundShipment): boolean => {
  // return inbound.status !== 'VERIFIED' && inbound.status !== 'DELIVERED';
  return inbound.status === 'NEW';
};

export const flattenOutboundItems = (
  summaryItems: OutboundShipmentSummaryItem[]
): OutboundShipmentRow[] => {
  return summaryItems.map(({ batches }) => Object.values(batches)).flat();
};

export const flattenInboundItems = (
  summaryItems: InboundShipmentItem[]
): InboundShipmentRow[] => {
  return summaryItems.map(({ batches }) => Object.values(batches)).flat();
};

export const createSummaryItem = (
  itemId: string,
  batches: InboundShipmentRow[] = []
): InboundShipmentItem => {
  const item: InboundShipmentItem = {
    id: itemId,
    itemId: itemId,
    itemName: ifTheSameElseDefault(batches, 'itemName', ''),
    itemCode: ifTheSameElseDefault(batches, 'itemCode', ''),
    batches: arrayToRecord(batches),
    unitQuantity: batches.reduce(getUnitQuantity, 0),
    numberOfPacks: batches.reduce(getSumOfKeyReducer('numberOfPacks'), 0),
    locationName: ifTheSameElseDefault(batches, 'locationName', undefined),
    batch: ifTheSameElseDefault(batches, 'batch', '[multiple]'),
    sellPrice: ifTheSameElseDefault(batches, 'sellPricePerPack', undefined),
    packSize: ifTheSameElseDefault(batches, 'packSize', undefined),
  };

  return item;
};

export const inboundLinesToSummaryItems = (
  lines: InvoiceLine[]
): OutboundShipmentSummaryItem[] => {
  const grouped = groupBy(lines, 'itemId');
  return Object.keys(grouped).map(itemId =>
    createSummaryItem(itemId, grouped[itemId])
  );
};
