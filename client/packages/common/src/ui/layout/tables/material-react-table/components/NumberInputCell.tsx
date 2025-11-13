import React from 'react';
import {
  NumericTextInput,
  useDebounceCallback,
  useBufferState,
  NumericTextInputProps,
} from '@openmsupply-client/common';
import { MRT_Cell, MRT_RowData } from 'material-react-table';

const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

interface NumberInputCellProps<T extends MRT_RowData>
  extends NumericTextInputProps {
  cell: MRT_Cell<T>;
  updateFn: (value: number) => void;
  debounceTime?: number; // ms
}

export const NumberInputCell = <T extends MRT_RowData>({
  cell,
  updateFn,
  // Normally debouncing should be done in the hook that handles the
  // read/update logic, but leaving the functionality here for compatibility
  // with existing implementations (e.g. allocation login in Outbound Shipments)
  debounceTime = 0,
  ...numericTextProps
}: NumberInputCellProps<T>) => {
  const { getValue, column, row } = cell;

  const value = column.accessorFn
    ? // Workaround for tanstack bug: https://github.com/TanStack/table/issues/5363
      (column.accessorFn(row.original, row.index) as number)
    : getValue<number>();

  const [buffer, setBuffer] = useBufferState(value);

  const debouncedUpdate = useDebounceCallback(
    (input: number) => {
      const resetValue = updateFn(input);

      // There is a use case, where setter logic could change the value to
      // something other than inputted.
      // E.g. input to issue 6 units, but setter rounds up to 10 (based on pack size).
      // buffer will update, as column.accessor now returns 10.
      // But now I try change the value to 7, and setter rounds up to 10 again.
      // As far as accessor is concerned, the external value hasn't changed (still 10)
      // but buffer is still 7.
      // In this case, can return the correct value from the setter and we
      // force an update here.
      if (resetValue !== undefined) {
        setBuffer(resetValue);
      }
    },
    [updateFn],
    debounceTime
  );

  return (
    <NumericTextInput
      decimalLimit={2}
      min={0}
      value={buffer}
      onChange={num => {
        const newValue = num === undefined ? 0 : num;
        if (newValue === value) return;
        setBuffer(newValue);
        debouncedUpdate(newValue);
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
