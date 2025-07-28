import { PurchaseOrderLineFragment } from '../api';
import {
  LocaleKey,
  TypedTFunction,
  ArrayUtils,
  Formatter,
} from '@openmsupply-client/common';
import { ImportRow, LineNumber } from './ImportLines/PurchaseOrderLineImportModal';

// the reference data is loaded in migrations so the id here is hardcoded
export const CCE_CLASS_ID = 'fad280b6-8384-41af-84cf-c7b6b4526ef0';

function baseAssetFields(t: TypedTFunction<LocaleKey>) {
  return [
    t('label.id'),
    t('label.purchase-order-id'),
  ];
}

export const purchaseOrderLinesToCsv = (
  items: PurchaseOrderLineFragment[],
  t: TypedTFunction<LocaleKey>,
) => {

  const fields: string[] = ['id'];


  fields.push(
    ...baseAssetFields(t),
    t('label.created-datetime-UTC'),
    t('label.modified-datetime-UTC'),
  );

  const data = items.map(node => {



    return [
      node.id,
      node.purchaseOrderId,
    ];
  });

  return Formatter.csv({ fields, data });
};

export const importEquipmentToCsvWithErrors = (
  purchaseOrderLines: Partial<ImportRow & LineNumber>[],
  t: TypedTFunction<LocaleKey>,
  isCentralServer: boolean,
  properties?: string[]
) => {
  const dedupedAssetProperties = ArrayUtils.dedupe(properties ?? []);

  const fields: string[] = isCentralServer ? [t('label.store')] : [];

  fields.push(
    ...baseAssetFields(t),
    t('label.line-number'),
    ...dedupedAssetProperties,
    t('label.error-message')
  );

  const data = purchaseOrderLines.map(node => {
    const mapped: (string | number | null | undefined)[] = [
      node.id,
      node.purchaseOrderId,
    ];

    return mapped;
  });
  return Formatter.csv({ fields, data });
};

export const importEquipmentToCsv = (
  purchaseOrderLines: Partial<ImportRow>[],
  t: TypedTFunction<LocaleKey>,
) => {

  const fields: string[] = [t('label.id'), t('label.purchase-order-id')];


  const data = purchaseOrderLines.map(node => {

    const row = [
      node.id,
      node.purchaseOrderId,
    ];

    return row;
  });

  return Formatter.csv({ fields, data });
};



export const base64ToBlob = (base64: string, contentType: string) => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};
