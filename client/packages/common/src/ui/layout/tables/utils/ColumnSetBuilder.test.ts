import { ColumnSetBuilder } from './ColumnSetBuilder';
import { Transaction } from './../../../../types/index';

describe('ColumnSetBuilder', () => {
  it('', () => {
    const columns = new ColumnSetBuilder<Transaction>()
      .addColumn('invoiceNumber')
      .addColumn('status')
      .addColumn('total')
      .addColumn('comment')
      .addColumn('confirmed')
      .addColumn('entered')
      .build();

    expect(columns).toEqual([
      expect.objectContaining({ key: 'invoiceNumber' }),
      expect.objectContaining({ key: 'status' }),
      expect.objectContaining({ key: 'total' }),
      expect.objectContaining({ key: 'comment' }),
      expect.objectContaining({ key: 'confirmed' }),
      expect.objectContaining({ key: 'entered' }),
    ]);
  });
});
