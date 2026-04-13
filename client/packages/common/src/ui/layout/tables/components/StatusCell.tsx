import React from 'react';
import type { MRT_Cell, MRT_RowData } from '../mrtCompat';
import { StatusChip } from '@openmsupply-client/common';

export const StatusCell = <T extends MRT_RowData>({
  cell,
  statusMap,
}: {
  cell: MRT_Cell<T>;
  statusMap: Record<
    string,
    { label: string; colour: string; bgColour?: string }
  > | null;
}) => {
  const status = cell.getValue<string>();

  const { label, colour, bgColour } = statusMap?.[status] ?? {};
  return <StatusChip label={label} colour={colour} bgColour={bgColour} />;
};
