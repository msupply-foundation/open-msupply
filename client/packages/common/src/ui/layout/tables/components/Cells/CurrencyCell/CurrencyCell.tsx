import React from 'react';
import { Typography } from '@mui/material';
import { useFormatCurrency } from '@common/intl';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';

export const CurrencyCell = <T extends RecordWithId>({
  column,
  rowData,
}: CellProps<T>) => {
  const currencyValue = column.accessor({ rowData }) as string;
  const formatCurrency = useFormatCurrency();
  const formattedCurrency = formatCurrency(currencyValue);

  return (
    <Typography
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'right',
        fontSize: 'inherit',
      }}
    >
      {formattedCurrency}
    </Typography>
  );
};
