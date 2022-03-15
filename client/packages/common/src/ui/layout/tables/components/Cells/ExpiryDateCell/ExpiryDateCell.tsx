import React from 'react';
import { Box, Typography } from '@mui/material';
import { formatExpiryDate, isAlmostExpired } from '@common/utils';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';

export const ExpiryDateCell = <T extends RecordWithId>({
  column,
  rowData,
  rows,
}: CellProps<T>) => {
  const expiryDate = column.accessor({ rowData, rows }) as string;

  const isExpired = expiryDate ? isAlmostExpired(new Date(expiryDate)) : false;

  return (
    <Box
      flexDirection="row"
      display="flex"
      flex={1}
      sx={{ color: isExpired ? 'error.main' : 'inherit' }}
      color={isExpired ? 'red' : 'inherit'}
    >
      <Typography
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'inherit',
          fontSize: 'inherit',
        }}
      >
        {expiryDate ? formatExpiryDate(new Date(expiryDate)) || '' : ''}
      </Typography>
    </Box>
  );
};
