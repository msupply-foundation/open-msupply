import React from 'react';
import { Box, Typography } from '@mui/material';
import { CardFieldDef } from './types';

interface CardFieldProps<T> {
  fieldDef: CardFieldDef<T>;
  rowData: T;
  disabled: boolean;
}

export const CardField = <T,>({
  fieldDef,
  rowData,
  disabled,
}: CardFieldProps<T>) => {
  const { label, Cell, span } = fieldDef;

  return (
    <Box sx={{ gridColumn: `span ${span ?? 1}` }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box>
        <Cell rowData={rowData} disabled={disabled} />
      </Box>
    </Box>
  );
};
