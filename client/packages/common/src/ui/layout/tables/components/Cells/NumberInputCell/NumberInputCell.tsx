import React from 'react';
import { CellProps } from '../../../columns';
import { BasicTextInput } from '../../../../../components/inputs/TextInput';
import { DomainObject } from '../../../../../../types';
import { useDebounceCallback } from '../../../../../../hooks';

type R<T> = T &
  DomainObject & { update?: (key: string, value: string) => void };

type CP<T> = CellProps<R<T>>;

export const NumberInputCell = <T extends DomainObject>({
  rowData,
  column,
}: CP<T>): React.ReactElement<CP<T>> => {
  const [buffer, setBuffer] = React.useState(column.accessor(rowData));

  const noop = () => {};
  const updater = useDebounceCallback(rowData.update ?? noop, [rowData], 250);

  return (
    <BasicTextInput
      InputProps={{ sx: { '& .MuiInput-input': { textAlign: 'right' } } }}
      type="number"
      value={buffer}
      onChange={e => {
        const newValue = e.target.value;
        setBuffer(newValue);
        updater(String(column.key), newValue);
      }}
    />
  );
};
