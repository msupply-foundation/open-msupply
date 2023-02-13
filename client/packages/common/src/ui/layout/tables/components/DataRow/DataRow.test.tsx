import React from 'react';
import { render } from '@testing-library/react';

import { TableBody, Table } from '@mui/material';

import { DataRow } from './DataRow';
import { useColumns } from '../../hooks';
import { TestingProvider } from '../../../../../utils';
import { useFormatDateTime, useTranslation } from '@common/intl';

describe('DataRow', () => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();
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
          <DataRow
            columns={columns}
            rowKey="rowKey"
            rowIndex={0}
            rowData={{ id: 'josh' }}
            generateRowTooltip={() => ''}
            isAnimated={false}
            localisedText={t}
            localisedDate={localisedDate}
          />
        </TableBody>
      </Table>
    );
  };

  it('Renders a cell passed', () => {
    const { getByText } = render(
      <TestingProvider>
        <Example />
      </TestingProvider>
    );

    expect(getByText(/josh/)).toBeInTheDocument();
  });
});
