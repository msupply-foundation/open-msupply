import React from 'react';
import { CellProps, RecordWithId, Tooltip } from '@openmsupply-client/common';

export const TooltipTextCell = <T extends RecordWithId>({
  column,
  rowData,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const text = String(column.accessor({ rowData }) ?? '');
  return (
    <Tooltip title={text} placement="bottom-start">
      <div
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {text}
      </div>
    </Tooltip>
  );
};
