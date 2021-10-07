import React from 'react';
import {
  ColumnSetBuilder,
  TestingProvider,
  useColumns,
} from '@openmsupply-client/common';
import { render, waitFor, within } from '@testing-library/react';
import { GeneralTab } from './GeneralTab';
import { ItemRow } from '../types';

const items = [
  {
    id: '1',
    code: 'abc123',
    name: 'ibuprofen',
    packSize: 2,
    quantity: 100,
    updateQuantity: () => {},
  },
  {
    id: '2',
    code: 'def123',
    name: 'amox',
    packSize: 2,
    quantity: 100,
    updateQuantity: () => {},
  },
];

describe('GeneralTab', () => {
  const Example = () => {
    const defaultColumns = new ColumnSetBuilder<ItemRow>()
      .addColumn('code')
      .addColumn('name')
      .addColumn('packSize')
      .build();

    const columns = useColumns(defaultColumns, { onChangeSortBy: () => {} });

    return (
      <TestingProvider>
        <GeneralTab
          data={items}
          columns={columns}
          sortBy={{ key: 'quantity', direction: 'asc' }}
        />
      </TestingProvider>
    );
  };

  it('renders the passed values into a row', async () => {
    const { findByRole } = render(<Example />);

    await waitFor(async () => {
      const row = (await findByRole('cell', { name: 'ibuprofen' })).closest(
        'tr'
      );

      expect(row).toBeInTheDocument();

      if (row) {
        const code = within(row).getByRole('cell', { name: /abc123/i });
        const name = within(row).getByRole('cell', { name: /ibuprofen/i });
        const quantity = within(row).getByRole('cell', { name: /100/i });
        const packSize = within(row).getByRole('cell', { name: /^2$/i });

        expect(code).toBeInTheDocument();
        expect(name).toBeInTheDocument();
        expect(quantity).toBeInTheDocument();
        expect(packSize).toBeInTheDocument();
      }
    });
  });
});
