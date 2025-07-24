import React from 'react';
import { CellProps, RecordWithId, Tooltip } from '@openmsupply-client/common';
import { tooltipPlacement } from '../../tooltipPlacement';

export const TooltipTextCell = <T extends RecordWithId>({
  column,
  rowData,
  style,
}: CellProps<T> & { style?: React.CSSProperties }): React.ReactElement<
  CellProps<T>
> => {
  const text = String(column.accessor({ rowData }) ?? '');
  return (
    <Tooltip title={text} placement={tooltipPlacement(column.align)}>
      <div
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...style,
        }}
      >
        {text}
      </div>
    </Tooltip>
  );
};
