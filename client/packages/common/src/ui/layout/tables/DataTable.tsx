/**
 * DataTable — lightweight MUI table renderer for @tanstack/react-table.
 *
 * Replaces MaterialReactTable as the rendering layer. All display
 * configuration is read from table.options.meta (OmsTableMeta).
 */
import React from 'react';
import {
  flexRender,
  Table,
  RowData,
  Row,
  Header,
} from '@tanstack/react-table';
import {
  Box,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Checkbox,
  IconButton,
  Skeleton,
  alpha,
  Popover,
  FormControlLabel,
  List,
  ListItem,
} from '@mui/material';
import {
  CollapseIcon,
  ExpandIcon,
} from '@common/icons';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { useTranslation } from '@common/intl';
import { DataError, NothingHere } from '@common/components';
import { ColumnDef } from './types';
import { SettingsMenu } from './components/SettingsMenu';
import { OmsTableMeta } from './tableMeta';
import { MRT_DensityState } from './mrtCompat';
import { EnvUtils } from '@common/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getPadding = (density: MRT_DensityState, colSize?: number) => {
  if (density === 'compact') return '0.2rem 0.5rem';
  if (density === 'spacious') return colSize && colSize < 100 ? '0.8rem 0.6rem' : '0.8rem';
  // comfortable:
  return colSize && colSize < 100 ? '0.35rem 0.25rem' : '0.35rem 0.5rem';
};

const getStickyProps = (
  col: { getIsPinned: () => 'left' | 'right' | false; getStart: (side: 'left') => number; getAfter: (side: 'right') => number }
) => {
  const pinned = col.getIsPinned();
  if (!pinned) return {};
  return {
    position: 'sticky' as const,
    zIndex: 2,
    backgroundColor: 'rgba(252, 252, 252, 1)',
    ...(pinned === 'left' ? { left: col.getStart('left') } : { right: col.getAfter('right') }),
  };
};

// Render the cell value, checking our capital-C Cell alias first
const renderCellValue = <T extends RowData>(
  cell: ReturnType<Row<T>['getVisibleCells']>[number]
): React.ReactNode => {
  const def = cell.column.columnDef as ColumnDef<T>;
  if (cell.getIsGrouped()) {
    if (def.GroupedCell) return flexRender(def.GroupedCell, cell.getContext());
    return flexRender(def.Cell ?? def.cell, cell.getContext());
  }
  if (cell.getIsAggregated()) {
    if (def.AggregatedCell) return flexRender(def.AggregatedCell, cell.getContext());
    return cell.renderValue<string>()?.toString() ?? '';
  }
  if (cell.getIsPlaceholder()) {
    if (def.PlaceholderCell) return flexRender(def.PlaceholderCell, cell.getContext());
    return null;
  }
  if (def.Cell) return flexRender(def.Cell, cell.getContext());
  if (def.cell) return flexRender(def.cell, cell.getContext());
  return cell.renderValue<React.ReactNode>();
};

// Render the header, checking our capital-H Header alias first
const renderHeaderValue = <T extends RowData>(
  header: Header<T, unknown>
): React.ReactNode => {
  const def = header.column.columnDef as ColumnDef<T>;
  if (def.Header) return flexRender(def.Header, header.getContext());
  if (def.header)
    return flexRender(def.header, header.getContext());
  return null;
};

// ── ShowHideColumnsButton ─────────────────────────────────────────────────────

const ShowHideColumnsButton = <T extends RowData>({ table }: { table: Table<T> }) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const allLeafCols = table.getAllLeafColumns().filter(
    col => col.id !== 'mrt-row-select' && col.id !== 'mrt-row-expand'
  );

  return (
    <>
      <IconButton
        size="small"
        onClick={e => setAnchorEl(e.currentTarget)}
        title="Show/Hide Columns"
        sx={{ width: 40, height: 40 }}
      >
        <ViewColumnIcon fontSize="small" />
      </IconButton>
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <List dense sx={{ minWidth: 160, py: 0.5 }}>
          {allLeafCols.map(col => (
            <ListItem key={col.id} disablePadding sx={{ px: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                    disabled={!col.getCanHide()}
                  />
                }
                label={
                  typeof col.columnDef.header === 'string'
                    ? col.columnDef.header
                    : col.id
                }
                sx={{ width: '100%', m: 0 }}
              />
            </ListItem>
          ))}
        </List>
      </Popover>
    </>
  );
};

// ── TableToolbar ──────────────────────────────────────────────────────────────

const TableToolbar = <T extends RowData>({
  table,
  meta,
}: {
  table: Table<T>;
  meta: OmsTableMeta<T>;
}) => {
  const t = useTranslation();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minHeight: '2.5rem',
        px: 1,
        gap: 0.5,
      }}
    >
      {meta.toggleGrouped && !meta.isMobile && (
        <IconButton
          size="small"
          onClick={meta.toggleGrouped}
          title={meta.groupByLabel ?? t('label.group-by-item')}
          sx={{ width: 40, height: 40 }}
        >
          {meta.isGrouped ? <ExpandIcon /> : <CollapseIcon />}
        </IconButton>
      )}
      <ShowHideColumnsButton table={table} />
      <SettingsMenu
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        table={table as any}
        tableId={meta.tableId}
        density={meta.densityHook}
        columnSizing={meta.columnSizingHook}
        columnVisibility={meta.columnVisibilityHook}
        columnPinning={meta.columnPinningHook}
        columnOrder={meta.columnOrderHook}
        resetTableState={meta.resetTableState}
        onSaveAsGlobalDefault={meta.onSaveAsGlobalDefault}
        globalDefaults={meta.globalDefaults}
      />
    </Box>
  );
};

// ── SkeletonRow ───────────────────────────────────────────────────────────────

const SkeletonRow = <T extends RowData>({
  table,
  density,
}: {
  table: Table<T>;
  density: MRT_DensityState;
}) => (
  <TableRow>
    {table.getVisibleLeafColumns().map(col => (
      <TableCell
        key={col.id}
        sx={{
          padding: getPadding(density, col.getSize()),
          width: col.getSize(),
        }}
      >
        <Skeleton animation="wave" height={20} />
      </TableCell>
    ))}
  </TableRow>
);

// ── TableBodyRow ──────────────────────────────────────────────────────────────

const TableBodyRow = <T extends RowData>({
  row,
  table,
  meta,
}: {
  row: Row<T>;
  table: Table<T>;
  meta: OmsTableMeta<T>;
}) => {
  const density = meta.density;
  const isPlaceholder = meta.getIsPlaceholderRow?.(row) ?? false;
  const isRestricted = meta.getIsRestrictedRow?.(row) ?? false;
  const isSelected = row.getIsSelected();
  const isGroupRow = row.getIsGrouped();

  return (
    <TableRow
      selected={isSelected}
      onClick={
        meta.onRowClick && !isGroupRow
          ? (e: React.MouseEvent<HTMLTableRowElement>) => {
              const isCtrlClick = e.getModifierState(
                EnvUtils.os === 'Mac OS' ? 'Meta' : 'Control'
              );
              meta.onRowClick!(row.original, isCtrlClick);
            }
          : undefined
      }
      sx={{
        backgroundColor: 'inherit',
        minHeight: density === 'compact' ? '32px' : '40px',
        '&.Mui-selected td:after': {
          backgroundColor: theme => alpha(theme.palette.gray.pale, 0.2),
        },
        '&.Mui-selected:hover td:after': {
          backgroundColor: theme => alpha(theme.palette.gray.pale, 0.4),
        },
        fontStyle: isGroupRow ? 'italic' : 'normal',
        cursor: meta.onRowClick && !isGroupRow ? 'pointer' : 'default',
      }}
    >
      {row.getVisibleCells().map(cell => {
        const colDef = cell.column.columnDef as ColumnDef<T>;
        const isPinned = cell.column.getIsPinned();
        const colSize = cell.column.getSize();
        const isFirstCol = cell.column.getIndex() === 0;
        const isSelectCol = cell.column.id === 'mrt-row-select';

        // Retrieve per-column muiTableBodyCellProps sx
        const colCellProps = colDef.muiTableBodyCellProps;
        const resolvedColSx =
          typeof colCellProps === 'function'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? (colCellProps({ table: table as any, row: row as any, cell: cell as any, column: cell.column as any }) as any)?.sx
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            : (colCellProps as any)?.sx;

        const hasError = colDef.getIsError?.(row.original);

        return (
          <TableCell
            key={cell.id}
            sx={{
              fontSize: density === 'compact' ? '0.90em' : '1em',
              fontWeight: 400,
              alignItems: 'flex-end',
              color: isPlaceholder
                ? 'secondary.light'
                : isRestricted
                  ? 'gray.main'
                  : undefined,
              padding: getPadding(density, colSize),
              paddingLeft:
                !isGroupRow && table.getState().grouping?.length
                  ? '2em'
                  : isFirstCol && !isSelectCol
                    ? '1em'
                    : undefined,
              ...(isPinned || isSelected
                ? { backgroundColor: 'rgba(252, 252, 252, 1)' }
                : {}),
              ...getStickyProps(cell.column),
              ...(hasError
                ? {
                    border: '2px solid',
                    borderColor: 'error.main',
                    borderRadius: '8px',
                  }
                : {
                    borderBottom: '1px solid',
                    borderColor: 'border',
                  }),
              ...resolvedColSx,
            }}
          >
            {renderCellValue(cell)}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

// ── DataTable ─────────────────────────────────────────────────────────────────

export const DataTable = <T extends RowData>({
  table,
}: {
  table: Table<T>;
}) => {
  const meta = table.options.meta as OmsTableMeta<T>;
  const { density, isLoading, isError, noDataElement, showTopToolbar, showBottomToolbar } = meta;
  const t = useTranslation();

  const rows = table.getRowModel().rows;
  const headerGroups = table.getHeaderGroups();
  const isEmpty = !isLoading && rows.length === 0;

  // Build alternating row color style
  const bodyStyle = {
    '& tr:nth-of-type(odd)': { backgroundColor: 'background.row' },
  };

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'none',
      }}
    >
      {/* ── Top toolbar ── */}
      {showTopToolbar && <TableToolbar table={table} meta={meta} />}

      {/* ── Table container ── */}
      <TableContainer
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <MuiTable
          stickyHeader
          sx={theme => ({
            fontSize: theme.typography.body1.fontSize,
            ...(isEmpty ? { display: 'flex', flex: 1, flexDirection: 'column' } : {}),
          })}
        >
          {/* ── Header ── */}
          <TableHead>
            {headerGroups.map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const colDef = header.column.columnDef as ColumnDef<T>;
                  const isPinned = header.column.getIsPinned();
                  const colSize = header.column.getSize();
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  const canResize = header.column.getCanResize();

                  // Retrieve per-column muiTableHeadCellProps sx
                  const headCellProps = colDef.muiTableHeadCellProps;
                  const resolvedHeadSx =
                    typeof headCellProps === 'function'
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ? (headCellProps({ table: table as any, column: header.column as any, header: header as any }) as any)?.sx
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      : (headCellProps as any)?.sx;

                  return (
                    <TableCell
                      key={header.id}
                      colSpan={header.colSpan}
                      sx={{
                        fontWeight: 600,
                        fontSize: density !== 'spacious' ? '0.9em' : '1em',
                        lineHeight: 1.2,
                        justifyContent: 'flex-end',
                        padding: getPadding(density, colSize),
                        paddingRight: canResize
                          ? density === 'compact'
                            ? '8px'
                            : density === 'comfortable'
                              ? '16px'
                              : '24px'
                          : undefined,
                        width: colSize,
                        minWidth: colSize,
                        maxWidth: colSize,
                        position: 'relative',
                        userSelect: 'none',
                        ...(isPinned ? getStickyProps(header.column) : {}),
                        ...resolvedHeadSx,
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {canSort ? (
                            <TableSortLabel
                              active={!!sortDir}
                              direction={sortDir === 'desc' ? 'desc' : 'asc'}
                              onClick={header.column.getToggleSortingHandler()}
                              sx={{ overflow: 'hidden', flex: 1 }}
                            >
                              <Box
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'normal',
                                }}
                              >
                                {renderHeaderValue(header)}
                              </Box>
                            </TableSortLabel>
                          ) : (
                            <Box
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'normal',
                                flex: 1,
                              }}
                            >
                              {renderHeaderValue(header)}
                            </Box>
                          )}

                          {/* Resize handle */}
                          {canResize && (
                            <Box
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              sx={{
                                position: 'absolute',
                                right: 0,
                                top: '20%',
                                height: '60%',
                                width: '4px',
                                cursor: 'col-resize',
                                backgroundColor: header.column.getIsResizing()
                                  ? 'primary.main'
                                  : 'transparent',
                                '&:hover': { backgroundColor: 'primary.light' },
                                userSelect: 'none',
                                touchAction: 'none',
                              }}
                            />
                          )}
                        </Box>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableHead>

          {/* ── Body ── */}
          <TableBody sx={isEmpty ? { height: '100%' } : bodyStyle}>
            {isLoading ? (
              // Skeleton rows while loading
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} table={table} density={density} />
              ))
            ) : isEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  sx={{
                    border: 'none',
                    height: '100%',
                    textAlign: 'center',
                  }}
                >
                  {isError ? (
                    <DataError error={t('error.unable-to-load-data')} />
                  ) : (
                    noDataElement ?? <NothingHere />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => (
                <TableBodyRow key={row.id} row={row} table={table} meta={meta} />
              ))
            )}
          </TableBody>
        </MuiTable>
      </TableContainer>

      {/* ── Bottom toolbar ── */}
      {showBottomToolbar && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {meta.renderBottomToolbar
            ? meta.renderBottomToolbar(table)
            : meta.bottomToolbarContent ?? null}
        </Box>
      )}
    </Box>
  );
};
