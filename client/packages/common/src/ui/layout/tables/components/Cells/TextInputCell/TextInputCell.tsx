import React from 'react';
import { CellProps } from '../../..';
import { BasicTextInput } from '../../../../../components/inputs/TextInput';
import { DomainObject } from '../../../../../../types';
import { useDebounceCallback } from '../../../../../..';

type R<T> = T &
  DomainObject & { update?: (key: string, value: string) => void };

type CP<T> = CellProps<R<T>>;

export const TextInputCell = <T extends DomainObject>({
  rowData,
  column,
}: CP<T>): React.ReactElement<CP<T>> => {
  const [buffer, setBuffer] = React.useState(column.accessor(rowData));

  const noop = () => {};
  const updater = useDebounceCallback(rowData.update ?? noop, [rowData], 500);

  return (
    <BasicTextInput
      value={buffer}
      onChange={e => {
        const newValue = e.target.value;
        setBuffer(newValue);
        updater(String(column.key), newValue);
      }}
    />
  );
};
