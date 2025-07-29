import { LocaleKey, useTranslation } from '@common/intl';
import { PurchaseOrderNodeStatus } from '@common/types';
import { PurchaseOrderFragment } from './api';

const statusTranslation: Record<PurchaseOrderNodeStatus, LocaleKey> = {
  NEW: 'label.new',
  AUTHORISED: 'label.authorised',
  CONFIRMED: 'label.confirmed',
  FINALISED: 'label.finalised',
};

export enum DeliveryStatus {
  NotDelivered = 'NOT_DELIVERED',
  PartiallyDelivered = 'PARTIALLY_DELIVERED',
  FullyDelivered = 'FULLY_DELIVERED',
}

const deliveryStatusTranslation: Record<DeliveryStatus, LocaleKey> = {
  NOT_DELIVERED: 'label.not-delivered',
  PARTIALLY_DELIVERED: 'label.partially-delivered',
  FULLY_DELIVERED: 'label.fully-delivered',
};

export const getStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: PurchaseOrderNodeStatus): string => {
    return t(
      statusTranslation[currentStatus] ??
        statusTranslation[PurchaseOrderNodeStatus.New]
    );
  };

export const getDeliveryStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: DeliveryStatus): string => {
    return t(
      deliveryStatusTranslation[currentStatus] ??
        deliveryStatusTranslation[DeliveryStatus.NotDelivered]
    );
  };

export const isPurchaseOrderDisabled = (purchaseOrder: PurchaseOrderFragment): boolean => {
  return (
    purchaseOrder.status === PurchaseOrderNodeStatus.Finalised
  );
}