import {
  InvoiceNodeStatus,
  InvoiceNodeType,
} from './../../common/src/types/schema';
import { LocaleKey } from '@openmsupply-client/common/src/intl';
import { OutboundShipmentStatus } from '@openmsupply-client/common';
import {
  OutboundShipment,
  OutboundShipmentRow,
  OutboundShipmentSummaryItem,
} from './types';

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

const NextStatusButtonTranslation: Record<OutboundShipmentStatus, LocaleKey> = {
  DRAFT: 'label.draft',
  ALLOCATED: 'label.allocation',
  PICKED: 'label.picked',
  SHIPPED: 'label.shipped',
  DELIVERED: 'label.delivered',
};

const StatusTranslation: Record<OutboundShipmentStatus, LocaleKey> = {
  DRAFT: 'label.draft',
  ALLOCATED: 'label.allocated',
  PICKED: 'label.picked',
  SHIPPED: 'label.shipped',
  DELIVERED: 'label.delivered',
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

export const getNextOutboundStatusButtonTranslation = (
  currentStatus: OutboundShipmentStatus
): LocaleKey | undefined => {
  const nextStatus = getNextOutboundStatus(currentStatus);

  if (nextStatus) return NextStatusButtonTranslation[nextStatus];

  return undefined;
};

export const getStatusTranslation = (
  currentStatus: OutboundShipmentStatus
): LocaleKey => {
  return StatusTranslation[currentStatus] ?? StatusTranslation.DRAFT;
};

export const isInvoiceEditable = (outbound: OutboundShipment): boolean => {
  return outbound.status !== 'SHIPPED' && outbound.status !== 'DELIVERED';
};

export const flattenSummaryItems = (
  summaryItems: OutboundShipmentSummaryItem[]
): OutboundShipmentRow[] => {
  return summaryItems.map(({ batches }) => Object.values(batches)).flat();
};
