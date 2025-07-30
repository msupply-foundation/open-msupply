import React from 'react';
import { Box } from '@mui/material';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';
import { NumericTextDisplay } from '@openmsupply-client/common';

// Display numbers in a table, formatted by NumericTextDisplay
export const NumberCell = <T extends RecordWithId>({
  column,
  rowData,
  defaultValue = '',
}: CellProps<T> & {
  defaultValue?: string | number;
}) => {
  const value = column.accessor({ rowData }) as number | undefined | null;

  return (
    <Box
      sx={{
        padding: '4px 8px',
      }}
    >
      <NumericTextDisplay value={value} defaultValue={defaultValue} />
    </Box>
  );
};
