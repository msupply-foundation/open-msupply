import React, { useState } from 'react';
import {
  NumericTextInput,
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
  const { defaultValue } = numericTextProps;

  return (
    <NumericTextInput
      min={1}
      defaultValue={1}
      value={inputState}
      onChange={newValue => {
        // newValue is undefined while the field is empty mid-edit; fall back to
        // defaultValue so the parent always has a valid number. Propagate
        // synchronously — debouncing here lets a click handler read stale state
        // immediately after clearing the input (issue #11624).
        setInputState(newValue);
        updateFn(newValue ?? defaultValue ?? 1);
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
