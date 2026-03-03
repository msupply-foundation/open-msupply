import React from 'react';
import { Box, Card, CardContent } from '@mui/material';
import {
  flexRender,
  MRT_Cell,
  MRT_Row,
  MRT_RowData,
} from 'material-react-table';
import { ColumnDef } from '../../types';
import { CardListField } from './CardListField';
import { CardListFieldGroup } from './CardListFieldGroup';

interface CardListItemProps<T extends MRT_RowData> {
  row: MRT_Row<T>;
  cardRef?: React.Ref<HTMLDivElement>;
  groupIcons?: Record<string, React.ReactNode>;
}

const isActionCell = <T extends MRT_RowData>(
  cell: MRT_Cell<T, unknown>
): boolean => {
  const colDef = cell.column.columnDef as ColumnDef<T>;
  return !colDef.header || colDef.pin === 'right';
};

const isHeaderCell = <T extends MRT_RowData>(
  cell: MRT_Cell<T, unknown>
): boolean => {
  const colDef = cell.column.columnDef as ColumnDef<T>;
  return colDef.pin === 'left';
};

const getCellContent = <T extends MRT_RowData>(cell: MRT_Cell<T, unknown>) =>
  cell.column.columnDef.Cell
    ? flexRender(cell.column.columnDef.Cell, cell.getContext())
    : cell.renderValue();

export const CardListItem = <T extends MRT_RowData>({
  row,
  cardRef,
  groupIcons,
}: CardListItemProps<T>) => {
  const cells = row.getVisibleCells();

  const actionCells: MRT_Cell<T, unknown>[] = [];
  const headerCells: MRT_Cell<T, unknown>[] = [];
  const dataCells: MRT_Cell<T, unknown>[] = [];

  for (const cell of cells) {
    // Skip MRT internal columns
    if (
      cell.column.id === 'mrt-row-select' ||
      cell.column.id === 'mrt-row-expand'
    )
      continue;

    if (isActionCell(cell)) {
      actionCells.push(cell);
    } else if (isHeaderCell(cell)) {
      headerCells.push(cell);
    } else {
      dataCells.push(cell);
    }
  }

  // Group data cells by columnGroup, preserving definition order
  const groups: { groupName: string | undefined; cells: typeof dataCells }[] =
    [];
  const groupMap = new Map<string | undefined, typeof dataCells>();

  for (const cell of dataCells) {
    const groupName = (cell.column.columnDef as ColumnDef<T>).columnGroup;
    let group = groupMap.get(groupName);
    if (!group) {
      group = [];
      groupMap.set(groupName, group);
      groups.push({ groupName, cells: group });
    }
    group.push(cell);
  }

  return (
    <Card
      ref={cardRef}
      variant="outlined"
      sx={{ overflow: 'visible', position: 'relative' }}
    >
      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
        {/* Title row: pinned-left fields + action buttons */}
        {(headerCells.length > 0 || actionCells.length > 0) && (
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            mb={groups.length > 0 ? 0.5 : 0}
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              backgroundColor: 'background.paper',
            }}
          >
            {headerCells.map(cell => (
              <CardListField
                key={cell.id}
                label={flexRender(
                  cell.column.columnDef.header,
                  cell.getContext()
                )}
              >
                {getCellContent(cell) as React.ReactNode}
              </CardListField>
            ))}
            <Box flex={1} />
            {actionCells.map(cell => (
              <Box key={cell.id} flexShrink={0}>
                {getCellContent(cell) as React.ReactNode}
              </Box>
            ))}
          </Box>
        )}
        {/* Grouped data fields */}
        {groups.map(({ groupName, cells: groupCells }, groupIndex) => (
          <CardListFieldGroup
            key={groupName ?? `ungrouped-${groupIndex}`}
            groupName={groupName}
            groupIcon={groupName ? groupIcons?.[groupName] : undefined}
          >
            {groupCells.map(cell => (
              <CardListField
                key={cell.id}
                label={flexRender(
                  cell.column.columnDef.header,
                  cell.getContext()
                )}
              >
                {getCellContent(cell) as React.ReactNode}
              </CardListField>
            ))}
          </CardListFieldGroup>
        ))}
      </CardContent>
    </Card>
  );
};
