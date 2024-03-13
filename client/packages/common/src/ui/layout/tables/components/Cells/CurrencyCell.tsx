import React from 'react';
import {
  CellProps,
  Currencies,
  RecordWithId,
  Tooltip,
  useCurrency,
} from '@openmsupply-client/common';

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
  const price = Number(column.accessor({ rowData })) ?? 0;
  // format prices > 1 with default precision
  const precision = price < 1 ? 10 : undefined;
  const fullText = c(price, precision).format();
  let text = fullText;
  if (price !== 0 && price < 0.001) {
    text = `< ${c(0.001, 3).format()}`;
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
