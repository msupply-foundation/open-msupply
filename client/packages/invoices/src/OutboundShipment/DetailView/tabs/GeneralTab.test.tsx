import React from 'react';
import { TestingProvider, useColumns } from '@openmsupply-client/common';
import { render, waitFor, within } from '@testing-library/react';
import { GeneralTab } from './GeneralTab';
import { ItemRow } from '../types';

const lines: ItemRow[] = [
  {
    id: '1',
    itemCode: 'abc123',
    itemName: 'ibuprofen',
    quantity: 100,
    expiry: '1/1/2020',
    invoiceId: '',
    stockLineId: '',
    updateQuantity: () => {},
  },
  {
    id: '2',
    itemCode: 'def123',
    itemName: 'amox',
    quantity: 100,
    expiry: '1/1/2020',
    invoiceId: '',
    stockLineId: '',
    updateQuantity: () => {},
  },
];

describe('GeneralTab', () => {
  const Example = () => {
    const columns = useColumns<ItemRow>(['itemCode', 'itemName', 'quantity'], {
      onChangeSortBy: () => {},
    });

    return <GeneralTab data={lines} columns={columns} />;
  };

  it('renders the passed values into a row', async () => {
    const { findByRole } = render(
      <TestingProvider>
        <Example />
      </TestingProvider>
    );

    await waitFor(async () => {
      const row = (await findByRole('cell', { name: 'ibuprofen' })).closest(
        'tr'
      );

      expect(row).toBeInTheDocument();

      if (row) {
        const code = within(row).getByRole('cell', { name: /abc123/i });
        const name = within(row).getByRole('cell', { name: /ibuprofen/i });
        const packSize = within(row).getByRole('cell', { name: /^100$/i });

        expect(code).toBeInTheDocument();
        expect(name).toBeInTheDocument();
        expect(packSize).toBeInTheDocument();
      }
    });
  });
});
