import {
  Formatter,
  GoodsReceivedNodeStatus,
  LocaleKey,
  TypedTFunction,
} from '@openmsupply-client/common';
import {  GoodsReceivedRowFragment } from './api/operations.generated';

export const canDeleteGoodsReceived = (row: GoodsReceivedRowFragment): boolean =>
  row.status === GoodsReceivedNodeStatus.New;

export const goodsReceivedToCsv = (
  goodsReceived: GoodsReceivedRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    t('label.supplier'),
    t('label.status'),
    t('label.purchase-order-number'),
    t('label.supplier-reference'),
    t('label.created'),
    t('label.received'),
  ];

  const data = goodsReceived.map(node => [
    node.supplier?.name ?? '',
    node.status,
    node.purchaseOrderNumber?.toString() ?? '',
    node.supplierReference ?? '',
    node.createdDatetime,
    node.receivedDatetime ?? '',
  ]);
  return Formatter.csv({ fields, data });
};
