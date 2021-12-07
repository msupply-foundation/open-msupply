import React from 'react';
import { CellProps } from '../../../columns';
import { BasicTextInput } from '../../../../../components/inputs/TextInput';
import { DomainObject } from '@common/types';
import { useDebounceCallback } from '../../../../../../hooks';

type DomainObjectWithUpdater<T> = T &
  DomainObject & { update?: (key: string, value: string) => void };

type CellPropsWithUpdaterObject<T> = CellProps<DomainObjectWithUpdater<T>>;

export const NumberInputCell = <T extends DomainObject>({
  rowData,
  column,
}: CellPropsWithUpdaterObject<T>): React.ReactElement<
  CellPropsWithUpdaterObject<T>
> => {
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
