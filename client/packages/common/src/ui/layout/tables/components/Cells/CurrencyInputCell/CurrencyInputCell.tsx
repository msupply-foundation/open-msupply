import React from 'react';
import { CellProps } from '../../../columns';
import { CurrencyInput } from '@common/components';
import { RecordWithId } from '@common/types';

export const CurrencyInputCell = <T extends RecordWithId>({
  rowData,
  column,
  rowIndex,
  columnIndex,
  isDisabled = false,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const autoFocus = rowIndex === 0 && columnIndex === 0;

  return (
    <CurrencyInput
      disabled={isDisabled}
      autoFocus={autoFocus}
      maxWidth={column.width}
      value={String(column.accessor({ rowData }) ?? 0)}
      onChangeNumber={newValue =>
        column.setter({ ...rowData, [column.key]: newValue })
      }
    />
  );
};
