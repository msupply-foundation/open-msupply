import React from 'react';
import { BasicTextInput } from '@common/components';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import { useBufferState, useDebounceCallback } from '@common/hooks';

interface TextInputCell<T extends MRT_RowData> {
  cell: MRT_Cell<T>;
  updateFn: (value: string) => void;
  isDisabled?: boolean;
  autoFocus?: boolean;
}

export const TextInputCell = <T extends MRT_RowData>({
  cell,
  updateFn,
  isDisabled = false,
  autoFocus = false,
}: TextInputCell<T>) => {
  const value = cell.getValue<string>();
  const [buffer, setBuffer] = useBufferState(value);
  const updater = useDebounceCallback(updateFn, [updateFn], 250);

  return (
    <BasicTextInput
      disabled={isDisabled}
      value={buffer ?? ''}
      onChange={e => {
        const newValue = e.target.value;
        setBuffer(newValue);
        updater(newValue);
      }}
      autoFocus={autoFocus}
      fullWidth

      // Enable these as required?
      // required={isRequired}
      // multiline={multiline}
      // slotProps={{
      //   input: {
      //     inputProps: {
      //       maxLength: maxLength ? maxLength : undefined,
      //     },
      //   },
      // }}
      // {...autocompleteProps}
    />
  );
};
