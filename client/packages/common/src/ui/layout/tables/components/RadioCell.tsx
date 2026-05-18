import React from 'react';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import { Radio, Box } from '@openmsupply-client/common';

export const MRTRadioCell = <T extends MRT_RowData>({
  cell,
  selectedId,
  onSelected,
  groupName = '',
  disabled,
}: {
  cell: MRT_Cell<T>;
  selectedId?: string | null;
  onSelected: (id: string | null) => void;
  groupName: string;
  disabled?: boolean;
}) => {
  const id = cell.getValue<string>();
  const checked = id === selectedId;

  return (
    <Box display="flex" alignItems="center">
      <Radio
        id={id}
        name={groupName}
        value={id}
        checked={checked}
        disabled={disabled}
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
