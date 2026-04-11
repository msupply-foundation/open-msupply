import React from 'react';
import { Box, Stack } from '@mui/material';
import type { MRT_Row, MRT_RowData, MRT_TableInstance } from '../../mrtCompat';
import { CardListItem } from './CardListItem';
import { useIsLandscapeTablet } from '@common/hooks';
import { OmsTableMeta } from '../../tableMeta';
import { NothingHere } from '@common/components';

interface CardListProps<T extends MRT_RowData> {
  table: MRT_TableInstance<T>;
  lastItemRef?: React.RefObject<HTMLDivElement>;
  groupIcons?: Record<string, React.ReactNode>;
  actions?: React.ReactNode;
  stickyTopOffset?: number;
  /** When set, the card matching this row ID will be scrolled into view on mount */
  scrollToRowId?: string | null;
}

const getRowOnClick = <T extends MRT_RowData>(
  table: MRT_TableInstance<T>,
  row: MRT_Row<T>
): React.MouseEventHandler<HTMLDivElement> | undefined => {
  const meta = table.options.meta as OmsTableMeta<T> | undefined;
  if (!meta?.onRowClick) return undefined;
  return (e: React.MouseEvent<HTMLDivElement>) => {
    const isCtrlClick = e.getModifierState('Control') || e.getModifierState('Meta');
    meta.onRowClick!(row.original as T, isCtrlClick);
  };
};

export const CardList = <T extends MRT_RowData>({
  table,
  lastItemRef,
  groupIcons,
  actions,
  stickyTopOffset = 0,
  scrollToRowId,
}: CardListProps<T>) => {
  const rows = table.getRowModel().rows;
  const isLandscape = useIsLandscapeTablet();
  const scrollToRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta as OmsTableMeta<T> | undefined;

  React.useEffect(() => {
    if (scrollToRowId && scrollToRef.current) {
      scrollToRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [scrollToRowId]);

  const getCardRef = (row: MRT_Row<T>, index: number) => {
    if (
      scrollToRowId &&
      row.original &&
      'id' in row.original &&
      (row.original as Record<string, unknown>)['id'] === scrollToRowId
    ) {
      return scrollToRef;
    }
    if (index === rows.length - 1) return lastItemRef;
    return undefined;
  };

  return (
    <Stack
      spacing={isLandscape ? 1 : 1.5}
      sx={{
        width: '100%',
        ...(groupIcons ? {} : { mx: 'auto', maxWidth: 400 }),
      }}
    >
      {actions && (
        <Box
          display="flex"
          justifyContent="flex-end"
          alignItems="center"
          gap={1}
          sx={{
            position: 'sticky',
            top: stickyTopOffset,
            zIndex: 2,
            backgroundColor: 'background.paper',
          }}
        >
          {actions}
        </Box>
      )}
      {rows.length === 0
        ? (meta?.noDataElement ?? <NothingHere />)
        : rows.map((row, index) => (
            <CardListItem
              key={row.id}
              row={row}
              cardRef={getCardRef(row, index)}
              groupIcons={groupIcons}
              onClick={getRowOnClick(table, row)}
            />
          ))}
    </Stack>
  );
};
