import React from 'react';
import { Typography } from '@mui/material';
import { useCurrencyFormat } from '@common/intl';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';

export const CurrencyCell = <T extends RecordWithId>({
  column,
  rowData,
  rows,
}: CellProps<T>) => {
  const currencyValue = column.accessor({ rowData, rows }) as string;
  const formattedCurrency = useCurrencyFormat(currencyValue);

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
