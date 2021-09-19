import React from 'react';
import { TestingProvider } from '@openmsupply-client/common';
import { render, waitFor, within } from '@testing-library/react';
import { GeneralTab } from './GeneralTab';

const items = [
  {
    id: '1',
    code: 'abc123',
    name: 'ibuprofen',
    packSize: 2,
    quantity: 100,
  },
  {
    id: '2',
    code: 'def123',
    name: 'amox',
    packSize: 2,
    quantity: 100,
  },
];

describe('GeneralTab', () => {
  const Example = () => {
    return (
      <TestingProvider>
        <GeneralTab data={items} />
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
