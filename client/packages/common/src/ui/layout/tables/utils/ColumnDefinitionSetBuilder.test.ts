import { ColumnDefinitionSetBuilder } from './ColumnDefinitionSetBuilder';
import { RecordWithId } from '@common/types';

interface Invoice extends RecordWithId {
  id: string;
  invoiceNumber: string;
  status: string;
}

describe('ColumnDefinitionSetBuilder', () => {
  it('Creates an array of columns for the column keys passed', () => {
    const columns = new ColumnDefinitionSetBuilder<Invoice>()
      .addColumn('invoiceNumber')
      .addColumn('status')
      .build();

    expect(columns).toEqual([
      expect.objectContaining({ key: 'invoiceNumber' }),
      expect.objectContaining({ key: 'status' }),
    ]);
  });

  it('creates an array of column objects when passed column definitions rather than keys', () => {
    const columns = new ColumnDefinitionSetBuilder<Invoice>()
      .addColumn({ key: 'status' })
      .addColumn({ key: 'invoiceNumber' })
      .build();

    expect(columns).toEqual([
      expect.objectContaining({ key: 'status' }),
      expect.objectContaining({ key: 'invoiceNumber' }),
    ]);
  });

  it('creates an array of column objects when passed a mix of column definitions and keys', () => {
    const columns = new ColumnDefinitionSetBuilder<Invoice>()
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
    const columns = new ColumnDefinitionSetBuilder<Invoice>()
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
    const columns = new ColumnDefinitionSetBuilder<Invoice>()
      .addColumn('type', { order: 0 })
      .addColumn({ key: 'status' })
      .addColumn({ key: 'invoiceNumber' })
      .addColumn('allocatedDatetime', { order: 3 })
      .addColumn('createdDatetime', { order: 1 })
      .build();

    expect(columns).toEqual([
      expect.objectContaining({ key: 'type' }),
      expect.objectContaining({ key: 'createdDatetime' }),
      expect.objectContaining({ key: 'allocatedDatetime' }),
      expect.objectContaining({ key: 'status' }),
      expect.objectContaining({ key: 'invoiceNumber' }),
    ]);
  });

  it('overrides the default values of a column with the passed options', () => {
    const columns = new ColumnDefinitionSetBuilder<Invoice>()
      .addColumn('type', { width: 300 })
      .addColumn('status', { width: 300, label: 'admin' })
      .build();

    expect(columns).toEqual([
      {
        key: 'type',
        width: 300,
        label: 'label.type',
        maxWidth: 300,
        minWidth: 300,
        order: 100,
      },
      {
        key: 'status',
        width: 300,
        label: 'admin',
        maxWidth: 300,
        minWidth: 300,
        order: 101,
      },
    ]);
  });
});
