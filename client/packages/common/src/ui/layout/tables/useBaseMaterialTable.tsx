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
  useSaveGlobalTableConfig,
  useGlobalTableDefaults,
  useColumnGrouping,
} from './tableState';
import { clearSavedState, getSavedState } from './tableState/utils';
import { DataError, NothingHere } from '@common/components';
import {
  useIsCentralServerApi,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';

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
    label?: string;
    /** Fires when the user toggles grouping on/off. */
    onToggle?: (isGrouped: boolean) => void;
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
  const isCentralServer = useIsCentralServerApi();
  const { userHasPermission } = useAuthContext();
  const canEditGlobalDefaults =
    isCentralServer && userHasPermission(UserPermission.EditCentralData);
  const { saveGlobalTableConfig } = useSaveGlobalTableConfig();
  const globalDefaults = useGlobalTableDefaults(tableId);
  // Admins reset to hard-coded defaults so they can undo their global config;
  // non-admins reset to global defaults.
  const resetDefaults = canEditGlobalDefaults ? undefined : globalDefaults;

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
    enableRowSelection,
    !!grouping.state.length
  );

  const resetTableState = () => {
    clearSavedState(tableId);

    // We have to call each of these reset/set fns, as MRT's general
    // reset function doesn't fire the onChange handlers (needed to trigger our
    // state handlers).
    // Seeing as local storage has already been cleared,
    // these shouldn't trigger additional local storage updates
    table.resetColumnPinning();
    table.resetColumnSizing();
    table.resetGrouping();

    if (resetDefaults?.columnSizing)
      table.setColumnSizing(resetDefaults.columnSizing);
    else table.resetColumnSizing();

    if (resetDefaults?.columnOrder)
      table.setColumnOrder(resetDefaults.columnOrder);
    else table.resetColumnOrder();

    table.resetGrouping();

    // Visibility `initial` could change if prefs have come on/screen size
    // changed so reset to latest initial value rather than default initial
    // mount state
    table.setColumnVisibility(
      resetDefaults?.columnVisibility ?? columnVisibility.initial
    );

    // Density doesn't have a `reset` function
    table.setDensity(density.initial);
  };

  // hiding all table filter related options for now
  const hasColumnFilters = false;

  const onSaveAsGlobalDefault = canEditGlobalDefaults
    ? () => saveGlobalTableConfig(tableId, getSavedState(tableId) ?? {})
    : undefined;

  const displayOptions = useTableDisplayOptions({
    tableId,
    density,
    columnSizing,
    columnVisibility,
    columnPinning,
    columnOrder,
    resetTableState,
    hasColumnFilters,
    onRowClick,
    isGrouped: !!grouping.state.length,
    toggleGrouped: grouping.enabled
      ? () => {
          grouping.toggle();
          groupingInput?.onToggle?.(!grouping.state.length);
        }
      : undefined,
    groupByLabel: groupingInput?.label,
    getIsPlaceholderRow,
    getIsRestrictedRow,
    muiTableBodyRowProps,
    isMobile,
    onSaveAsGlobalDefault,
    globalDefaults: resetDefaults,
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

      // Rows should contain all visible rows, including group rows and their children (if expanded)
      const rows: Row<T>[] = [];

      const handleRow = (row: Row<T>) => {
        rows.push(row);

        if (row.subRows?.length > 1 && row.getIsExpanded()) {
          row.subRows.forEach(handleRow);
        }
      };

      rowModel.rows.forEach(handleRow);

      // We can't pass rowModel.flatRows directly as for some reason rows come in duplicated when there's grouping and no sorting applied
      // I think this is a bug in tanstack table
      const flatRows: Row<T>[] = [];

      const seenRowIds = new Set<string>();
      rowModel.flatRows.forEach(row => {
        if (!seenRowIds.has(row.id)) {
          flatRows.push(row);
          seenRowIds.add(row.id);
        }
      });

      return {
        rows,
        flatRows,
        rowsById: rowModel.rowsById,
      };
    },

    // Disable selection Toolbar, we use our own custom footer for this
    positionToolbarAlertBanner: 'none',

    manualFiltering,

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
    onColumnFiltersChange,
    onSortingChange,
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
