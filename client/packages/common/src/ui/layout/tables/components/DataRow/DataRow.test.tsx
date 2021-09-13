import React from 'react';
import { render } from '@testing-library/react';

import { TableBody, Table } from '@material-ui/core';

import { DataRow } from './DataRow';

describe('DataRow', () => {
  const cells = [
    {
      render: () => <span>josh</span>,
      getCellProps: () => ({ key: Math.random() * 20 }),
      column: { align: 'right' },
    },
  ] as any;

  it('Renders a cell passed', () => {
    const { getByText } = render(
      <Table>
        <TableBody>
          <DataRow cells={cells} values={{ id: 'josh' }} />
        </TableBody>
      </Table>
    );

    expect(getByText(/josh/)).toBeInTheDocument();
  });
});
