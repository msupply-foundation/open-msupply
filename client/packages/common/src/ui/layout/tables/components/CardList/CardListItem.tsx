import React from 'react';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import {
  flexRender,
  MRT_Cell,
  MRT_Row,
  MRT_RowData,
} from 'material-react-table';
import { ColumnDef } from '../../types';
import { CardListField } from './CardListField';
import { CardListFieldGroup } from './CardListFieldGroup';
import { useIsLandscapeTablet } from '@common/hooks';

/** Access custom ColumnDef fields from an MRT cell.
 *  ColumnDef<T> extends MRT_ColumnDef<T>, but MRT types columnDef as the
 *  base type, so we narrow it here once. */
const colDef = <T extends MRT_RowData>(
  cell: MRT_Cell<T, unknown>
): ColumnDef<T> => cell.column.columnDef as ColumnDef<T>;

interface CardListItemProps<T extends MRT_RowData> {
  row: MRT_Row<T>;
  cardRef?: React.Ref<HTMLDivElement>;
  groupIcons?: Record<string, React.ReactNode>;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const isActionCell = <T extends MRT_RowData>(
  cell: MRT_Cell<T, unknown>
): boolean => {
  const def = colDef(cell);
  return !def.header || def.pin === 'right';
};

const isSummaryCell = <T extends MRT_RowData>(
  cell: MRT_Cell<T, unknown>
): boolean => !!colDef(cell).cardSummary;

const getCellContent = <T extends MRT_RowData>(
  cell: MRT_Cell<T, unknown>
): React.ReactNode =>
  cell.column.columnDef.Cell
    ? flexRender(cell.column.columnDef.Cell, cell.getContext())
    : cell.renderValue<React.ReactNode>();

const getSummaryContent = <T extends MRT_RowData>(
  cell: MRT_Cell<T, unknown>
): React.ReactNode => colDef(cell).cardSummary!(cell.row.original);

export const CardListItem = <T extends MRT_RowData>({
  row,
  cardRef,
  groupIcons,
  onClick,
}: CardListItemProps<T>) => {
  const isLandscape = useIsLandscapeTablet();

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

  // Sort summary cells by cardSummaryOrder (lower first); columns without
  // an explicit order keep their original position after ordered ones.
  summaryCells.sort((a, b) => {
    const oa = colDef(a).cardSummaryOrder ?? Infinity;
    const ob = colDef(b).cardSummaryOrder ?? Infinity;
    return oa - ob;
  });

  // Group data cells by columnGroup, preserving definition order
  const groups: { groupName: string | undefined; cells: typeof dataCells }[] =
    [];
  const groupMap = new Map<string | undefined, typeof dataCells>();

  for (const cell of dataCells) {
    const groupName = colDef(cell).columnGroup;
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
        borderRadius: 4,
      }}
    >
      <CardContent
        sx={{
          py: isLandscape ? 0.5 : 1.5,
          px: isLandscape ? 1.5 : 2.5,
          '&:last-child': { pb: isLandscape ? 0.5 : 1.5 },
        }}
      >
        {/* Heading row: summary values */}
        {summaryCells.length > 0 && (
          <Box
            display="flex"
            alignItems="center"
            gap={1.5}
            mb={groups.length > 0 ? 1 : 0}
            py={0.5}
          >
            <Typography
              key={summaryCells[0]!.id}
              variant="subtitle2"
              fontWeight={700}
              noWrap
            >
              {getSummaryContent(summaryCells[0]!)}
            </Typography>
            <Box flex={1} />
            {summaryCells.slice(1).map(cell => (
              <Typography key={cell.id} variant="subtitle2" noWrap>
                {getSummaryContent(cell)}
              </Typography>
            ))}
          </Box>
        )}
        {/* Data fields */}
        {!groupIcons
          ? dataCells.map(cell => (
              <Box
                key={cell.id}
                display="flex"
                justifyContent="space-between"
                gap={1}
                alignItems="flex-start"
                py={0.5}
              >
                <Typography color="text.secondary">
                  {flexRender(cell.column.columnDef.header, cell.getContext())}
                </Typography>
                <Box
                  sx={{
                    textAlign: 'end',
                    maxWidth: '65%',
                    wordBreak: 'break-word',
                  }}
                >
                  {getCellContent(cell)}
                </Box>
              </Box>
            ))
          : groups.map(({ groupName, cells: groupCells }, groupIndex) => (
              <React.Fragment key={groupName ?? `ungrouped-${groupIndex}`}>
                {groupIndex > 0 && <Divider />}
                <CardListFieldGroup
                  groupIcon={groupName ? groupIcons?.[groupName] : undefined}
                >
                  {groupCells.map(cell => (
                    <CardListField
                      key={cell.id}
                      label={flexRender(
                        cell.column.columnDef.header,
                        cell.getContext()
                      )}
                      span={colDef(cell).cardSpan}
                    >
                      {getCellContent(cell)}
                    </CardListField>
                  ))}
                </CardListFieldGroup>
              </React.Fragment>
            ))}
        {/* Action buttons at bottom-right */}
        {actionCells.length > 0 && (
          <Box display="flex" justifyContent="flex-end" gap={1} mt={1}>
            {actionCells.map(cell => (
              <Box key={cell.id} flexShrink={0}>
                {getCellContent(cell)}
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
