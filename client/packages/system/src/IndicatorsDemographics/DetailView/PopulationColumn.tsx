import React from 'react';
import { Box } from '@mui/material';
import { BasicTextInput } from '@common/components';
import { ColumnDefinition, RecordWithId } from '@openmsupply-client/common';
import { GENERAL_POPULATION_ID } from '../api';

interface RecordWithIdWithRequiredFields extends RecordWithId {
  0?: number | null;
  name?: string;
}

export const populationColumn = <
  T extends RecordWithIdWithRequiredFields,
>(): ColumnDefinition<T> => ({
  label: 'label.population',
  setter: () => {
    if (process.env['NODE_ENV']) {
      throw new Error(
        `The default setter of the NameAndColor column was called.
        Have you forgotten to provide a custom setter?
        When setting up your columns, you should provide a setter function
        const columns = useColumns([ percentageColumn(), { setter }])
        `
      );
    }
  },
  accessor: ({ rowData }) => rowData[0],
  key: '0',
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
        <BasicTextInput
          disabled={isDisabled || rowData.id !== GENERAL_POPULATION_ID}
          defaultValue={column.accessor({ rowData }) as number}
          onBlur={e => {
            const updatedRowData = { ...rowData };
            column.setter({
              ...updatedRowData,
              basePopulation: parseInt(e.target.value),
            });
          }}
        />
        <Box ml={1} />
      </>
    </Box>
  ),
  minWidth: 100,
});
