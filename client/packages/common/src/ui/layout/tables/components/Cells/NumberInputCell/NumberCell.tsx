import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { useFormatNumber } from '@common/intl';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';

// A non-interactive version of NumberInputCell. Basically the same as a plain
// text display, but it formats the number nicely.

export const NumberCell = <T extends RecordWithId>({
  column,
  rowData,
  isError,
  defaultValue = '',
}: CellProps<T> & {
  defaultValue?: string | number;
}) => {
  const value = column.accessor({ rowData }) as number | undefined | null;
  const hasMoreThanTwoDp = (value ?? 0 * 100) % 1 !== 0;
  const formattedValue = useFormatNumber().round(value ?? 0, 2);

  const displayValue =
    value === undefined || value === null ? defaultValue : formattedValue;

  return (
    <Box
      sx={{
        border: theme =>
          isError ? `2px solid ${theme.palette.error.main}` : 'none',
        borderRadius: '8px',
        padding: '4px 8px',
      }}
    >
      <Tooltip title={value?.toString()}>
        <Typography
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'right',
            fontSize: 'inherit',
          }}
        >
          {!!hasMoreThanTwoDp ? `${displayValue}...` : displayValue}
        </Typography>
      </Tooltip>
    </Box>
  );
};
