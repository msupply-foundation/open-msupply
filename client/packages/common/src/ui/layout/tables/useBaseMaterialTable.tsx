import React from 'react';
import {
  MRT_Row,
  MRT_RowData,
  MRT_TableOptions,
  useMaterialReactTable,
} from 'material-react-table';
import { Row } from '@tanstack/table-core';
import { useIntlUtils, useTranslation } from '@common/intl';
import { ColumnDef } from './types';
import { useMaterialTableColumns } from './useMaterialTableColumns';
import { useTableFiltering } from './useTableFiltering';
import { useTableDisplayOptions } from './useTableDisplayOptions';
import { useUrlSortManagement } from './useUrlSortManagement';
import {
  useColumnDensity,
  useColumnOrder,
  useColumnSizing,
  useColumnVisibility,
  useColumnPinning,
  useColumnGrouping,
} from './tableState';
import { clearSavedState } from './tableState/utils';
import { DataError, NothingHere } from '@common/components';

export interface BaseTableConfig<T extends MRT_RowData> extends Omit<
  MRT_TableOptions<T>,
  'data'
> {
  tableId: string; // key for local storage
  data: T[] | undefined;
  onRowClick?: (row: T, isCtrlClick: boolean) => void;
  isLoading?: boolean;
  isError?: boolean;
  getIsPlaceholderRow?: (row: MRT_Row<T>) => boolean;
  /** Whether row should be greyed out - still potentially clickable */
  getIsRestrictedRow?: (row: MRT_Row<T>) => boolean;
  grouping?: {
    field: string;
    groupedByDefault?: boolean;
  };
  columns: ColumnDef<T>[];
  noUrlFiltering?: boolean;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  noDataElement?: React.ReactNode;
  isMobile?: boolean;
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
  noUrlFiltering = false,
  initialSort,
  noDataElement,
  muiTableBodyRowProps,
  isMobile,
  enableRowSelection = true,
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

  const density = useColumnDensity(tableId);
  const columnSizing = useColumnSizing(tableId);
  const columnVisibility = useColumnVisibility(tableId, columns, isMobile);
  const columnPinning = useColumnPinning(
    tableId,
    columns,
    !!enableRowSelection
  );
  const grouping = useColumnGrouping(tableId, groupingInput);
  const columnOrder = useColumnOrder(
    tableId,
    columns,
    enableRowSelection,
    !!grouping.state.length
  );

  const resetTableState = () => {
    clearSavedState(tableId);

    // We have to call each of these reset fns, as MRT's general
    // reset function doesn't fire the onChange handlers (needed to trigger our
    // state handlers).
    // Seeing as local storage has already been cleared,
    // these shouldn't trigger additional local storage updates
    table.resetColumnPinning();
    table.resetColumnSizing();
    table.resetGrouping();

    // column order doesn't need resetting - state reset directly from clearing
    // local storage

    // Visibility `initial` could change if prefs have come on/screen size
    // changed so reset to latest initial value rather than default initial
    // mount state
    table.setColumnVisibility(columnVisibility.initial);

    // Density doesn't have a `reset` function
    table.setDensity(density.initial);
  };

  // hiding all table filter related options for now
  const hasColumnFilters = false;

  const displayOptions = useTableDisplayOptions({
    density,
    columnSizing,
    columnVisibility,
    columnPinning,
    columnOrder,
    resetTableState,
    hasColumnFilters,
    onRowClick,
    isGrouped: !!grouping.state.length,
    toggleGrouped: grouping.enabled ? grouping.toggle : undefined,
    getIsPlaceholderRow,
    getIsRestrictedRow,
    muiTableBodyRowProps,
    isMobile,
  });

  const table = useMaterialReactTable<T>({
    columns,

    localization,

    data: data ?? [],
    enablePagination: false,

    layoutMode: 'grid',
    enableColumnResizing,

    enableColumnFilters: false, // hide all column filters in the column menu
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

    // Grouping options
    enableGrouping: true,
    groupedColumnMode: false,

    // These options are needed to stop groups with only 1 child being expandable - we only want groups to be expandable if they have multiple children
    getRowCanExpand: row => row.getLeafRows().length > 1,
    getExpandedRowModel: table => () => {
      const rowModel = table.getPreExpandedRowModel();

      const expandedRows: Row<T>[] = [];

      const handleRow = (row: Row<T>) => {
        expandedRows.push(row);

        if (row.subRows?.length > 1 && row.getIsExpanded()) {
          row.subRows.forEach(handleRow);
        }
      };

      rowModel.rows.forEach(handleRow);

      return {
        rows: expandedRows,
        flatRows: rowModel.flatRows,
        rowsById: rowModel.rowsById,
      };
    },

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
      grouping: grouping.initial,
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
      grouping: grouping.state,
      ...state,
    },
    onDensityChange: density.update,
    onColumnSizingChange: columnSizing.update,
    onColumnVisibilityChange: columnVisibility.update,
    onColumnPinningChange: columnPinning.update,
    onColumnOrderChange: columnOrder.update,
    onGroupingChange: grouping.update,

    renderEmptyRowsFallback: () =>
      isLoading ? (
        <></>
      ) : isError ? (
        <DataError error={t('error.unable-to-load-data')} />
      ) : (
        (noDataElement ?? <NothingHere />)
      ),

    ...displayOptions,
    ...tableOptions,
  });

  return table;
};
