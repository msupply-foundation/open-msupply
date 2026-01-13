import React, { useMemo } from 'react';
import {
  MRT_RowData,
  MRT_TableOptions,
  useMaterialReactTable,
} from 'material-react-table';
import { useIntlUtils, useTranslation } from '@common/intl';
import { ColumnDef } from './types';
import { useMaterialTableColumns } from './useMaterialTableColumns';
import { getGroupedRows } from './utils';
import { useTableFiltering } from './useTableFiltering';
import { useTableDisplayOptions } from './useTableDisplayOptions';
import { useUrlSortManagement } from './useUrlSortManagement';
import {
  useColumnDensity,
  useColumnOrder,
  useColumnSizing,
  useColumnVisibility,
  useColumnPinning,
  useIsGrouped,
} from './tableState';
import { clearSavedState } from './tableState/utils';
import { NothingHere } from '@common/components';

export interface BaseTableConfig<T extends MRT_RowData>
  extends Omit<MRT_TableOptions<T>, 'data'> {
  tableId: string; // key for local storage
  data: T[] | undefined;
  onRowClick?: (row: T, isCtrlClick: boolean) => void;
  isLoading?: boolean;
  isError?: boolean;
  getIsPlaceholderRow?: (row: T) => boolean;
  /** Whether row should be greyed out - still potentially clickable */
  getIsRestrictedRow?: (row: T) => boolean;
  grouping?: {
    /** Defaults to false */
    enabled: boolean;
    /** Defaults to 'itemName' */
    field?: string;
    /** Defaults to false */
    groupedByDefault?: boolean;
  };
  columns: ColumnDef<T>[];
  noUrlFiltering?: boolean;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  noDataElement?: React.ReactNode;
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
  grouping,
  enableRowSelection = true,
  enableColumnResizing = true,
  manualFiltering = false,
  noUrlFiltering = false,
  initialSort,
  noDataElement,
  muiTableBodyRowProps,
  ...tableOptions
}: BaseTableConfig<T>) => {
  const t = useTranslation();
  const { getTableLocalisations } = useIntlUtils();
  const localization = getTableLocalisations();

  const { columns } = useMaterialTableColumns(omsColumns);

  // Filter needs to be applied after columns are processed
  const { columnFilters, onColumnFiltersChange } = useTableFiltering(
    columns,
    noUrlFiltering
  );
  const { sorting, onSortingChange } = useUrlSortManagement(initialSort);

  const { isGrouped, toggleGrouped, resetGrouped } = useIsGrouped(
    tableId,
    grouping?.groupedByDefault
  );

  const processedData = useMemo(
    () =>
      getGroupedRows(isGrouped, data ?? [], grouping?.field ?? 'itemName', t),
    [data, isGrouped, t]
  );

  const density = useColumnDensity(tableId);
  const columnSizing = useColumnSizing(tableId);
  const columnVisibility = useColumnVisibility(tableId, columns);
  const columnPinning = useColumnPinning(
    tableId,
    columns,
    !!enableRowSelection
  );
  const columnOrder = useColumnOrder(
    tableId,
    columns,
    enableRowSelection,
    isGrouped
  );

  const hasSavedState =
    density.hasSavedState ||
    columnSizing.hasSavedState ||
    columnPinning.hasSavedState ||
    columnVisibility.hasSavedState ||
    columnOrder.hasSavedState;

  const resetTableState = () => {
    clearSavedState(tableId);

    // We have to call each of these reset fns, as MRT's general
    // reset function doesn't fire the onChange handlers (needed to trigger our
    // state handlers).
    // Seeing as local storage has already been cleared,
    // these shouldn't trigger additional local storage updates
    table.resetColumnPinning();
    table.resetColumnSizing();
    resetGrouped();

    // column order doesn't need resetting - state reset directly from clearing
    // local storage

    // Visibility `initial` could change if prefs have come on/screen size
    // changed so reset to latest initial value rather than default initial
    // mount state
    table.setColumnVisibility(columnVisibility.initial);

    // Density doesn't have a `reset` function
    table.setDensity(density.initial);

    // Reset the flags for each state slice too
    density.resetHasSavedState();
    columnSizing.resetHasSavedState();
    columnPinning.resetHasSavedState();
    columnVisibility.resetHasSavedState();
    columnOrder.resetHasSavedState();
  };

  const hasColumnFilters = columns.some(col => col.enableColumnFilter);

  const displayOptions = useTableDisplayOptions({
    isGrouped,
    hasColumnFilters,
    toggleGrouped: grouping?.enabled ? toggleGrouped : undefined,
    resetTableState,
    hasSavedState,
    onRowClick,
    getIsPlaceholderRow,
    getIsRestrictedRow,
    muiTableBodyRowProps,
  });

  const table = useMaterialReactTable<T>({
    columns,

    localization,

    data: processedData,
    enablePagination: false,

    layoutMode: 'grid',
    enableColumnResizing,

    enableColumnPinning: true,
    enableColumnOrdering: true,
    enableColumnDragging: false,
    enableRowSelection,
    enableFacetedValues: true,
    enableStickyHeader: true,
    enableStickyFooter: true,
    // We want tab navigation to follow our normal behaviour of moving to the
    // next INPUT, not move through every table cell. If we need specific Table
    // keyboard navigation in future, we can enable this in a more granular way
    // using our own custom shortcuts:
    // https://www.material-react-table.com/docs/guides/accessibility#custom-keyboard-shortcuts
    enableKeyboardShortcuts: false,

    // Disable bottom footer - use OMS custom action footer instead
    enableBottomToolbar: false,
    enableExpanding: isGrouped,

    // Disable selection Toolbar, we use our own custom footer for this
    positionToolbarAlertBanner: 'none',

    manualFiltering,
    onColumnFiltersChange,
    onSortingChange,

    filterFromLeafRows: true,

    initialState: {
      density: density.initial,
      columnSizing: columnSizing.initial,
      columnVisibility: columnVisibility.initial,
      columnPinning: columnPinning.initial,
      columnOrder: columnOrder.initial,
    },
    state: {
      showLoadingOverlay: isLoading,
      columnFilters,
      sorting,
      density: density.state,
      columnSizing: columnSizing.state,
      columnVisibility: columnVisibility.state,
      columnPinning: columnPinning.state,
      columnOrder: columnOrder.state,
      ...state,
    },
    onDensityChange: density.update,
    onColumnSizingChange: columnSizing.update,
    onColumnVisibilityChange: columnVisibility.update,
    onColumnPinningChange: columnPinning.update,
    onColumnOrderChange: columnOrder.update,

    renderEmptyRowsFallback: () =>
      isLoading ? (
        <></>
      ) : isError ? (
        <ErrorState />
      ) : (
        (noDataElement ?? <NothingHere />)
      ),

    ...displayOptions,
    ...tableOptions,
  });

  return table;
};

const ErrorState = () => {
  const t = useTranslation();
  return <NothingHere body={t('error.unable-to-load-data')} isError />;
};
