import React from 'react';
import { CellProps } from '../../../columns';
import { BasicTextInput } from '@common/components';
import { RecordWithId } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';

export const TextInputCell = <T extends RecordWithId>({
  rowData,
  column,
  isAutoFocus,
  isDisabled = false,
  rowIndex,
  columnIndex,
  autocompleteName,
  fullWidth,
}: CellProps<T> & { fullWidth?: boolean }): React.ReactElement<
  CellProps<T>
> => {
  const [buffer, setBuffer] = useBufferState(column.accessor({ rowData }));
  const updater = useDebounceCallback(column.setter, [column.setter], 500);
  const { maxLength } = column;
  const autoFocus = isAutoFocus || (rowIndex === 0 && columnIndex === 0);
  // This enables browser autocomplete for suggesting previously entered input
  // (input needs to be wrapped in form with autoComplete="on", doesn't quite work in firefox)
  // see https://github.com/openmsupply/open-msupply/pull/305
  const autocompleteProps = autocompleteName
    ? { autoComplete: 'on', name: autocompleteName }
    : {};

  return (
    <BasicTextInput
      fullWidth={fullWidth}
      disabled={isDisabled}
      autoFocus={autoFocus}
      InputProps={maxLength ? { inputProps: { maxLength } } : undefined}
      value={buffer}
      onChange={e => {
        const newValue = e.target.value;
        setBuffer(newValue);
        updater({ ...rowData, [column.key]: newValue });
      }}
      {...autocompleteProps}
    />
  );
};
