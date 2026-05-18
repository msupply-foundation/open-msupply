import React from 'react';
import { CurrencyInput } from '@common/components';
import { Currencies } from '@common/intl';
import { MRT_Cell, MRT_RowData } from 'material-react-table';

const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const noop = () => {};

interface CurrencyInputCellProps<T extends MRT_RowData> {
  cell: MRT_Cell<T>;
  updateFn?: (value: number) => void;
  disabled?: boolean;
  currencyCode?: Currencies;
  decimalsLimit?: number;
}

export const CurrencyInputCell = <T extends MRT_RowData>({
  cell,
  disabled = false,
  updateFn,
  currencyCode,
  decimalsLimit,
}: CurrencyInputCellProps<T>) => {
  const value = cell.getValue<number>();

  return (
    <CurrencyInput
      disabled={disabled}
      value={value}
      currencyCode={currencyCode}
      onChangeNumber={updateFn ?? noop}
      decimalsLimit={decimalsLimit}
      onKeyDown={e => {
        // Allow using arrow keys to move input cursor without
        // navigating to the next/previous cell
        if (ARROW_KEYS.includes(e.key)) {
          e.stopPropagation();
        }
      }}
      width="100%"
    />
  );
};
