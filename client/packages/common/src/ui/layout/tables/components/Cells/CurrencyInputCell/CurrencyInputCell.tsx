import React from 'react';
import { CellProps } from '../../../columns';
import { CurrencyInput } from '@common/components';
import { RecordWithId } from '@common/types';
import { useDebounceCallback } from '@common/hooks';

export const CurrencyInputCell = <T extends RecordWithId>({
  rowData,
  column,
  rowIndex,
  columnIndex,
  isDisabled = false,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const updater = useDebounceCallback(column.setter, [column.setter], 250);

  const autoFocus = rowIndex === 0 && columnIndex === 0;

  return (
    <CurrencyInput
      disabled={isDisabled}
      autoFocus={autoFocus}
      maxWidth={column.width}
      defaultValue={String(column.accessor({ rowData }) ?? 0)}
      onChangeNumber={newValue =>
        updater({ ...rowData, [column.key]: newValue })
      }
    />
  );
};
