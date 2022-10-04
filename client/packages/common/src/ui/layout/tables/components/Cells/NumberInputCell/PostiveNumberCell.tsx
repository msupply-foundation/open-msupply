import React from 'react';
import { Typography } from '@mui/material';
import { useFormatNumber } from '@common/intl';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';

export const PositiveNumberCell = <T extends RecordWithId>({
  column,
  rowData,
  rows,
}: CellProps<T>) => {
  const value = column.accessor({ rowData, rows }) as number;
  const formattedValue = useFormatNumber().round(value, 2);

  return (
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
  );
};
