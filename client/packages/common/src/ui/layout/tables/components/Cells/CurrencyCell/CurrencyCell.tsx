import React from 'react';
import { Typography } from '@mui/material';
import { Currencies, useFormatCurrency } from '@common/intl';
import { RecordWithId } from '@common/types';
import { CellProps } from '../../../columns/types';

export const CurrencyCell =
  <T extends RecordWithId>({ currency }: { currency?: string } = {}) =>
  ({ rowData, column }: CellProps<T>) => {
    const currencyValue = column.accessor({ rowData }) as string;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const formatCurrency = useFormatCurrency(currency as Currencies);
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
