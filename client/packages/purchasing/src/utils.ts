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
  PurchaseOrderLineFragment,
  PurchaseOrderRowFragment,
} from './purchase_order/api';

const purchaseOrderStatusTranslation: Record<
  PurchaseOrderNodeStatus,
  LocaleKey
> = {
  NEW: 'label.new',
  REQUEST_APPROVAL: 'label.ready-for-approval',
  CONFIRMED: 'label.ready-to-send',
  SENT: 'label.sent',
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
  purchaseOrder: PurchaseOrderFragment | PurchaseOrderRowFragment
): boolean => {
  return purchaseOrder.status === PurchaseOrderNodeStatus.Finalised;
};

export const canAddNewLines = (
  purchaseOrder: PurchaseOrderFragment
): boolean => {
  return (
    purchaseOrder.status === PurchaseOrderNodeStatus.New ||
    purchaseOrder.status === PurchaseOrderNodeStatus.RequestApproval
  );
};

export enum StatusGroup {
  BeforeConfirmed = 'NewToApproval',
  AfterConfirmed = 'AfterConfirmed',
  AfterSent = 'BeforeSent',
  ExceptSent = 'ExceptSent',
}

export const disabledStatusGroup: Record<
  StatusGroup,
  PurchaseOrderNodeStatus[]
> = {
  [StatusGroup.BeforeConfirmed]: [
    PurchaseOrderNodeStatus.New,
    PurchaseOrderNodeStatus.RequestApproval,
  ],
  [StatusGroup.AfterConfirmed]: [
    PurchaseOrderNodeStatus.Confirmed,
    PurchaseOrderNodeStatus.Sent,
  ],
  [StatusGroup.ExceptSent]: [
    PurchaseOrderNodeStatus.New,
    PurchaseOrderNodeStatus.RequestApproval,
    PurchaseOrderNodeStatus.Confirmed,
  ],
  [StatusGroup.AfterSent]: [PurchaseOrderNodeStatus.Sent],
};

/**
  Determines if a field should be editable or disabled based on the status of the purchase order
  If the status is in the disabled group, the function will return true
  When passed into the input, it overrides the 'base' disabled bool 
*/
export const isFieldDisabled = (
  status: PurchaseOrderNodeStatus,
  groupKey: StatusGroup
): boolean => {
  // Early return: if status is finalised, always disable the field
  if (status === PurchaseOrderNodeStatus.Finalised) {
    return true;
  }

  const groupForField = disabledStatusGroup[groupKey];
  return groupForField.includes(status);
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
    t('label.supplier'),
    t('label.number'),
    t('label.created'),
    t('label.confirmed'),
    t('label.sent'),
    t('label.requested-delivery-date'),
    t('label.status'),
    t('label.target-months'),
    t('label.lines'),
    t('label.comment'),
  ];

  const data = purchaseOrder.map(node => [
    node.supplier?.name,
    node.number,
    Formatter.csvDateString(node.createdDatetime),
    Formatter.csvDateString(node.confirmedDatetime),
    Formatter.csvDateString(node.sentDatetime),
    Formatter.csvDateString(node.requestedDeliveryDate),
    node.status,
    node.targetMonths,
    node.lines.totalCount,
    node.comment,
  ]);

  return Formatter.csv({ fields, data });
};

export const outstandingLinesToCsv = (
  t: TypedTFunction<LocaleKey>,
  purchaseOrderLines: PurchaseOrderLineFragment[]
) => {
  const fields: string[] = [
    t('label.purchase-order-number'),
    t('label.purchase-order-reference'),
    t('label.created-by'),
    t('label.supplier-code'),
    t('label.supplier-name'),
    t('label.item-name'),
    t('label.purchase-order-confirmed'),
    t('label.expected-delivery-date'),
    t('label.adjusted-units-expected'),
    t('label.received-units'),
    t('label.outstanding-units'),
  ];

  const data = purchaseOrderLines.map(node => [
    node.purchaseOrder?.number,
    node.purchaseOrder?.reference,
    node.purchaseOrder?.user?.username,
    node.purchaseOrder?.supplier?.code,
    node.purchaseOrder?.supplier?.name,
    node.item?.name,
    Formatter.csvDateString(node.purchaseOrder?.confirmedDatetime),
    Formatter.csvDateString(node.expectedDeliveryDate),
    node.adjustedNumberOfUnits,
    node.receivedNumberOfUnits,
    (node.adjustedNumberOfUnits ?? 0) - (node.receivedNumberOfUnits ?? 0),
  ]);

  return Formatter.csv({ fields, data });
};
