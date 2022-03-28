import React from 'react';
import { Box } from '@mui/material';
import { RecordWithId } from '@common/types';
import { ColumnDefinition } from '../columns/types';
import { ColorSelectButton } from '@common/components';

interface RecordWithIdWithRequiredFields extends RecordWithId {
  colour?: string | null;
  otherPartyName: string;
}

export const getNameAndColorColumn = <
  T extends RecordWithIdWithRequiredFields
>(): ColumnDefinition<T> => ({
  label: 'label.name',
  setter: () => {
    if (process.env['NODE_ENV']) {
      throw new Error(
        `The default setter of the NameAndColor column was called.
        Have you forgotten to provide a custom setter?
        When setting up your columns, you should provide a setter function
        const columns = useColumns([ getNameAndColorColumn(), { setter }])
        `
      );
    }
  },
  accessor: ({ rowData }) => rowData.otherPartyName,
  key: 'otherPartyName',
  Cell: ({ rowData, column, rows, isDisabled }) => (
    <Box
      sx={{
        flexDirection: 'row',
        borderBottom: 'none',
        alignItems: 'center',
        display: 'flex',
      }}
    >
      <ColorSelectButton
        disabled={isDisabled}
        onChange={color => column.setter({ ...rowData, colour: color.hex })}
        color={rowData.colour}
      />
      <Box ml={1} />
      {column.accessor({ rowData, rows })}
    </Box>
  ),
});
