import React from 'react';
import { Stack } from '@mui/material';
import {
  MRT_RowData,
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
} from 'material-react-table';
import { CardListItem } from './CardListItem';

interface CardListProps<T extends MRT_RowData> {
  table: MRT_TableInstance<T>;
  lastItemRef?: React.RefObject<HTMLDivElement>;
  groupIcons?: Record<string, React.ReactNode>;
}

export const CardList = <T extends MRT_RowData>({
  table,
  lastItemRef,
  groupIcons,
}: CardListProps<T>) => {
  const rows = table.getRowModel().rows;

  return (
    <Stack spacing={1.5} sx={{ width: '100%' }}>
      {rows.map((row, index) => (
        <CardListItem
          key={row.id}
          row={row}
          cardRef={index === rows.length - 1 ? lastItemRef : undefined}
          groupIcons={groupIcons}
        />
      ))}
      <MRT_ShowHideColumnsButton table={table} />
    </Stack>
  );
};
