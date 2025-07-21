import React from 'react';
import { Box } from '@mui/material';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';
import { NumericTextDisplay } from 'packages/common/src/ui/forms/Detail/NumericTextDisplay';

// Non interactive number cell
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
