import React from 'react';

import { CellProps } from '../../../columns';
import { RecordWithId } from '@common/types';
import { StatusChip } from '@openmsupply-client/common/src/ui/components/panels/StatusChip';

interface StatusProps {
  statusMap: Record<
    string,
    { label: string; color: string; bgColor?: string }
  > | null;
}

export const StatusCell = <T extends RecordWithId>({
  rowData,
  column,
  statusMap,
}: CellProps<T> & StatusProps) => {
  const { label, color, bgColor } =
    statusMap?.[String(column.accessor({ rowData }))] ?? {};
  return <StatusChip label={label} color={color} bgColor={bgColor} />;
};
