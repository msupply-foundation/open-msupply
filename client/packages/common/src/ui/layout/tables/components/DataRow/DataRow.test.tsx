import React from 'react';
import { render } from '@testing-library/react';

import { TableBody, Table } from '@mui/material';

import { DataRow } from './DataRow';
import { useColumns } from '../../hooks';

describe('DataRow', () => {
  const Example = () => {
    const columns = useColumns([
      {
        label: 'label.type',
        key: 'id',
        width: 150,
      },
    ]);

    return (
      <Table>
        <TableBody>
          <DataRow columns={columns} rowKey="rowKey" rowData={{ id: 'josh' }} />
        </TableBody>
      </Table>
    );
  };

  it('Renders a cell passed', () => {
    const { getByText } = render(<Example />);

    expect(getByText(/josh/)).toBeInTheDocument();
  });
});
