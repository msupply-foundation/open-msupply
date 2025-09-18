import { useMemo } from 'react';
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
import { useColumnDensity } from './tableState/useColumnDensity';
import { useColumnOrder } from './tableState/useColumnOrder';
import { useColumnSizing } from './tableState/useColumnSizing';
import { useColumnVisibility } from './tableState/useColumnVisibility';
import { useColumnPinning } from './tableState/useColumnPinning';

export interface BaseTableConfig<T extends MRT_RowData>
  extends MRT_TableOptions<T> {
  tableId: string; // key for local storage
  onRowClick?: (row: T) => void;
  isLoading: boolean;
  getIsPlaceholderRow?: (row: T) => boolean;
  /** Whether row should be greyed out - still potentially clickable */
  getIsRestrictedRow?: (row: T) => boolean;
  groupByField?: string;
  columns: ColumnDef<T>[];
  initialSort?: { key: string; dir: 'asc' | 'desc' };
}

export const useBaseMaterialTable = <T extends MRT_RowData>({
  tableId,
  state,
  isLoading,
  onRowClick,
  getIsPlaceholderRow,
  getIsRestrictedRow,
  columns: omsColumns,
  data,
  groupByField,
  enableRowSelection = true,
  enableColumnResizing = true,
  manualFiltering = false,
  initialSort,
  ...tableOptions
}: BaseTableConfig<T>) => {
  const t = useTranslation();
  const { getTableLocalisations } = useIntlUtils();
  const localization = getTableLocalisations();

  const { columns } = useMaterialTableColumns(omsColumns);

  // Filter needs to be applied after columns are processed
  const { columnFilters, onColumnFiltersChange } = useTableFiltering(columns);
  const { sorting, onSortingChange } = useUrlSortManagement(initialSort);

  const processedData = useMemo(
    () => getGroupedRows(data, groupByField, t),
    [data, groupByField]
  );

  const density = useColumnDensity(tableId);
  const columnSizing = useColumnSizing(tableId);
  const columnVisibility = useColumnVisibility(tableId, columns);
  const columnPinning = useColumnPinning(tableId, columns);
  const columnOrder = useColumnOrder(
    tableId,
    columns,
    enableRowSelection,
    enableColumnResizing,
    groupByField
  );

  const resetTableState = () => {
    table.setColumnVisibility(columnVisibility.initial);
    table.setDensity(density.initial);

    table.resetColumnOrder();
    table.resetColumnPinning();
    table.resetColumnSizing();
    table.resetSorting();
    table.resetColumnFilters();
  };

  const displayOptions = useTableDisplayOptions(
    resetTableState,
    onRowClick,
    getIsPlaceholderRow,
    getIsRestrictedRow
  );

  const table = useMaterialReactTable<T>({
    columns,

    localization,

    data: processedData,
    enablePagination: false,
    enableColumnResizing,
    enableColumnPinning: true,
    enableColumnOrdering: true,
    enableColumnDragging: false,
    enableRowSelection,
    enableFacetedValues: true,

    // Disable bottom footer - use OMS custom action footer instead
    enableBottomToolbar: false,
    enableExpanding: !!groupByField,

    manualFiltering,
    onColumnFiltersChange,
    onSortingChange,

    initialState: {
      density: density.initial,
      columnSizing: columnSizing.initial,
      columnVisibility: columnVisibility.initial,
      columnPinning: columnPinning.initial,
      columnOrder: columnOrder.initial,
    },
    state: {
      showProgressBars: isLoading,
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

    ...displayOptions,
    ...tableOptions,
  });

  return table;
};
