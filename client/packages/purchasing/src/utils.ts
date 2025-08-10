import { LocaleKey, useTranslation } from '@common/intl';
import {
  PurchaseOrderNodeStatus,
  GoodsReceivedNodeStatus,
} from '@common/types';
import { PurchaseOrderFragment } from './purchase_order/api';

const purchaseOrderStatusTranslation: Record<PurchaseOrderNodeStatus, LocaleKey> = {
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

const goodsReceivedStatusTranslation: Record<
  GoodsReceivedNodeStatus,
  LocaleKey
> = {
  NEW: 'label.new',
  CONFIRMED: 'label.confirmed',
  AUTHORISED: 'label.authorised',
  FINALISED: 'label.finalised',
};

export const getPurchaseOrderStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: PurchaseOrderNodeStatus): string => {
    return t(
      purchaseOrderStatusTranslation[currentStatus] ??
        purchaseOrderStatusTranslation[PurchaseOrderNodeStatus.New]
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

export const getGoodsReceivedStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: unknown): string => {
    const status = currentStatus as GoodsReceivedNodeStatus;
    return t(
      goodsReceivedStatusTranslation[status] ??
        goodsReceivedStatusTranslation[GoodsReceivedNodeStatus.New]
    );
  };

export const isPurchaseOrderDisabled = (
  purchaseOrder: PurchaseOrderFragment
): boolean => {
  return purchaseOrder.status === PurchaseOrderNodeStatus.Finalised;
};
