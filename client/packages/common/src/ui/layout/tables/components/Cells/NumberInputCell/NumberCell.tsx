import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { useFormatNumber } from '@common/intl';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';
import { NumUtils } from '@common/utils';

// A non-interactive version of NumberInputCell. Basically the same as a plain
// text display, but it formats the number nicely.

export const NumberCell = <T extends RecordWithId>({
  column,
  rowData,
  defaultValue = '',
}: CellProps<T> & {
  defaultValue?: string | number;
}) => {
  const value = column.accessor({ rowData }) as number | undefined | null;
  const formattedValue = useFormatNumber().round(value ?? 0, 2);

  const displayValue =
    value === undefined || value === null ? defaultValue : formattedValue;

  return (
    <Box
      sx={{
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
          {!!NumUtils.hasMoreThanTwoDp(value ?? 0)
            ? `${displayValue}...`
            : displayValue}
        </Typography>
      </Tooltip>
    </Box>
  );
};
