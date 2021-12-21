import React from 'react';
import { CellProps } from '../../../columns';
import { BasicTextInput } from '@common/components';
import { DomainObject } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';

export const TextInputCell = <T extends DomainObject>({
  rowData,
  column,
  rows,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(
    column.accessor({ rowData, rows })
  );
  const updater = useDebounceCallback(column.setter, [rowData], 500);

  return (
    <BasicTextInput
      value={buffer}
      onChange={e => {
        const newValue = e.target.value;
        setBuffer(newValue);
        updater({ ...rowData, [column.key]: newValue });
      }}
    />
  );
};
