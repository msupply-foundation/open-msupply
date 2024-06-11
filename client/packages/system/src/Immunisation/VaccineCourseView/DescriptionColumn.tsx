import React from 'react';
import { BasicTextInput } from '@common/components';
import {
  Box,
  ColumnDefinition,
  RecordWithId,
} from '@openmsupply-client/common';

interface RecordWithIdWithRequiredFields extends RecordWithId {
  description?: string;
}

export const descriptionColumn = <
  T extends RecordWithIdWithRequiredFields,
>(): ColumnDefinition<T> => ({
  label: 'label.label',
  setter: () => {
    if (process.env['NODE_ENV']) {
      throw new Error(
        `The default setter of the Description column was called.
          Have you forgotten to provide a custom setter?
          When setting up your columns, you should provide a setter function
          const columns = useColumns([ descriptionColumn(), { setter }])
          `
      );
    }
  },
  accessor: ({ rowData }) => rowData.description,
  key: 'description',
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
          disabled={isDisabled}
          defaultValue={column.accessor({ rowData })}
          onBlur={e => {
            column.setter({ ...rowData, description: e.target.value });
          }}
        />
        <Box ml={1} />
      </>
    </Box>
  ),
  minWidth: 180,
});
