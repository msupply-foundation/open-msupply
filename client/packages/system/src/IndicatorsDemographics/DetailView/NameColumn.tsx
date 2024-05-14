import React from 'react';
import { Box } from '@mui/material';
import { Input } from '@common/components';
import { ColumnDefinition, RecordWithId } from 'packages/common/src';

interface RecordWithIdWithRequiredFields extends RecordWithId {
  name?: number | null;
}

export const nameColumn = <
  T extends RecordWithIdWithRequiredFields,
>(): ColumnDefinition<T> => {
  return {
    label: 'label.name',
    setter: () => {
      if (process.env['NODE_ENV']) {
        throw new Error(
          `The default setter of the NameAndColor column was called.
        Have you forgotten to provide a custom setter?
        When setting up your columns, you should provide a setter function
        const columns = useColumns([ gercentageColumn(), { setter }])
        `
        );
      }
    },
    accessor: ({ rowData }) => rowData.name,
    key: 'name',
    Cell: ({ rowData, column, isDisabled }) => (
      <Box
        sx={{
          flexDirection: 'row',
          borderBottom: 'none',
          alignItems: 'center',
          display: 'flex',
        }}
      >
        <>
          <Input
            disabled={isDisabled}
            defaultValue={column.accessor({ rowData })}
            onBlur={e => {
              column.setter({ ...rowData, name: e.target.value });
            }}
          />
          <Box ml={1} />
        </>
      </Box>
    ),
    minWidth: 180,
  };
};
