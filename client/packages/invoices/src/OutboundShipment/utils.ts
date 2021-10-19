import { LocaleKey } from '@openmsupply-client/common/src/intl/intlHelpers';
import { OutboundShipmentStatus } from '@openmsupply-client/common';
import { OutboundShipment } from './DetailView/types';

export const outboundStatuses: OutboundShipmentStatus[] = [
  'draft',
  'allocated',
  'picked',
  'shipped',
  'delivered',
];

const NextStatusButtonTranslation: Record<OutboundShipmentStatus, LocaleKey> = {
  draft: 'label.draft',
  allocated: 'label.allocation',
  picked: 'label.picked',
  shipped: 'label.shipped',
  delivered: 'label.delivered',
};

const StatusTranslation: Record<OutboundShipmentStatus, LocaleKey> = {
  draft: 'label.draft',
  allocated: 'label.allocated',
  picked: 'label.picked',
  shipped: 'label.shipped',
  delivered: 'label.delivered',
};

const getNextOutboundStatus = (
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
  return StatusTranslation[currentStatus] ?? StatusTranslation.draft;
};

export const isInvoiceSaveable = (outbound: OutboundShipment): boolean => {
  return outbound.status !== 'shipped' && outbound.status !== 'delivered';
};
