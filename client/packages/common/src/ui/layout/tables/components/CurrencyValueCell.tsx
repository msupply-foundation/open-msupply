import React from 'react';
import { Tooltip } from '@mui/material';
import type { MRT_Cell, MRT_RowData } from '../mrtCompat';
import { Currencies, useCurrency } from '@common/intl';
import { NumUtils, UNDEFINED_STRING_VALUE } from '@common/utils';

export const CurrencyValueCell = <T extends MRT_RowData>({
  cell,
  currencyCode,
}: {
  cell: MRT_Cell<T>;
  currencyCode?: Currencies;
}) => {
  const { c } = useCurrency(currencyCode);

  if (cell.getValue() == null) {
    return <span>{UNDEFINED_STRING_VALUE}</span>;
  }

  const price = Number(cell.getValue());
  let displayPrice = c(price, 2).format();

  // If the price has more than 2 decimal places, round to 2 DP and add
  // ellipsis, if less than 0.01 just show "<0.01"
  if (NumUtils.hasMoreThanTwoDp(price)) {
    price < 0.01
      ? (displayPrice = `< ${c(0.01, 2).format()}`)
      : (displayPrice = `${displayPrice}...`);
  }

  return (
    <Tooltip title={c(price, 10).format()} placement="bottom-start">
      <span>{displayPrice}</span>
    </Tooltip>
  );
};
