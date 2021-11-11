import React from 'react';
import { TestingProvider, useColumns } from '@openmsupply-client/common';
import { render, waitFor, within } from '@testing-library/react';
import { GeneralTab } from './GeneralTab';
import { OutboundShipmentRow } from '../types';

const lines: OutboundShipmentRow[] = [
  {
    id: '1',
    itemId: '1',
    itemUnit: 'bottle',
    packSize: 1,
    numberOfPacks: 100,
    costPricePerPack: 0,
    sellPricePerPack: 0,
    itemCode: 'abc123',
    itemName: 'ibuprofen',
    expiry: '1/1/2020',
    invoiceId: '',
    stockLineId: '',
    updateNumberOfPacks: () => {},
  },
  {
    id: '2',
    itemId: '1',
    itemUnit: 'bottle',
    packSize: 1,
    numberOfPacks: 100,
    costPricePerPack: 0,
    sellPricePerPack: 0,
    itemCode: 'def123',
    itemName: 'amox',
    expiry: '1/1/2020',
    invoiceId: '',
    stockLineId: '',
    updateNumberOfPacks: () => {},
  },
];

describe('GeneralTab', () => {
  const Example = () => {
    const columns = useColumns<OutboundShipmentRow>(
      ['itemCode', 'itemName', 'numberOfPacks'],
      {
        onChangeSortBy: () => {},
      }
    );

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
