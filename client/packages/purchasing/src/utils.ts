import {
  LocaleKey,
  TypedTFunction,
  useTranslation,
  PurchaseOrderNodeStatus,
  GoodsReceivedNodeStatus,
  Formatter,
} from '@openmsupply-client/common';
import {
  PurchaseOrderFragment,
  PurchaseOrderRowFragment,
} from './purchase_order/api';

const purchaseOrderStatusTranslation: Record<
  PurchaseOrderNodeStatus,
  LocaleKey
> = {
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

export const isPurchaseOrderConfirmed = (
  purchaseOrder: PurchaseOrderFragment
): boolean => {
  return (
    purchaseOrder.status === PurchaseOrderNodeStatus.Confirmed ||
    purchaseOrder.status === PurchaseOrderNodeStatus.Finalised
  );
};

export const canEditOriginalQuantity = (
  purchaseOrder: PurchaseOrderFragment
): boolean => {
  // Can only edit original quantity when PO is NEW
  return (
    purchaseOrder.status === PurchaseOrderNodeStatus.New ||
    purchaseOrder.status === PurchaseOrderNodeStatus.Authorised
  );
};

export const canEditAdjustedQuantity = (
  purchaseOrder: PurchaseOrderFragment
): boolean => {
  // Can edit adjusted quantity when confirmed but not finalised
  return (
    purchaseOrder.status === PurchaseOrderNodeStatus.Confirmed ||
    purchaseOrder.status === PurchaseOrderNodeStatus.Authorised
  );
};

export const canAddNewLines = (
  purchaseOrder: PurchaseOrderFragment
): boolean => {
  // Can add lines when NEW or CONFIRMED/AUTHORISED (but not finalised)
  return purchaseOrder.status !== PurchaseOrderNodeStatus.Finalised;
};

export const isGoodsReceivedEditable = (
  status: GoodsReceivedNodeStatus
): boolean => {
  return status !== GoodsReceivedNodeStatus.Finalised;
};

export const purchaseOrderToCsv = (
  t: TypedTFunction<LocaleKey>,
  purchaseOrder: PurchaseOrderRowFragment[]
) => {
  const fields: string[] = [
    'id',
    t('label.supplier'),
    t('label.number'),
    t('label.created'),
    t('label.confirmed'),
    t('label.sent'),
    t('label.requested-delivery-date'),
    t('label.status'),
    // t('label.delivery-status'), TODO: add back once we have data?
    // t('label.delivered'),
    t('label.target-months'),
    t('label.lines'),
  ];

  const data = purchaseOrder.map(node => [
    node.id,
    node.supplier?.name,
    node.number,
    node.createdDatetime,
    node.confirmedDatetime,
    node.sentDatetime,
    node.requestedDeliveryDate,
    node.status,
    node.targetMonths,
    node.lines.totalCount,
  ]);

  return Formatter.csv({ fields, data });
};
