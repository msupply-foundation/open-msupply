import React, { useMemo, useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  ColumnDef as TanstackColumnDef,
  Row,
  TableState,
  OnChangeFn,
  PaginationState,
  RowSelectionState,
  Table,
  RowModel,
} from '@tanstack/react-table';
import { Checkbox } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ColumnDef } from './types';
import { useMaterialTableColumns } from './useMaterialTableColumns';
import { useTableFiltering } from './useTableFiltering';
import { useUrlSortManagement } from './useUrlSortManagement';
import {
  useColumnDensity,
  useColumnOrder,
  useColumnSizing,
  useColumnVisibility,
  useColumnPinning,
  useSaveGlobalTableConfig,
  useGlobalTableDefaults,
  useColumnGrouping,
} from './tableState';
import { clearSavedState, getSavedState } from './tableState/utils';
import {
  useIsCentralServerApi,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { MRT_RowData } from './mrtCompat';
import { OmsTableMeta } from './tableMeta';
import {
  CheckboxCheckedIcon,
  CheckboxEmptyIcon,
  CheckboxIndeterminateIcon,
} from '@common/icons';

// ── Row model factories — created once at module level (pure, no state) ──────
const _getCoreRowModel = getCoreRowModel();
const _getSortedRowModel = getSortedRowModel();
const _getFilteredRowModel = getFilteredRowModel();
const _getGroupedRowModel = getGroupedRowModel();
const _getFacetedRowModel = getFacetedRowModel();
const _getFacetedUniqueValues = getFacetedUniqueValues();

export interface BaseTableConfig<T extends MRT_RowData> {
  tableId: string;
  data: T[] | undefined;
  columns: ColumnDef<T>[];

  // Row interaction
  onRowClick?: (row: T, isCtrlClick: boolean) => void;
  isLoading?: boolean;
  isError?: boolean;
  getIsPlaceholderRow?: (row: Row<T>) => boolean;
  /** Whether row should be greyed out - still potentially clickable */
  getIsRestrictedRow?: (row: Row<T>) => boolean;
  grouping?: {
    field: string;
    groupedByDefault?: boolean;
    label?: string;
    /** Fires when the user toggles grouping on/off. */
    onToggle?: (isGrouped: boolean) => void;
  };
  /** Keep sorting and filtering in local component state instead of syncing to URL query params. Use for tables in modals, popovers, or anywhere the table state shouldn't affect the URL. */
  localStateOnly?: boolean;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  noDataElement?: React.ReactNode;
  isMobile?: boolean;

  // @tanstack pass-through options
  state?: Partial<TableState>;
  enableRowSelection?: boolean | ((row: Row<T>) => boolean);
  enableMultiRowSelection?: boolean;
  enableColumnResizing?: boolean;
  manualFiltering?: boolean;
  manualPagination?: boolean;
  manualSorting?: boolean;
  autoResetPageIndex?: boolean;
  rowCount?: number;
  onPaginationChange?: OnChangeFn<PaginationState>;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  filterFromLeafRows?: boolean;
  getRowId?: (row: T, index: number, parent?: Row<T>) => string;

  // DataTable display flags (stored in meta)
  enableBottomToolbar?: boolean;
  enableTopToolbar?: boolean;
  enableColumnActions?: boolean;
  enableSorting?: boolean;
  enableVirtualization?: boolean;
  enablePagination?: boolean;

  // Bottom toolbar content
  renderBottomToolbar?: (table: Table<T>) => React.ReactNode;
  renderBottomToolbarCustomActions?: () => React.ReactNode;
  bottomToolbarContent?: React.ReactNode;
}

export const useBaseMaterialTable = <T extends MRT_RowData>({
  tableId,
  state,
  isLoading,
  isError,
  onRowClick,
  getIsPlaceholderRow,
  getIsRestrictedRow,
  columns: omsColumns,
  data,
  grouping: groupingInput,
  enableColumnResizing = true,
  manualFiltering = false,
  localStateOnly = false,
  initialSort,
  noDataElement,
  isMobile,
  enableRowSelection = true,
  enableMultiRowSelection,
  enableBottomToolbar = false,
  enableTopToolbar = true,
  enableSorting = true,
  enableVirtualization = false,
  enablePagination: _enablePagination = false,
  renderBottomToolbar,
  renderBottomToolbarCustomActions,
  bottomToolbarContent,
  manualPagination,
  manualSorting,
  autoResetPageIndex,
  rowCount,
  onPaginationChange,
  onRowSelectionChange,
  filterFromLeafRows = true,
  getRowId,
}: BaseTableConfig<T>) => {
  const isCentralServer = useIsCentralServerApi();
  const { userHasPermission } = useAuthContext();
  const canEditGlobalDefaults =
    isCentralServer && userHasPermission(UserPermission.EditCentralData);
  const { saveGlobalTableConfig } = useSaveGlobalTableConfig();
  const globalDefaults = useGlobalTableDefaults(tableId);
  const resetDefaults = canEditGlobalDefaults ? undefined : globalDefaults;

  const { columns } = useMaterialTableColumns(omsColumns);

  const { columnFilters, onColumnFiltersChange } = useTableFiltering(
    columns,
    localStateOnly
  );
  const { sorting, onSortingChange } = useUrlSortManagement(
    initialSort,
    localStateOnly
  );

  const density = useColumnDensity(tableId);
  const columnSizing = useColumnSizing(tableId);
  const columnVisibility = useColumnVisibility(tableId, columns, isMobile);
  const columnPinning = useColumnPinning(tableId, columns);
  const grouping = useColumnGrouping(tableId, groupingInput);

  // Notify parent of the initial grouping state (read from localStorage)
  // so it can enable the correct data query before the first toggle click.
  React.useEffect(() => {
    groupingInput?.onToggle?.(grouping.state.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columnOrder = useColumnOrder(
    tableId,
    columns,
    enableRowSelection as boolean | ((row: unknown) => boolean) | undefined,
    !!grouping.state.length
  );

  // Ref so resetTableState can call table methods after table is created
  const tableRef = useRef<Table<T>>(null!);

  const resetTableState = useCallback(() => {
    const t = tableRef.current;
    if (!t) return;

    clearSavedState(tableId);
    t.resetColumnPinning();
    t.resetGrouping();

    if (resetDefaults?.columnSizing) t.setColumnSizing(resetDefaults.columnSizing);
    else t.resetColumnSizing();

    if (resetDefaults?.columnOrder) t.setColumnOrder(resetDefaults.columnOrder);
    else t.resetColumnOrder();

    t.resetGrouping();

    t.setColumnVisibility(
      resetDefaults?.columnVisibility ?? columnVisibility.initial
    );

    density.update(density.initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, resetDefaults, columnVisibility.initial, density.initial]);

  const onSaveAsGlobalDefault = canEditGlobalDefaults
    ? () => saveGlobalTableConfig(tableId, getSavedState(tableId) ?? {})
    : undefined;

  const hasRowSelection = !!enableRowSelection;
  const hasGrouping = !!groupingInput;

  // ── Built-in columns — memoized with empty deps since header/cell fns
  //    receive fresh table/row from @tanstack at call time, no closures ───────
  const selectColumn = useMemo<TanstackColumnDef<T>>(
    () => ({
      id: 'mrt-row-select',
      size: 50,
      enableResizing: false,
      enablePinning: false,
      enableSorting: false,
      header: ({ table: t }) => (
        <Checkbox
          color="outline"
          size="small"
          icon={<CheckboxEmptyIcon />}
          checkedIcon={<CheckboxCheckedIcon />}
          indeterminateIcon={<CheckboxIndeterminateIcon />}
          checked={t.getIsAllRowsSelected()}
          indeterminate={t.getIsSomeRowsSelected()}
          onChange={t.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          color="outline"
          size="small"
          icon={<CheckboxEmptyIcon />}
          checkedIcon={<CheckboxCheckedIcon />}
          indeterminateIcon={<CheckboxIndeterminateIcon />}
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          indeterminate={row.getIsSomeSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    }),
    [] // icons are module-level constants; header/cell receive fresh params
  );

  const expandColumn = useMemo<TanstackColumnDef<T>>(
    () => ({
      id: 'mrt-row-expand',
      size: 50,
      enableResizing: false,
      enablePinning: false,
      enableSorting: false,
      header: ({ table: t }) => (
        <Checkbox
          size="small"
          icon={<ChevronRightIcon fontSize="small" />}
          checkedIcon={<ExpandMoreIcon fontSize="small" />}
          checked={t.getIsAllRowsExpanded()}
          indeterminate={!t.getIsAllRowsExpanded() && t.getIsSomeRowsExpanded()}
          onChange={() => t.toggleAllRowsExpanded()}
          sx={{ '& .MuiSvgIcon-root': { fontSize: '1.1rem' } }}
        />
      ),
      cell: ({ row }) =>
        row.getCanExpand() ? (
          <Checkbox
            size="small"
            icon={<ChevronRightIcon fontSize="small" />}
            checkedIcon={<ExpandMoreIcon fontSize="small" />}
            checked={row.getIsExpanded()}
            onChange={() => row.toggleExpanded()}
            sx={{ '& .MuiSvgIcon-root': { fontSize: '1.1rem' } }}
          />
        ) : null,
    }),
    []
  );

  const allColumns = useMemo<TanstackColumnDef<T>[]>(
    () => [
      ...(hasRowSelection ? [selectColumn] : []),
      ...(hasGrouping ? [expandColumn] : []),
      ...(columns as TanstackColumnDef<T>[]),
    ],
    [hasRowSelection, hasGrouping, columns, selectColumn, expandColumn]
  );

  // Custom expanded row model — stable reference, reads live table at call time
  const expandedRowModel = useCallback(
    (tanTable: Table<T>) =>
      () => {
        const rowModel = tanTable.getPreExpandedRowModel();
        const rows: Row<T>[] = [];
        const handleRow = (r: Row<T>) => {
          rows.push(r);
          if (r.subRows?.length > 1 && r.getIsExpanded()) {
            r.subRows.forEach(handleRow);
          }
        };
        rowModel.rows.forEach(handleRow);

        const flatRows: Row<T>[] = [];
        const seenRowIds = new Set<string>();
        rowModel.flatRows.forEach(r => {
          if (!seenRowIds.has(r.id)) {
            flatRows.push(r);
            seenRowIds.add(r.id);
          }
        });

        return { rows, flatRows, rowsById: rowModel.rowsById };
      },
    []
  );

  // ── meta object — recreated only when display-relevant values change ───────
  const meta = useMemo<OmsTableMeta<T>>(
    () => ({
      density: density.state,
      setDensity: density.update,
      onRowClick,
      getIsPlaceholderRow,
      getIsRestrictedRow,
      isLoading,
      isError,
      noDataElement,
      showTopToolbar: enableTopToolbar,
      showBottomToolbar: enableBottomToolbar,
      isGrouped: !!grouping.state.length,
      toggleGrouped: grouping.enabled ? grouping.toggle : undefined,
      groupByLabel: groupingInput?.label,
      isMobile,
      enableVirtualization,
      enableColumnResizing,
      enableRowSelection: hasRowSelection,
      renderBottomToolbar,
      renderBottomToolbarCustomActions,
      bottomToolbarContent,
      tableId,
      densityHook: density,
      columnSizingHook: columnSizing,
      columnVisibilityHook: columnVisibility,
      columnPinningHook: columnPinning,
      columnOrderHook: columnOrder,
      resetTableState,
      onSaveAsGlobalDefault,
      globalDefaults: resetDefaults,
    }),
    // Only re-create meta when actual display state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      density.state,
      density.update,
      onRowClick,
      getIsPlaceholderRow,
      getIsRestrictedRow,
      isLoading,
      isError,
      noDataElement,
      enableTopToolbar,
      enableBottomToolbar,
      grouping.state,
      grouping.enabled,
      grouping.toggle,
      groupingInput?.label,
      isMobile,
      enableVirtualization,
      enableColumnResizing,
      hasRowSelection,
      renderBottomToolbar,
      renderBottomToolbarCustomActions,
      bottomToolbarContent,
      tableId,
      density,
      columnSizing,
      columnVisibility,
      columnPinning,
      columnOrder,
      resetTableState,
      onSaveAsGlobalDefault,
      resetDefaults,
    ]
  );

  // Stable empty array avoids passing a new [] reference every render when data is undefined
  const emptyData = useMemo<T[]>(() => [], []);
  const tableData = data ?? emptyData;

  const table = useReactTable<T>({
    columns: allColumns,
    data: tableData,

    getCoreRowModel: _getCoreRowModel,
    getSortedRowModel: _getSortedRowModel,
    getFilteredRowModel: _getFilteredRowModel,
    getGroupedRowModel: _getGroupedRowModel,
    getFacetedRowModel: _getFacetedRowModel as (table: Table<T>, columnId: string) => () => RowModel<T>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFacetedUniqueValues: _getFacetedUniqueValues as (table: Table<T>, columnId: string) => () => Map<any, number>,

    getRowCanExpand: row => row.getLeafRows().length > 1,
    getExpandedRowModel: expandedRowModel,

    enableColumnResizing,
    columnResizeMode: 'onChange',
    enableColumnPinning: true,
    enableSorting,
    enableRowSelection: !!enableRowSelection,
    enableMultiRowSelection,
    groupedColumnMode: false,
    filterFromLeafRows,
    manualFiltering,
    manualSorting: manualSorting ?? true,
    manualPagination,
    autoResetPageIndex,
    rowCount,
    getRowId,

    initialState: {
      columnSizing: columnSizing.initial,
      columnVisibility: columnVisibility.initial,
      columnPinning: columnPinning.initial,
      columnOrder: columnOrder.initial,
      grouping: grouping.initial,
    },
    state: {
      columnFilters,
      sorting,
      columnSizing: columnSizing.state,
      columnVisibility: columnVisibility.state,
      columnPinning: columnPinning.state,
      columnOrder: columnOrder.state,
      grouping: grouping.state,
      ...state,
    },

    onColumnFiltersChange,
    onSortingChange,
    onColumnSizingChange: columnSizing.update as OnChangeFn<Record<string, number>>,
    onColumnVisibilityChange: columnVisibility.update as OnChangeFn<Record<string, boolean>>,
    onColumnPinningChange: columnPinning.update as OnChangeFn<{ left?: string[]; right?: string[] }>,
    onColumnOrderChange: columnOrder.update as OnChangeFn<string[]>,
    onGroupingChange: grouping.update as OnChangeFn<string[]>,
    onPaginationChange,
    onRowSelectionChange,

    meta,
  });

  tableRef.current = table;

  return table;
};
