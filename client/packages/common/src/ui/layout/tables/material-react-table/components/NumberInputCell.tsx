import React from 'react';
import {
  NumericTextInput,
  useDebounceCallback,
  useBufferState,
  NumericTextInputProps,
} from '@openmsupply-client/common';
import { MRT_Cell, MRT_RowData } from 'material-react-table';

interface NumberInputCellProps<T extends MRT_RowData>
  extends NumericTextInputProps {
  cell: MRT_Cell<T>;
  updateFn: (value: number, row: MRT_RowData) => void;
}

export const NumberInputCell = <T extends MRT_RowData>({
  cell,
  updateFn,
  ...numericTextProps
}: NumberInputCellProps<T>) => {
  const value = cell.getValue<number>();
  const [buffer, setBuffer] = useBufferState(value);

  const debouncedUpdate = useDebounceCallback(
    (input: number) => {
      updateFn(input, cell.row.original);
    },
    [updateFn],
    300
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
      {...numericTextProps}
    />
  );
};
