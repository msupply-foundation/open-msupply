import { describe, expect, it } from 'vitest';
import { buildCustomFieldColumns } from './customFieldColumns';
import { isProminent, isTabVisible } from './invoiceCustomFieldsResource';
import type { CustomFieldDefinition } from './invoiceCustomFieldsResource';

const def = (over: Partial<CustomFieldDefinition>): CustomFieldDefinition => ({
  id: 'f1',
  key: 'prescription_category',
  name: 'Category',
  valueType: 'OPTION',
  displayMode: 'PROMINENT',
  options: [],
  ...over,
});

describe('prominence predicates (AC-CF1 — displayMode places the field)', () => {
  it('prominent → toolbar; visible/other → tab; hidden → nowhere', () => {
    expect(isProminent(def({ displayMode: 'PROMINENT' }))).toBe(true);
    expect(isProminent(def({ displayMode: 'VISIBLE' }))).toBe(false);
    expect(isTabVisible(def({ displayMode: 'VISIBLE' }))).toBe(true);
    expect(isTabVisible(def({ displayMode: 'OTHER' }))).toBe(true);
    expect(isTabVisible(def({ displayMode: 'PROMINENT' }))).toBe(false);
    expect(isTabVisible(def({ displayMode: 'HIDDEN' }))).toBe(false);
    expect(isProminent(def({ displayMode: 'HIDDEN' }))).toBe(false);
  });
});

describe('buildCustomFieldColumns (AC-CF4 — a column per field, value from the row)', () => {
  const accessorOf = (
    column: ReturnType<typeof buildCustomFieldColumns>[number]
  ) => (column.c as { accessor: (row: unknown) => unknown }).accessor;

  it('resolves an OPTION value id to its option name', () => {
    const columns = buildCustomFieldColumns([
      def({
        key: 'prescription_category',
        options: [
          { id: 'opt-1', key: 'a', name: 'Acute', parentOptionId: null },
        ],
      }),
    ]);
    expect(columns).toHaveLength(1);
    expect(
      accessorOf(columns[0])({
        customFields: { prescription_category: 'opt-1' },
      })
    ).toBe('Acute');
  });

  it('renders empty for an unset value and passes scalars through', () => {
    const columns = buildCustomFieldColumns([
      def({ key: 'notes', valueType: 'TEXT', options: [] }),
    ]);
    expect(accessorOf(columns[0])({ customFields: {} })).toBe('');
    expect(accessorOf(columns[0])({ customFields: { notes: 'hello' } })).toBe(
      'hello'
    );
  });
});
