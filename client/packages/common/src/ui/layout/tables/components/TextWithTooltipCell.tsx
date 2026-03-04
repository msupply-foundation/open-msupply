import React from 'react';
import { Tooltip } from '@openmsupply-client/common';
import { MRT_Cell, MRT_RowData } from 'material-react-table';

export const TextWithTooltipCell = <T extends MRT_RowData>({
  cell,
}: {
  cell: MRT_Cell<T>;
}) => {
  const value = cell.getValue<string>();
  return (
    <Tooltip title={value}>
      <div
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
    </Tooltip>
  );
};
