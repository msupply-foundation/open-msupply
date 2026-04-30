import React, { useState } from 'react';
import {
  NumericTextInput,
  useDebounceCallback,
  NumericTextInputProps,
} from '@openmsupply-client/common';
import { MRT_Cell, MRT_RowData } from 'material-react-table';

const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

interface NumberInputCellProps<T extends MRT_RowData>
  extends NumericTextInputProps {
  cell: MRT_Cell<T>;
  updateFn: (value: number) => void;
}

export const RequiredNumberInputCell = <T extends MRT_RowData>({
  cell,
  updateFn,
  ...numericTextProps
}: NumberInputCellProps<T>) => {
  const value = cell.getValue<number>();
  const [inputState, setInputState] = useState<number | undefined>(value);

  const updater = useDebounceCallback(updateFn, [updateFn], 250);

  return (
    <NumericTextInput
      min={1}
      defaultValue={1}
      value={inputState}
      onChange={newValue => {
        // newValue could be undefined, while the user is inputting
        // (e.g. they clear the field to enter a new pack size)
        // In that case, we keep the local input state as undefined
        // but set the row value to 1 (so we always have valid state to save)

        // NumericTextInput will reset to our default (1) on blur if the field is empty!
        setInputState(newValue);
        updater(newValue ?? 1);
      }}
      onKeyDown={e => {
        // Allow using arrow keys to move input cursor without
        // navigating to the next/previous cell
        if (ARROW_KEYS.includes(e.key)) {
          e.stopPropagation();
        }
      }}
      fullWidth
      {...numericTextProps}
    />
  );
};
