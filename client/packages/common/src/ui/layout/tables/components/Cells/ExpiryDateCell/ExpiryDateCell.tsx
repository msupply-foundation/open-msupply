import React from 'react';
import { Box, Typography } from '@mui/material';
import { DateUtils, useFormatDateTime } from '@common/intl';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';

export const ExpiryDateCell = <T extends RecordWithId>({
  column,
  rowData,
}: CellProps<T>) => {
  const expiryDate = column.accessor({ rowData }) as string;
  const { localisedDate } = useFormatDateTime();

  const isExpired = expiryDate
    ? DateUtils.isAlmostExpired(new Date(expiryDate))
    : false;

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
        {expiryDate ? localisedDate(new Date(expiryDate)) || '' : ''}
      </Typography>
    </Box>
  );
};
