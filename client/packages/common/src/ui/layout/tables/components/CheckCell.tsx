import React from 'react';
import { Tooltip, Typography } from '@mui/material';
import type { MRT_Cell, MRT_RowData } from '../../mrtCompat';

export const CheckCell = <T extends MRT_RowData>({
  cell,
  tooltipText,
}: {
  cell: MRT_Cell<T>;
  tooltipText?: string;
}) => {
  const check = cell.getValue<boolean>();

  return (
    <Tooltip title={tooltipText}>
      <Typography
        style={{
          textAlign: 'center',
          width: '100%',
        }}
      >
        {check ? '✓' : ''}
      </Typography>
    </Tooltip>
  );
};
