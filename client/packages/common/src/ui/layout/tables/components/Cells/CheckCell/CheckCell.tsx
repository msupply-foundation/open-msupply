import React from 'react';
import { Typography } from '@mui/material';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';

export const CheckCell = <T extends RecordWithId>({
  column,
  rowData,
}: CellProps<T>) => {
  const check = column.accessor({ rowData }) as boolean;

  return (
    <Typography
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'center',
      }}
    >
      {check ? '✓' : ''}
    </Typography>
  );
};
