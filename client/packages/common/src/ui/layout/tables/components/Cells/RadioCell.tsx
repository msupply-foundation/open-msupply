import React from 'react';
import {
  CellProps,
  Radio,
  RecordWithId,
  Box,
} from '@openmsupply-client/common';

export const RadioCell = <T extends RecordWithId>({
  rowData,
  column,
  selectedId,
  onSelected,
  groupName = '',
  isDisabled,
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
    <Box display="flex" alignItems="center">
      <Radio
        id={id}
        name={groupName}
        value={id}
        checked={checked}
        disabled={isDisabled}
        onClick={() => {
          if (checked) {
            onSelected?.(null);
          }
        }}
        onChange={() => {
          if (!checked) {
            onSelected?.(id);
          }
        }}
      />
    </Box>
  );
};
