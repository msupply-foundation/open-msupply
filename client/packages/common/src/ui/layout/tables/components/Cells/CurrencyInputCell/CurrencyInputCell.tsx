import React from 'react';
import { CellProps } from '../../../columns';
import { CurrencyInput } from '@common/components';
import { DomainObject } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';

export const CurrencyInputCell = <T extends DomainObject>({
  rowData,
  rows,
  column,
  rowIndex,
  columnIndex,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(
    Number(Number(column.accessor({ rowData, rows })))
  );

  const updater = useDebounceCallback(column.setter, [rowData], 250);

  const autoFocus = rowIndex === 0 && columnIndex === 0;

  return (
    <CurrencyInput
      autoFocus={autoFocus}
      maxWidth={column.width}
      defaultValue={buffer}
      onChangeNumber={newNumber => {
        setBuffer(newNumber);
        updater({ ...rowData, [column.key]: Number(newNumber) });
      }}
    />
  );
};
