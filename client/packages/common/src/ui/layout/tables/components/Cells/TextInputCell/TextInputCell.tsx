import React from 'react';
import { CellProps } from '../../../columns';
import { BasicTextInput } from '@common/components';
import { DomainObject } from '@common/types';
import { useDebounceCallback } from '@common/hooks';

type RowData<T> = T & DomainObject;

type DomainObjectWithUpdater<T> = RowData<T> & {
  update: (patch: Partial<RowData<T>>) => void;
};

type CellPropsWithUpdaterObject<T> = CellProps<DomainObjectWithUpdater<T>>;

export const TextInputCell = <T extends DomainObject>({
  rowData,
  column,
}: CellPropsWithUpdaterObject<T>): React.ReactElement<
  CellPropsWithUpdaterObject<T>
> => {
  const [buffer, setBuffer] = React.useState(column.accessor(rowData));

  const noop = () => {};
  const updater = useDebounceCallback(rowData.update ?? noop, [rowData], 500);

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
