import React from 'react';
import { BasicTextInput } from '@common/components';
import {
  Box,
  ColumnDefinition,
  RecordWithId,
} from '@openmsupply-client/common';

interface RecordWithIdWithRequiredFields extends RecordWithId {
  label?: string;
  placeholder?: string;
}

export const descriptionColumn = <T extends RecordWithIdWithRequiredFields>(
  placeholder: string
): ColumnDefinition<T> => ({
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
  accessor: ({ rowData }) => rowData.label,
  key: 'label',
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
          placeholder={placeholder ?? ''}
          disabled={isDisabled}
          defaultValue={column.accessor({ rowData })}
          onChange={e => {
            column.setter({ ...rowData, label: e.target.value });
          }}
        />
        <Box ml={1} />
      </>
    </Box>
  ),
  minWidth: 180,
});
