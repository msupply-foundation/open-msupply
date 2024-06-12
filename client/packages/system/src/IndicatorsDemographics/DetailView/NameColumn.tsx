import React from 'react';
import { BasicTextInput } from '@common/components';
import {
  Box,
  ColumnDefinition,
  RecordWithId,
} from '@openmsupply-client/common';
import { GENERAL_POPULATION_ID } from '../api';

interface RecordWithIdWithRequiredFields extends RecordWithId {
  name?: number | null | string;
}

export const nameColumn = <
  T extends RecordWithIdWithRequiredFields,
>(): ColumnDefinition<T> => ({
  label: 'label.name',
  setter: () => {
    if (process.env['NODE_ENV']) {
      throw new Error(
        `The default setter of the Name column was called.
          Have you forgotten to provide a custom setter?
          When setting up your columns, you should provide a setter function
          const columns = useColumns([ percentageColumn(), { setter }])
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
        <BasicTextInput
          disabled={isDisabled || rowData.id === GENERAL_POPULATION_ID}
          defaultValue={column.accessor({ rowData })}
          onBlur={e => {
            column.setter({ ...rowData, name: e.target.value });
          }}
        />
        <Box ml={1} />
      </>
    </Box>
  ),
  minWidth: 200,
});
