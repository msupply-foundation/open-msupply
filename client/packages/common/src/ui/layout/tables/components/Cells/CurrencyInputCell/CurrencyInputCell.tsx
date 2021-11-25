import React from 'react';
import { CellProps } from '../../../columns';
import { CurrencyInput } from '../../../../../components/inputs';
import { DomainObject } from '../../../../../../types';
import { useDebounceCallback } from '../../../../../../hooks';

type R<T> = T &
  DomainObject & { update?: (key: string, value: string) => void };

type CP<T> = CellProps<R<T>>;

export const CurrencyInputCell = <T extends DomainObject>({
  rowData,
  column,
}: CP<T>): React.ReactElement<CP<T>> => {
  const [buffer, setBuffer] = React.useState(Number(column.accessor(rowData)));

  const noop = () => {};
  const updater = useDebounceCallback(rowData.update ?? noop, [rowData], 250);

  return (
    <CurrencyInput
      maxWidth={column.width}
      value={buffer}
      onChangeNumber={newNumber => {
        setBuffer(newNumber);
        updater(String(column.key), String(newNumber));
      }}
    />
  );
};
