import React from 'react';
import { CellProps } from '../../../columns';
import { CurrencyInput } from '@common/components';
import { RecordWithId } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';

export const CurrencyInputCell = <T extends RecordWithId>({
  rowData,
  rows,
  column,
  rowIndex,
  columnIndex,
  isDisabled = false,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(
    Number(Number(column.accessor({ rowData, rows })))
  );

  const updater = useDebounceCallback(column.setter, [column.setter], 250);

  const autoFocus = rowIndex === 0 && columnIndex === 0;

  return (
    <CurrencyInput
      disabled={isDisabled}
      autoFocus={autoFocus}
      maxWidth={column.width}
      value={buffer}
      onChangeNumber={newNumber => {
        setBuffer(newNumber);
        updater({ ...rowData, [column.key]: Number(newNumber) });
      }}
    />
  );
};
