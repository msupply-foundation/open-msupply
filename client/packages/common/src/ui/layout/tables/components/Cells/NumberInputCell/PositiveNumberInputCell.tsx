import React from 'react';
import { CellProps } from '../../../columns';
import { BasicTextInput } from '@common/components';
import { DomainObject } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';

const parseValue = (value: string): { asString: string; asNumber: number } => {
  const parsed = Number(value);
  const asNumber = Number.isNaN(parsed) ? 0 : Math.max(parsed, 0);
  return { asString: asNumber.toString(), asNumber };
};

export const PositiveNumberInputCell = <T extends DomainObject>({
  rowData,
  column,
  rows,
  rowIndex,
  columnIndex,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(
    column.accessor({ rowData, rows })
  );
  const updater = useDebounceCallback(column.setter, [rowData], 250);

  const autoFocus = rowIndex === 0 && columnIndex === 0;

  return (
    <BasicTextInput
      autoFocus={autoFocus}
      InputProps={{ sx: { '& .MuiInput-input': { textAlign: 'right' } } }}
      type="number"
      value={buffer}
      onChange={e => {
        const newValue = parseValue(e.target.value);
        setBuffer(newValue.asString);
        updater({ ...rowData, [column.key]: newValue.asNumber });
      }}
    />
  );
};
