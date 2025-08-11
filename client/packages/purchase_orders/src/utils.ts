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

export const isPurchaseOrderDisabled = (
  purchaseOrder: PurchaseOrderFragment
): boolean => {
  return purchaseOrder.status === PurchaseOrderNodeStatus.Finalised;
};

export const isPurchaseOrderConfirmed = (
  purchaseOrder: PurchaseOrderFragment
): boolean => {
  return purchaseOrder.status === PurchaseOrderNodeStatus.Confirmed ||
         purchaseOrder.status === PurchaseOrderNodeStatus.Authorised ||
         purchaseOrder.status === PurchaseOrderNodeStatus.Finalised;
};

export const canEditOriginalQuantity = (
  purchaseOrder: PurchaseOrderFragment
): boolean => {
  // Can only edit original quantity when PO is NEW
  return purchaseOrder.status === PurchaseOrderNodeStatus.New;
};

export const canEditAdjustedQuantity = (
  purchaseOrder: PurchaseOrderFragment
): boolean => {
  // Can edit adjusted quantity when confirmed but not finalised
  return purchaseOrder.status === PurchaseOrderNodeStatus.Confirmed ||
         purchaseOrder.status === PurchaseOrderNodeStatus.Authorised;
};

export const canAddNewLines = (
  purchaseOrder: PurchaseOrderFragment
): boolean => {
  // Can add lines when NEW or CONFIRMED/AUTHORISED (but not finalised)
  return purchaseOrder.status !== PurchaseOrderNodeStatus.Finalised;
};
