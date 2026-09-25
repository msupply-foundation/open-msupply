import { describe, expect, it } from 'vitest';
import {
  buildTemplateCsv,
  failedRowsToCsv,
  importColumnKeys,
  parseImportFile,
  rowToInsertInput,
} from './importLines';
import {
  canImport,
  hasErrors,
  parseImportDate,
  parseImportNumber,
} from '@/domain/csvImport';

// Anchors: spec/purchase-orders/cases/OMS-FUN-PO-09 (the import). No
// dictionary is loaded under node, so column headings and messages are their
// keys — which is also what makes the translated-heading contract visible.

let counter = 0;
const newId = () => `id-${++counter}`;

const HEADER = importColumnKeys().join(',');
const row = (over: Partial<Record<string, string>> = {}) =>
  [
    over.code ?? 'AMOX',
    over.packSize ?? '10',
    over.packs ?? '5',
    over.supplierCode ?? 'S-1',
    over.before ?? '8',
    over.discount ?? '',
    over.after ?? '6',
    over.requested ?? '01/10/2026',
    over.expected ?? '',
    over.comment ?? 'hello',
    over.note ?? 'internal',
  ].join(',');

const parse = (...rows: string[]) =>
  parseImportFile([HEADER, ...rows].join('\n'), newId);

describe('OMS-FUN-PO-09.6 — the example file', () => {
  it('carries the eleven import columns in order', () => {
    expect(importColumnKeys()).toEqual([
      'label.code',
      'label.pack-size',
      'label.requested-packs',
      'label.supplier-item-code',
      'label.price-per-pack-before-discount',
      'label.discount-percentage',
      'label.price-per-pack-after-discount',
      'label.requested-delivery-date',
      'label.expected-delivery-date',
      'label.comment',
      'label.notes',
    ]);
    const [heading, example] = buildTemplateCsv().split('\r\n');
    expect(heading).toBe(HEADER);
    expect(example).toContain('label.date-format');
  });

  it('round-trips: the example file it writes is a file it reads', () => {
    const parsed = parse(row());
    expect(Array.isArray(parsed)).toBe(true);
  });
});

describe('OMS-FUN-PO-09.1 / .5 — an accepted row becomes a line insert', () => {
  it('reads every column and derives the quantity and the percentage', () => {
    const parsed = parse(row());
    if (!Array.isArray(parsed)) throw new Error(parsed);
    const [line] = parsed;
    expect(line!.errors).toEqual([]);
    expect(line!.discountPercentage).toBe(25);
    expect(line!.requestedDeliveryDate).toBe('2026-10-01');
    expect(line!.expectedDeliveryDate).toBeNull();
    expect(rowToInsertInput(line!, 'order-1')).toEqual({
      id: line!.id,
      purchaseOrderId: 'order-1',
      itemIdOrCode: 'AMOX',
      requestedPackSize: 10,
      requestedNumberOfUnits: 50,
      pricePerPackBeforeDiscount: 8,
      pricePerPackAfterDiscount: 6,
      requestedDeliveryDate: '2026-10-01',
      expectedDeliveryDate: null,
      supplierItemCode: 'S-1',
      comment: 'hello',
      note: 'internal',
    });
  });

  it('computes the after-price from the percentage where none is given', () => {
    const parsed = parse(row({ discount: '50', after: '' }));
    if (!Array.isArray(parsed)) throw new Error(parsed);
    expect(parsed[0]!.pricePerPackAfterDiscount).toBe(4);
    expect(parsed[0]!.discountPercentage).toBe(50);
  });
});

describe('OMS-FUN-PO-09.7 — the three value checks', () => {
  it('rejects a pack size that is not greater than zero', () => {
    const parsed = parse(row({ packSize: '0' }));
    if (!Array.isArray(parsed)) throw new Error(parsed);
    expect(parsed[0]!.errors).toContain(
      'error.pack-size-must-be-greater-than-zero'
    );
  });

  it('rejects a discount above 100', () => {
    const parsed = parse(row({ discount: '140', after: '' }));
    if (!Array.isArray(parsed)) throw new Error(parsed);
    expect(parsed[0]!.errors).toContain('error.discount-exceeds-maximum');
  });

  it('rejects an after-price above the before-price', () => {
    const parsed = parse(row({ before: '5', after: '6' }));
    if (!Array.isArray(parsed)) throw new Error(parsed);
    expect(parsed[0]!.errors).toContain(
      'error.price-after-discount-cannot-exceed-price-before-discount'
    );
  });
});

describe('OMS-FUN-PO-09.8 / .4 — the same item twice', () => {
  it('rejects both rows repeating an item and pack size', () => {
    const parsed = parse(row(), row({ packs: '7' }));
    if (!Array.isArray(parsed)) throw new Error(parsed);
    expect(parsed[0]!.errors[0]).toMatch(/duplicated-combination/);
    expect(parsed[1]!.errors[0]).toMatch(/duplicated-combination/);
  });

  it('accepts the same item at a different pack size', () => {
    const parsed = parse(row(), row({ packSize: '20' }));
    if (!Array.isArray(parsed)) throw new Error(parsed);
    expect(hasErrors(parsed)).toBe(false);
    expect(canImport(parsed)).toBe(true);
  });
});

describe('OMS-FUN-PO-09.3 — a file with any rejection imports nothing', () => {
  it('blocks the import while any row is rejected', () => {
    const parsed = parse(row(), row({ code: 'PARA', packSize: '0' }));
    if (!Array.isArray(parsed)) throw new Error(parsed);
    expect(canImport(parsed)).toBe(false);
  });

  it('names the row by its line in the file', () => {
    const parsed = parse(row(), row({ code: 'PARA' }));
    if (!Array.isArray(parsed)) throw new Error(parsed);
    expect(parsed.map(line => line.lineNumber)).toEqual([2, 3]);
  });

  it('requires an item code', () => {
    const parsed = parse(row({ code: '' }));
    if (!Array.isArray(parsed)) throw new Error(parsed);
    expect(parsed[0]!.errors[0]).toMatch(/field-must-be-specified/);
  });
});

describe('reading the file', () => {
  it('tells an unrecognised heading from a heading with nothing beneath', () => {
    expect(parseImportFile('a,b,c\n1,2,3', newId)).toBe('no-header');
    expect(parseImportFile(HEADER, newId)).toBe('no-rows');
  });

  it('drops an unreadable date with a warning and keeps the row', () => {
    const parsed = parse(row({ requested: 'soon' }));
    if (!Array.isArray(parsed)) throw new Error(parsed);
    expect(parsed[0]!.requestedDeliveryDate).toBeNull();
    expect(parsed[0]!.warnings).toHaveLength(1);
    expect(parsed[0]!.errors).toEqual([]);
  });

  it('reads day-first and ISO dates, and refuses two-digit years', () => {
    expect(parseImportDate('01/10/2026')).toBe('2026-10-01');
    expect(parseImportDate('2026-10-01')).toBe('2026-10-01');
    expect(parseImportDate('01-10-26')).toBeNull();
    expect(parseImportDate('31/02/2026')).toBeNull();
  });

  it('reads grouped and decimal-comma numbers', () => {
    expect(parseImportNumber('1,234')).toBe(1234);
    expect(parseImportNumber('12,5')).toBe(12.5);
    expect(parseImportNumber('1.234,5', true)).toBe(1234.5);
    expect(parseImportNumber('abc')).toBeUndefined();
  });
});

describe('OMS-FUN-PO-09.9 — the rejected rows export', () => {
  it('writes the import columns plus the line and the reason', () => {
    const parsed = parse(row({ packSize: '0' }));
    if (!Array.isArray(parsed)) throw new Error(parsed);
    const [heading, line] = failedRowsToCsv(parsed).split('\r\n');
    expect(heading).toBe(`${HEADER},label.line-number,label.error-message`);
    expect(line).toContain('AMOX');
    expect(line).toContain('01/10/2026');
    expect(line).toContain('error.pack-size-must-be-greater-than-zero');
  });
});
