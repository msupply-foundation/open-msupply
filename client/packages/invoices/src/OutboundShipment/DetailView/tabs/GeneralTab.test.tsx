import React from 'react';
import { TestingProvider, useColumns } from '@openmsupply-client/common';
import { render, waitFor, within } from '@testing-library/react';
import { GeneralTab } from './GeneralTab';
import { OutboundShipmentSummaryItem } from '../types';

const lines: OutboundShipmentSummaryItem[] = [
  {
    id: '1',
    itemId: '1',
    itemUnit: 'bottle',
    packSize: 1,
    numberOfPacks: 100,
    itemCode: 'abc123',
    itemName: 'ibuprofen',
    unitQuantity: 0,
    batches: [],
  },
  {
    id: '2',
    itemId: '1',
    itemUnit: 'bottle',
    packSize: 1,
    numberOfPacks: 100,
    itemCode: 'def123',
    unitQuantity: 0,
    itemName: 'amox',
    batches: [],
  },
];

describe('GeneralTab', () => {
  const Example = () => {
    const columns = useColumns<OutboundShipmentSummaryItem>(
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
