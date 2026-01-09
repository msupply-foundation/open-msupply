import React from 'react';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import { StatusChip } from '@openmsupply-client/common';

export const StatusCell = <T extends MRT_RowData>({
  cell,
  statusMap,
}: {
  cell: MRT_Cell<T>;
  statusMap: Record<
    string,
    { label: string; color: string; bgColor?: string }
  > | null;
}) => {
  const status = cell.getValue<string>();

  const { label, color, bgColor } = statusMap?.[status] ?? {};
  return <StatusChip label={label} color={color} bgColor={bgColor} />;
};
