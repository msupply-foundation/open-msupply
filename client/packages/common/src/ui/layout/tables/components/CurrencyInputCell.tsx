import React from 'react';
import { CurrencyInput } from '@common/components';
import { MRT_Cell, MRT_RowData } from 'material-react-table';

const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const noop = () => {};

interface CurrencyInputCellProps<T extends MRT_RowData> {
  cell: MRT_Cell<T>;
  updateFn?: (value: number) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const CurrencyInputCell = <T extends MRT_RowData>({
  cell,
  disabled = false,
  updateFn,
  style,
}: CurrencyInputCellProps<T>) => {
  const value = cell.getValue<number>();

  return (
    <CurrencyInput
      disabled={disabled}
      value={value}
      onChangeNumber={updateFn ?? noop}
      onKeyDown={e => {
        // Allow using arrow keys to move input cursor without
        // navigating to the next/previous cell
        if (ARROW_KEYS.includes(e.key)) {
          e.stopPropagation();
        }
      }}
      width="100%"
      style={style}
    />
  );
};
