import React from 'react';
import { Stack, useMediaQuery } from '@mui/material';
import {
  MRT_Row,
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

const getRowOnClick = <T extends MRT_RowData>(
  table: MRT_TableInstance<T>,
  row: MRT_Row<T>
): React.MouseEventHandler<HTMLDivElement> | undefined => {
  const muiRowProps = table.options.muiTableBodyRowProps;
  const rowProps =
    typeof muiRowProps === 'function'
      ? muiRowProps({ row, table, staticRowIndex: 0 })
      : (muiRowProps ?? {});

  // TableRowProps.onClick is typed for HTMLTableRowElement, but we're
  // applying it to a Card (HTMLDivElement). The handler signatures are
  // compatible at runtime, so we need this cast to bridge the element types.
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
      {rows.map((row, index) => (
        <CardListItem
          key={row.id}
          row={row}
          cardRef={index === rows.length - 1 ? lastItemRef : undefined}
          groupIcons={groupIcons}
          onClick={getRowOnClick(table, row)}
        />
      ))}
      <MRT_ShowHideColumnsButton table={table} sx={{ alignSelf: 'center' }} />
    </Stack>
  );
};
