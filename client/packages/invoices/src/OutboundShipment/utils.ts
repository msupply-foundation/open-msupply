import { LocaleKey } from '@openmsupply-client/common/src/intl';
import {
  OutboundShipmentStatus,
  useTranslation,
} from '@openmsupply-client/common';
import {
  OutboundShipment,
  OutboundShipmentRow,
  OutboundShipmentSummaryItem,
} from './DetailView/types';

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

export const getStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: OutboundShipmentStatus): string => {
    return t(StatusTranslation[currentStatus] ?? StatusTranslation.DRAFT);
  };

export const isInvoiceEditable = (outbound: OutboundShipment): boolean => {
  return outbound.status !== 'SHIPPED' && outbound.status !== 'DELIVERED';
};

const parseValue = (object: any, key: string) => {
  const value = object[key];
  if (typeof value === 'string') {
    const valueAsNumber = Number.parseFloat(value);

    if (!Number.isNaN(valueAsNumber)) return valueAsNumber;
    return value.toUpperCase(); // ignore case
  }
  return value;
};

export const getDataSorter =
  (sortKey: any, desc: boolean) => (a: any, b: any) => {
    const valueA = parseValue(a, sortKey);
    const valueB = parseValue(b, sortKey);

    if (valueA < valueB) {
      return desc ? 1 : -1;
    }
    if (valueA > valueB) {
      return desc ? -1 : 1;
    }

    return 0;
  };

export const flattenSummaryItems = (
  summaryItems: OutboundShipmentSummaryItem[]
): OutboundShipmentRow[] => {
  return summaryItems.map(({ batches }) => Object.values(batches)).flat();
};
