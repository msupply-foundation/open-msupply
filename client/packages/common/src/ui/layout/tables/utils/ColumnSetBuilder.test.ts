import { ColumnSetBuilder } from './ColumnSetBuilder';
import { Transaction } from './../../../../types';

describe('ColumnSetBuilder', () => {
  it('Creates an array of columns for the column keys passed', () => {
    const columns = new ColumnSetBuilder<Transaction>()
      .addColumn('invoiceNumber')
      .addColumn('status')
      .build();

    expect(columns).toEqual([
      expect.objectContaining({ key: 'invoiceNumber' }),
      expect.objectContaining({ key: 'status' }),
    ]);
  });

  it('creates an array of column objects when passed column definitions rather than keys', () => {
    const columns = new ColumnSetBuilder<Transaction>()
      .addColumn({ key: 'status' })
      .addColumn({ key: 'invoiceNumber' })
      .build();

    expect(columns).toEqual([
      expect.objectContaining({ key: 'status' }),
      expect.objectContaining({ key: 'invoiceNumber' }),
    ]);
  });

  it('creates an array of column objects when passed a min of column definitions and keys', () => {
    const columns = new ColumnSetBuilder<Transaction>()
      .addColumn('type')
      .addColumn({ key: 'status' })
      .addColumn({ key: 'invoiceNumber' })
      .build();

    expect(columns).toEqual([
      expect.objectContaining({ key: 'type' }),
      expect.objectContaining({ key: 'status' }),
      expect.objectContaining({ key: 'invoiceNumber' }),
    ]);
  });

  it('creates an array of column objects in the order they were specified', () => {
    const columns = new ColumnSetBuilder<Transaction>()
      .addColumn('type', { order: 3 })
      .addColumn({ key: 'status', order: 2 })
      .addColumn({ key: 'invoiceNumber', order: 1 })
      .build();

    expect(columns).toEqual([
      expect.objectContaining({ key: 'invoiceNumber' }),
      expect.objectContaining({ key: 'status' }),
      expect.objectContaining({ key: 'type' }),
    ]);
  });

  it('creates an array of column objects with columns in their specified order, and all others appended to the tail', () => {
    const columns = new ColumnSetBuilder<Transaction>()
      .addColumn('type', { order: 0 })
      .addColumn({ key: 'status' })
      .addColumn({ key: 'invoiceNumber' })
      .addColumn('confirmed', { order: 3 })
      .addColumn('entered', { order: 1 })
      .build();

    expect(columns).toEqual([
      expect.objectContaining({ key: 'type' }),
      expect.objectContaining({ key: 'entered' }),
      expect.objectContaining({ key: 'confirmed' }),
      expect.objectContaining({ key: 'status' }),
      expect.objectContaining({ key: 'invoiceNumber' }),
    ]);
  });
});
