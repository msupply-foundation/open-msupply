import { PurchaseOrderLineFragment } from '../api';
import {
  LocaleKey,
  TypedTFunction,
  Formatter,
} from '@openmsupply-client/common';
import {
  ImportRow,
  LineNumber,
} from './ImportLines/PurchaseOrderLineImportModal';

function basePurchaseOrderLineFields(t: TypedTFunction<LocaleKey>) {
  return [t('label.code'), t('label.pack-size'), t('label.requested')];
}

export const purchaseOrderLinesToCsv = (
  items: PurchaseOrderLineFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = ['id'];

  fields.push(
    ...basePurchaseOrderLineFields(t),
    t('label.created-datetime-UTC'),
    t('label.modified-datetime-UTC')
  );

  const data = items.map(node => {
    return [node.id, node.purchaseOrderId, node.item.id];
  });

  return Formatter.csv({ fields, data });
};

export const importPurchaseOrderLinesToCSVWithErrors = (
  purchaseOrderLines: Partial<ImportRow & LineNumber>[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [];

  fields.push(
    ...basePurchaseOrderLineFields(t),
    t('label.line-number'),
    t('label.error-message')
  );

  const data = purchaseOrderLines.map(node => {
    const mapped: (string | number | null | undefined)[] = [
      node.itemCode,
      node.requestedPackSize,
      node.requestedNumberOfUnits,
      node.lineNumber,
      node.errorMessage,
    ];

    return mapped;
  });
  return Formatter.csv({ fields, data });
};

export const importPurchaseOrderLinesToCsv = (
  purchaseOrderLines: Partial<ImportRow>[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    t('label.code'),
    t('label.pack-size'),
    t('label.requested'),
  ];

  const data = purchaseOrderLines.map(node => {
    const row = [
      node.itemCode,
      node.requestedPackSize,
      node.requestedNumberOfUnits,
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
