import { t } from '@/intl';
import { parseCsv, sniffSeparator, toCsv } from '@/domain/reportFiles';
import {
  findHeaderRow,
  parseImportDate,
  parseImportNumber,
  type ImportFileFailure,
} from '@/domain/csvImport';
import type { InsertPurchaseOrderLineVariables } from '../purchaseOrderDetail.generated';
import { discountPercentage } from '../edit-modal/purchaseOrderLineEdit';

export type ImportRow = {
  /** The id the line will be inserted under. */
  id: string;
  /** 1-based, counting the heading row as 1 — what the file shows the user. */
  lineNumber: number;
  itemCode: string;
  requestedPackSize: number;
  packs: number;
  supplierItemCode: string;
  pricePerPackBeforeDiscount: number;
  discountPercentage: number;
  pricePerPackAfterDiscount: number;
  requestedDeliveryDate: string | null;
  expectedDeliveryDate: string | null;
  comment: string;
  note: string;
  /** Rejections — any one keeps the whole file from importing. */
  errors: string[];
  /** A dropped value the row imports without. */
  warnings: string[];
};

/** The file's columns, in order, by the labels the example file writes. */
export const importColumnKeys = (): string[] => [
  t('label.code'),
  t('label.pack-size'),
  t('label.requested-packs'),
  t('label.supplier-item-code'),
  t('label.price-per-pack-before-discount'),
  t('label.discount-percentage'),
  t('label.price-per-pack-after-discount'),
  t('label.requested-delivery-date'),
  t('label.expected-delivery-date'),
  t('label.comment'),
  t('label.notes'),
];

/**
 * The downloadable example (OMS-FUN-PO-09.6): the heading row and one row
 * showing the shape each cell takes — an item code, whole numbers, and the
 * date format the two date columns expect.
 */
export const buildTemplateCsv = (): string => {
  const dateFormat = t('label.date-format');
  return toCsv(importColumnKeys(), [
    [t('label.code'), 1, 0, '', 0, 0, 0, dateFormat, dateFormat, '', ''],
  ]);
};

/**
 * Read a file into rows, each checked (OMS-FUN-PO-09.3/.7/.8): the pack size
 * must be greater than zero, the discount at most 100, the after-discount
 * price no greater than the before-discount price, and no two rows may repeat
 * an item and pack size. The before-price and, where given, the after-price
 * are taken as written and the percentage is recovered from them; an absent
 * after-price is computed from the percentage instead. An unreadable date is
 * dropped with a warning; an unreadable number reads as zero.
 */
export const parseImportFile = (
  text: string,
  newId: () => string
): ImportRow[] | ImportFileFailure => {
  const separator = sniffSeparator(text);
  const table = parseCsv(text, separator);
  const headerIndex = findHeaderRow(table, importColumnKeys());
  if (headerIndex === -1) return 'no-header';
  const [header = [], ...body] = table.slice(headerIndex);
  if (body.length === 0) return 'no-rows';
  const decimalComma = separator === ';';
  const columnAt = new Map(
    header.map((name, index) => [name.trim().toLowerCase(), index])
  );
  const cell = (cells: string[], name: string): string => {
    const index = columnAt.get(name.trim().toLowerCase());
    return index === undefined ? '' : (cells[index] ?? '').trim();
  };
  const number = (cells: string[], name: string): number | undefined =>
    parseImportNumber(cell(cells, name), decimalComma);

  const pairKey = (cells: string[]) =>
    `${cell(cells, t('label.code')).toLowerCase()}|${
      number(cells, t('label.pack-size')) ?? 0
    }`;
  const pairCounts = new Map<string, number>();
  for (const cells of body) {
    const key = pairKey(cells);
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  return body.map((cells, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const itemCode = cell(cells, t('label.code'));
    if (!itemCode)
      errors.push(
        t('error.field-must-be-specified', { field: t('label.code') })
      );
    else if ((pairCounts.get(pairKey(cells)) ?? 0) > 1)
      errors.push(
        t('error.duplicated-combination', {
          fields: `${t('label.code')}, ${t('label.pack-size')}`,
        })
      );

    const requestedPackSize = number(cells, t('label.pack-size')) ?? 0;
    if (requestedPackSize <= 0)
      errors.push(t('error.pack-size-must-be-greater-than-zero'));

    const packs = number(cells, t('label.requested-packs')) ?? 0;

    const before =
      number(cells, t('label.price-per-pack-before-discount')) ?? 0;
    const discountCell = number(cells, t('label.discount-percentage'));
    if (discountCell !== undefined && discountCell > 100)
      errors.push(t('error.discount-exceeds-maximum'));
    const afterCell = number(cells, t('label.price-per-pack-after-discount'));
    const after =
      afterCell ??
      before * (1 - Math.min(Math.max(discountCell ?? 0, 0), 100) / 100);
    if (after > before)
      errors.push(
        t('error.price-after-discount-cannot-exceed-price-before-discount')
      );

    const date = (name: string): string | null => {
      const raw = cell(cells, name);
      if (!raw) return null;
      const parsed = parseImportDate(raw);
      if (!parsed)
        warnings.push(t('warning.field-not-parsed', { field: name }));
      return parsed;
    };

    return {
      id: newId(),
      lineNumber: headerIndex + index + 2,
      itemCode,
      requestedPackSize,
      packs,
      supplierItemCode: cell(cells, t('label.supplier-item-code')),
      pricePerPackBeforeDiscount: before,
      discountPercentage: discountPercentage(before, after),
      pricePerPackAfterDiscount: after,
      requestedDeliveryDate: date(t('label.requested-delivery-date')),
      expectedDeliveryDate: date(t('label.expected-delivery-date')),
      comment: cell(cells, t('label.comment')),
      note: cell(cells, t('label.notes')),
      errors,
      warnings,
    };
  });
};

/**
 * An accepted row → the line it inserts. Importing is offered while drafting
 * only, so the packs write the requested quantity (rules § quantities).
 */
export const rowToInsertInput = (
  row: ImportRow,
  purchaseOrderId: string
): InsertPurchaseOrderLineVariables['input'] => ({
  id: row.id,
  purchaseOrderId,
  itemIdOrCode: row.itemCode,
  requestedPackSize: row.requestedPackSize,
  requestedNumberOfUnits: row.packs * row.requestedPackSize,
  pricePerPackBeforeDiscount: row.pricePerPackBeforeDiscount,
  pricePerPackAfterDiscount: row.pricePerPackAfterDiscount,
  requestedDeliveryDate: row.requestedDeliveryDate,
  expectedDeliveryDate: row.expectedDeliveryDate,
  supplierItemCode: row.supplierItemCode || null,
  comment: row.comment || null,
  note: row.note || null,
});

const toImportDate = (iso: string | null): string => {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * The rows to correct, written back with their line number and reason
 * (OMS-FUN-PO-09.9), in the same columns the import reads.
 */
export const failedRowsToCsv = (rows: readonly ImportRow[]): string =>
  toCsv(
    [...importColumnKeys(), t('label.line-number'), t('label.error-message')],
    rows.map(row => [
      row.itemCode,
      row.requestedPackSize,
      row.packs,
      row.supplierItemCode,
      row.pricePerPackBeforeDiscount,
      row.discountPercentage,
      row.pricePerPackAfterDiscount,
      toImportDate(row.requestedDeliveryDate),
      toImportDate(row.expectedDeliveryDate),
      row.comment,
      row.note,
      row.lineNumber,
      row.errors.join(', '),
    ])
  );
