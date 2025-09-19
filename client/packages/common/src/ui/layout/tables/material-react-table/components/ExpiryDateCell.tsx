import React from 'react';
import { Box, Typography } from '@mui/material';
import { DateUtils, useFormatDateTime } from '@common/intl';

import { MRT_Cell, MRT_RowData } from 'material-react-table';

interface ExpiryDateCellProps<T extends MRT_RowData> {
  cell: MRT_Cell<T>;
}

export const ExpiryDateCell = <T extends MRT_RowData>({
  cell,
}: ExpiryDateCellProps<T>) => {
  const expiryDate = cell.getValue<string>();
  const { localisedDate } = useFormatDateTime();

  const isExpired = expiryDate
    ? DateUtils.isAlmostExpired(new Date(expiryDate))
    : false;

  return (
    <Box
      sx={{ color: isExpired ? 'error.main' : 'inherit' }}
      color={isExpired ? 'red' : 'inherit'}
    >
      <Typography
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'inherit',
          fontSize: 'inherit',
          textAlign: 'right',
        }}
      >
        {expiryDate ? localisedDate(new Date(expiryDate)) || '' : ''}
      </Typography>
    </Box>
  );
};
