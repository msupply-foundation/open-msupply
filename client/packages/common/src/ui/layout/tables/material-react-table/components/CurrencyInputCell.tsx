import React from 'react';
import { CurrencyInput } from '@common/components';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import { useDebounceCallback } from '@common/hooks';

const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

interface CurrencyInputCellProps<T extends MRT_RowData> {
  cell: MRT_Cell<T>;
  updateFn: (value: number) => void;
  isDisabled?: boolean;
}

export const CurrencyInputCell = <T extends MRT_RowData>({
  cell,
  isDisabled = false,
  updateFn,
}: CurrencyInputCellProps<T>) => {
  const value = cell.getValue<number>();
  const updater = useDebounceCallback(updateFn, [updateFn], 250);

  return (
    <CurrencyInput
      disabled={isDisabled}
      value={value}
      onChangeNumber={updater}
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
