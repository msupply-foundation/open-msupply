import React from 'react';
import { CellProps } from '../../../columns';
import { CurrencyInput } from '@common/components';
import { DomainObject } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';

export const CurrencyInputCell = <T extends DomainObject>({
  rowData,
  column,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(Number(column.accessor(rowData)));

  const updater = useDebounceCallback(column.setter, [rowData], 250);

  return (
    <CurrencyInput
      maxWidth={column.width}
      value={buffer}
      onChangeNumber={newNumber => {
        setBuffer(newNumber);
        updater({ ...rowData, [column.key]: Number(newNumber) });
      }}
    />
  );
};
