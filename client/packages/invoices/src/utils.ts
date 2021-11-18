import { LocaleKey } from '@openmsupply-client/common/src/intl';
import { OutboundShipmentStatus } from '@openmsupply-client/common';
import {
  OutboundShipment,
  OutboundShipmentRow,
  OutboundShipmentSummaryItem,
} from './OutboundShipment/DetailView/types';

export const outboundStatuses: OutboundShipmentStatus[] = [
  'DRAFT',
  'ALLOCATED',
  'PICKED',
  'SHIPPED',
  'DELIVERED',
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
): OutboundShipmentStatus | undefined => {
  const currentStatusIdx = outboundStatuses.findIndex(
    status => currentStatus === status
  );

  return outboundStatuses[currentStatusIdx + 1];
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
