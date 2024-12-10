import React, { ReactElement, useState } from 'react';
import {
  RecordWithId,
  CellProps,
  NumericTextInput,
  useDebounceCallback,
} from '@openmsupply-client/common';

export const PackSizeEntryCell =
  <T extends RecordWithId>({
    getIsDisabled,
  }: {
    getIsDisabled?: (row: T) => boolean;
  }) =>
  ({ rowData, column, isDisabled }: CellProps<T>): ReactElement => {
    const [packSize, setPackSize] = useState<number | undefined>(
      Number(column.accessor({ rowData }))
    );

    const updater = useDebounceCallback(column.setter, [column.setter], 250);
    const disabled = isDisabled || getIsDisabled?.(rowData) || false;

    return (
      <NumericTextInput
        min={1}
        defaultValue={1}
        value={packSize}
        onChange={newValue => {
          // newValue could be undefined, while the user is inputting
          // (e.g. they clear the field to enter a new pack size)
          // In that case, we keep the packSize local state as undefined
          // but set the row value to 1 (so we always have valid state to save)

          // NumericTextInput will reset to our default (1) on blur if the field is empty!
          setPackSize(newValue);
          updater({ ...rowData, [column.key]: newValue ?? 1 });
        }}
        disabled={disabled}
      />
    );
  };
