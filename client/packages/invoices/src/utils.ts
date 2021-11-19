import {
  LocaleKey,
  InvoiceNodeStatus,
  useTranslation,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import {
  OutboundShipment,
  OutboundShipmentRow,
  OutboundShipmentSummaryItem,
  OutboundShipmentStatus,
  InboundShipment,
  InboundShipmentStatus,
  InboundShipmentItem,
  InboundShipmentRow,
} from './types';

export const placeholderInbound: InboundShipment = {
  id: '',
  otherPartyName: '',
  total: '',
  comment: '',
  theirReference: '',
  color: 'grey',
  status: 'NEW',
  type: InvoiceNodeType.InboundShipment,
  entryDatetime: '',
  invoiceNumber: 0,
  lines: [],
  pricing: { totalAfterTax: 0, subtotal: 0, taxPercentage: 0 },
  dispatch: null,
  onHold: false,

  allocatedDatetime: '',
  shippedDatetime: '',
  pickedDatetime: '',
  deliveredDatetime: '',

  purchaseOrderNumber: undefined,
  goodsReceiptNumber: undefined,
  requisitionNumber: undefined,
  inboundShipmentNumber: undefined,

  transportReference: undefined,
  shippingMethod: undefined,

  otherParty: undefined,

  enteredByName: '',

  donorName: '',
  otherPartyId: '',
  items: [],
};

export const placeholderInvoice: OutboundShipment = {
  id: '',
  otherPartyName: '',
  total: '',
  comment: '',
  theirReference: '',
  color: 'grey',
  status: InvoiceNodeStatus.Draft,
  type: InvoiceNodeType.OutboundShipment,
  entryDatetime: '',
  invoiceNumber: 0,
  lines: [],
  pricing: { totalAfterTax: 0, subtotal: 0, taxPercentage: 0 },
  dispatch: null,
  onHold: false,

  allocatedDatetime: '',
  shippedDatetime: '',
  pickedDatetime: '',
  deliveredDatetime: '',

  purchaseOrderNumber: undefined,
  goodsReceiptNumber: undefined,
  requisitionNumber: undefined,
  inboundShipmentNumber: undefined,

  transportReference: undefined,
  shippingMethod: undefined,

  otherParty: undefined,

  enteredByName: '',

  donorName: '',
  otherPartyId: '',
  items: [],
};

export const outboundStatuses: OutboundShipmentStatus[] = [
  InvoiceNodeStatus.Allocated,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Draft,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
];

export const inboundStatuses: InboundShipmentStatus[] = [
  'NEW',
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  'VERIFIED',
];

const statusTranslation: Record<
  OutboundShipmentStatus | InboundShipmentStatus,
  LocaleKey
> = {
  DRAFT: 'label.draft',
  ALLOCATED: 'label.allocated',
  PICKED: 'label.picked',
  SHIPPED: 'label.shipped',
  DELIVERED: 'label.delivered',

  // TODO: Update this to be the correct translation
  NEW: 'label.draft',
  VERIFIED: 'label.delivered',
};

export const getNextOutboundStatus = (
  currentStatus: OutboundShipmentStatus
): OutboundShipmentStatus => {
  const currentStatusIdx = outboundStatuses.findIndex(
    status => currentStatus === status
  );

  const nextStatus = outboundStatuses[currentStatusIdx + 1];

  if (!nextStatus) throw new Error('Could not find the next status');

  return nextStatus;
};

export const getNextInboundStatus = (
  currentStatus: InboundShipmentStatus
): InboundShipmentStatus => {
  const currentStatusIdx = inboundStatuses.findIndex(
    status => currentStatus === status
  );

  const nextStatus = inboundStatuses[currentStatusIdx + 1];

  if (!nextStatus) throw new Error('Could not find the next status');

  return nextStatus;
};

export const getNextOutboundStatusButtonTranslation = (
  currentStatus: OutboundShipmentStatus
): LocaleKey | undefined => {
  const nextStatus = getNextOutboundStatus(currentStatus);

  if (nextStatus) return statusTranslation[nextStatus];

  return undefined;
};

export const getNextInboundStatusButtonTranslation = (
  currentStatus: InboundShipmentStatus
): LocaleKey | undefined => {
  const nextStatus = getNextInboundStatus(currentStatus);

  if (nextStatus) return statusTranslation[nextStatus];

  return undefined;
};

export const getStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: OutboundShipmentStatus): string => {
    return t(statusTranslation[currentStatus] ?? statusTranslation.DRAFT);
  };

export const isInvoiceEditable = (outbound: OutboundShipment): boolean => {
  return outbound.status !== 'SHIPPED' && outbound.status !== 'DELIVERED';
};

export const isInboundEditable = (inbound: InboundShipment): boolean => {
  return inbound.status !== 'VERIFIED' && inbound.status !== 'DELIVERED';
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
