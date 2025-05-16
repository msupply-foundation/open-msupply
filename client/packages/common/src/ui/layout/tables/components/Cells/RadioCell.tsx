import React from 'react';
import { CellProps, Radio, RecordWithId } from '@openmsupply-client/common';

export const RadioCell = <T extends RecordWithId>({
  rowData,
  column,
  selectedId,
  onSelected,
  groupName = '',
}: CellProps<T> & {
  selectedId: string | null;
  onSelected: (id: string | null) => void;
  groupName: string;
}) => {
  const id = column.accessor({
    rowData,
  }) as string;
  const checked = id === selectedId;

  return (
    <Radio
      id={id}
      name={groupName}
      value={id}
      checked={checked}
      onChange={() => onSelected?.(id)}
    />
  );
};
