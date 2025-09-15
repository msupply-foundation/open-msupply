import React from 'react';
import {
  CellProps,
  Currencies,
  NumUtils,
  RecordWithId,
  Tooltip,
  useCurrency,
} from '@openmsupply-client/common';
import { MRT_Cell, MRT_RowData } from 'material-react-table';

/** Get a Currency cell component for a certain currency code  */
export const useCurrencyCell = <T extends RecordWithId>(
  currencyCode?: Currencies
) => {
  return (props: CellProps<T>): React.ReactElement => (
    <CurrencyCell {...props} currencyCode={currencyCode} />
  );
};

/**
 * Expects an accessor that returns a number | undefined
 */
export const CurrencyCell = <T extends RecordWithId>({
  column,
  rowData,
  currencyCode,
}: CellProps<T> & { currencyCode?: Currencies }): React.ReactElement<
  CellProps<T>
> => {
  const { c } = useCurrency(currencyCode);
  const price = Number(column.accessor({ rowData }) ?? 0);
  const fullText = c(price, 10).format();
  let text = fullText;
  // If the price has more than 2 decimal places, round to 2 DP and add
  // ellipsis, if less than 0.01 just show "<0.01"
  if (NumUtils.hasMoreThanTwoDp(price)) {
    price < 0.01
      ? (text = `< ${c(0.01, 2).format()}`)
      : (text = `${c(price, 2).format()}...`);
  }

  return (
    <Tooltip title={fullText} placement="bottom-start">
      <div
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {text}
      </div>
    </Tooltip>
  );
};

export const CurrencyValueCell = <T extends MRT_RowData>({
  cell,
  currencyCode,
}: {
  cell: MRT_Cell<T>;
  currencyCode?: Currencies;
}) => {
  const { c } = useCurrency(currencyCode);

  const price = Number(cell.getValue() ?? 0);
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
      <>{displayPrice}</>
    </Tooltip>
  );
};
