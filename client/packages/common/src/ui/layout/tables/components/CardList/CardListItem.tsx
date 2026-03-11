import React from 'react';
import { Box, Card, CardContent, Typography, useMediaQuery } from '@mui/material';
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
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  /** When true, renders horizontal label:value rows (simple mobile layout) */
  simpleLayout?: boolean;
}

const isActionCell = <T extends MRT_RowData>(
  cell: MRT_Cell<T, unknown>
): boolean => {
  const colDef = cell.column.columnDef as ColumnDef<T>;
  return !colDef.header || colDef.pin === 'right';
};

const isSummaryCell = <T extends MRT_RowData>(
  cell: MRT_Cell<T, unknown>
): boolean => {
  const colDef = cell.column.columnDef as ColumnDef<T>;
  return !!colDef.cardSummary;
};

const getCellContent = <T extends MRT_RowData>(cell: MRT_Cell<T, unknown>) =>
  cell.column.columnDef.Cell
    ? flexRender(cell.column.columnDef.Cell, cell.getContext())
    : cell.renderValue();

export const CardListItem = <T extends MRT_RowData>({
  row,
  cardRef,
  groupIcons,
  onClick,
  simpleLayout,
}: CardListItemProps<T>) => {
  const isLandscape = useMediaQuery(
    '(orientation: landscape) and (max-height: 800px)'
  );
  const cells = row.getVisibleCells();

  const actionCells: MRT_Cell<T, unknown>[] = [];
  const summaryCells: MRT_Cell<T, unknown>[] = [];
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
    } else {
      // Summary cells go into both the heading AND their group
      if (isSummaryCell(cell)) {
        summaryCells.push(cell);
      }
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
      onClick={onClick}
      sx={{
        overflow: 'visible',
        position: 'relative',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      <CardContent
        sx={{
          py: isLandscape ? 0.5 : 1.5,
          px: isLandscape ? 1.5 : 2.5,
          '&:last-child': { pb: isLandscape ? 0.5 : 1.5 },
        }}
      >
        {/* Heading row: summary values + action buttons */}
        {(summaryCells.length > 0 || actionCells.length > 0) && (
          <Box
            display="flex"
            alignItems="center"
            gap={1.5}
            mb={groups.length > 0 ? 1 : 0}
            py={0.5}
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              backgroundColor: 'background.paper',
              borderTop: '1px solid',
              borderColor: 'divider',
              borderRadius: '4px 4px 0 0',
              mx: isLandscape ? -1.5 : -2.5,
              px: isLandscape ? 1.5 : 2.5,
              mt: isLandscape ? -0.5 : -1.5,
              pt: isLandscape ? 1 : 1.5,
            }}
          >
            {summaryCells.map(cell => (
              <Box
                key={cell.id}
                display="flex"
                alignItems="center"
                gap={0.5}
                minWidth={0}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  whiteSpace="nowrap"
                >
                  {flexRender(
                    cell.column.columnDef.header,
                    cell.getContext()
                  )}
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {cell.renderValue() as React.ReactNode}
                </Typography>
              </Box>
            ))}
            <Box flex={1} />
            {actionCells.map(cell => (
              <Box key={cell.id} flexShrink={0}>
                {getCellContent(cell) as React.ReactNode}
              </Box>
            ))}
          </Box>
        )}
        {/* Data fields */}
        {simpleLayout
          ? dataCells.map(cell => (
              <Box
                key={cell.id}
                display="flex"
                justifyContent="space-between"
                gap={1}
                alignItems="flex-start"
              >
                <Typography color="text.secondary">
                  {flexRender(
                    cell.column.columnDef.header,
                    cell.getContext()
                  )}
                </Typography>
                <Box
                  sx={{
                    textAlign: 'end',
                    maxWidth: '65%',
                    wordBreak: 'break-word',
                  }}
                >
                  {getCellContent(cell) as React.ReactNode}
                </Box>
              </Box>
            ))
          : groups.map(({ groupName, cells: groupCells }, groupIndex) => (
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
