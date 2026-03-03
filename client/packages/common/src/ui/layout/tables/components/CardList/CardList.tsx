import React from 'react';
import { Stack, useMediaQuery } from '@mui/material';
import {
  MRT_RowData,
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
  MRT_TopToolbar,
} from 'material-react-table';
import { CardListItem } from './CardListItem';

interface CardListProps<T extends MRT_RowData> {
  table: MRT_TableInstance<T>;
  lastItemRef?: React.RefObject<HTMLDivElement>;
  groupIcons?: Record<string, React.ReactNode>;
}

const getRowOnClick = <T extends MRT_RowData>(
  table: MRT_TableInstance<T>,
  row: ReturnType<MRT_TableInstance<T>['getRowModel']>['rows'][number]
): React.MouseEventHandler<HTMLDivElement> | undefined => {
  const rowProps =
    typeof table.options.muiTableBodyRowProps === 'function'
      ? (
          table.options.muiTableBodyRowProps as
            | ((args: {
                row: typeof row;
                table: typeof table;
              }) => React.HTMLProps<HTMLDivElement>)
            | undefined
        )?.({ row, table }) ?? {}
      : (table.options.muiTableBodyRowProps ?? {});

  return rowProps.onClick as
    | React.MouseEventHandler<HTMLDivElement>
    | undefined;
};

export const CardList = <T extends MRT_RowData>({
  table,
  lastItemRef,
  groupIcons,
}: CardListProps<T>) => {
  const rows = table.getRowModel().rows;
  const isLandscape = useMediaQuery(
    '(orientation: landscape) and (max-height: 800px)'
  );

  return (
    <Stack
      spacing={isLandscape ? 1 : 1.5}
      sx={{
        width: '100%',
        ...(groupIcons
          ? {}
          : { mx: 'auto', maxWidth: 400 }),
      }}
    >
      {!groupIcons && <MRT_TopToolbar table={table} />}
      {rows.map((row, index) => (
        <CardListItem
          key={row.id}
          row={row}
          cardRef={index === rows.length - 1 ? lastItemRef : undefined}
          groupIcons={groupIcons}
          onClick={getRowOnClick(table, row)}
          simpleLayout={!groupIcons}
        />
      ))}
      <MRT_ShowHideColumnsButton table={table} />
    </Stack>
  );
};
