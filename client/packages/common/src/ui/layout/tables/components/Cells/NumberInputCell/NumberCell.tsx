import React from 'react';
import { Box, Typography } from '@mui/material';
import { useFormatNumber } from '@common/intl';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';

// A non-interactive version of NumberInputCell. Basically the same as a plain
// text display, but it formats the number nicely.

export const NumberCell = <T extends RecordWithId>({
  column,
  rowData,
  isError,
}: CellProps<T>) => {
  const value = column.accessor({ rowData }) as number;
  const formattedValue = useFormatNumber().round(value, 2);

  return (
    <Box
      sx={{
        border: theme =>
          isError ? `2px solid ${theme.palette.error.main}` : 'none',
        borderRadius: '8px',
        padding: '4px 8px',
      }}
    >
      <Typography
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'right',
          fontSize: 'inherit',
        }}
      >
        {formattedValue}
      </Typography>
    </Box>
  );
};
