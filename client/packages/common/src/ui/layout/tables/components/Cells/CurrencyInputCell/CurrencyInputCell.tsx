import React from 'react';
import { CellProps } from '../../../columns';
import { CurrencyInput } from '@common/components';
import { DomainObject } from '@common/types';
import { useDebounceCallback } from '@common/hooks';

type DomainObjectWithUpdater<T> = T &
  DomainObject & { update?: (key: string, value: string) => void };

type CellPropsWithUpdaterObject<T> = CellProps<DomainObjectWithUpdater<T>>;

export const CurrencyInputCell = <T extends DomainObject>({
  rowData,
  column,
}: CellPropsWithUpdaterObject<T>): React.ReactElement<
  CellPropsWithUpdaterObject<T>
> => {
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
