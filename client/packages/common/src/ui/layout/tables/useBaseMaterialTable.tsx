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
  useSaveGlobalTableConfig,
  useGlobalTableDefaults,
} from './tableState';
import { clearSavedState, ManagedTableState } from './tableState/utils';
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
  grouping,
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
  const columnVisibility = useColumnVisibility(tableId, columns, isMobile);
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

  const resetTableState = () => {
    clearSavedState(tableId);

    // We have to call each of these reset/set fns, as MRT's general
    // reset function doesn't fire the onChange handlers (needed to trigger our
    // state handlers).
    // Seeing as local storage has already been cleared,
    // these shouldn't trigger additional local storage updates.
    // If global defaults exist (and user is not admin), apply them instead of
    // resetting to hard-coded defaults.
    if (resetDefaults?.columnPinning)
      table.setColumnPinning(resetDefaults.columnPinning);
    else table.resetColumnPinning();

    if (resetDefaults?.columnSizing)
      table.setColumnSizing(resetDefaults.columnSizing);
    else table.resetColumnSizing();

    if (resetDefaults?.columnOrder)
      table.setColumnOrder(resetDefaults.columnOrder);
    // else: column order state resets directly from clearing local storage

    resetGrouped();

    // Visibility `initial` could change if prefs have come on/screen size
    // changed so reset to latest initial value rather than default initial
    // mount state
    table.setColumnVisibility(
      resetDefaults?.columnVisibility ?? columnVisibility.initial
    );

    table.setDensity(resetDefaults?.density ?? density.initial);

    // Reset the flags for each state slice too
    density.resetHasSavedState();
    columnSizing.resetHasSavedState();
    columnPinning.resetHasSavedState();
    columnVisibility.resetHasSavedState();
    columnOrder.resetHasSavedState();
  };

  // hiding all table filter related options for now
  const hasColumnFilters = false;

  const onSaveAsGlobalDefault = canEditGlobalDefaults
    ? () => {
        const currentState: ManagedTableState = {
          density: density.state,
          columnVisibility: columnVisibility.state,
          columnPinning: columnPinning.state,
          columnOrder: columnOrder.state,
          columnSizing: columnSizing.state,
          isGrouped,
        };
        saveGlobalTableConfig(tableId, currentState);
      }
    : undefined;

  const displayOptions = useTableDisplayOptions({
    density,
    columnSizing,
    columnVisibility,
    columnPinning,
    columnOrder,
    resetTableState,
    hasColumnFilters,
    onRowClick,
    isGrouped,
    toggleGrouped: grouping?.enabled ? toggleGrouped : undefined,
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

    data: processedData,
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
        <DataError error={t('error.unable-to-load-data')} />
      ) : (
        (noDataElement ?? <NothingHere />)
      ),

    ...displayOptions,
    ...tableOptions,
  });

  return table;
};
