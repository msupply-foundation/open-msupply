import React from 'react';
import { Tooltip, Typography } from '@mui/material';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';

export const CheckCell = <T extends RecordWithId>({
  column,
  rowData,
  tooltipText,
}: CellProps<T> & { tooltipText?: string }) => {
  const check = column.accessor({ rowData }) as boolean;

  return (
    <Tooltip title={tooltipText}>
      <Typography
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center',
        }}
      >
        {check ? '✓' : ''}
      </Typography>
    </Tooltip>
  );
};
