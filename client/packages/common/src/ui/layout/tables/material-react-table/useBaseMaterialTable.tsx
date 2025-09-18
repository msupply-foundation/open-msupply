import { useMemo, useRef, useState } from 'react';
import {
  getDefaultColumnOrderIds,
  MRT_RowData,
  MRT_StatefulTableOptions,
  MRT_TableOptions,
  useMaterialReactTable,
} from 'material-react-table';
import {
  getSavedTableState,
  useTableLocalStorage,
} from './useTableLocalStorage';
import { useIntlUtils, useTranslation } from '@common/intl';
import { ColumnDef } from './types';
import { useMaterialTableColumns } from './useMaterialTableColumns';
import { getGroupedRows } from './utils';
import { useTableFiltering } from './useTableFiltering';
import { getTableDisplayOptions } from './getTableDisplayOptions';
import { useUrlSortManagement } from './useUrlSortManagement';

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

  const { columns, defaultHiddenColumns, defaultColumnPinning } =
    useMaterialTableColumns(omsColumns);

  // Filter needs to be applied after columns are processed
  const { columnFilters, onColumnFiltersChange } = useTableFiltering(columns);
  const { sorting, onSortingChange } = useUrlSortManagement(initialSort);

  const initialState = useRef(
    getSavedTableState<T>(tableId, defaultHiddenColumns, defaultColumnPinning)
  );
  const [columnOrder, setColumnOrder] = useState(
    initialState.current.columnOrder ?? []
  );

  const processedData = useMemo(
    () => getGroupedRows(data, groupByField, t),
    [data, groupByField]
  );

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

    // Disable bottom footer - use OMS custom action footer instead
    enableBottomToolbar: false,
    enableExpanding: !!groupByField,

    manualFiltering,
    onColumnFiltersChange,
    onSortingChange,

    initialState: {
      ...initialState.current,

      columnOrder: getDefaultColumnOrderIds({
        columns,
        state: {},
        enableRowSelection, // adds `mrt-row-select`
        enableExpanding: !!groupByField, // adds `mrt-row-expand`
        positionExpandColumn: 'first', // this is the default, required to be explicit here
      } as MRT_StatefulTableOptions<T>),
    },
    state: {
      showProgressBars: isLoading,
      columnOrder,
      columnFilters,
      sorting,
      ...state,
    },
    onColumnOrderChange: setColumnOrder,

    ...getTableDisplayOptions(
      onRowClick,
      getIsPlaceholderRow,
      getIsRestrictedRow
    ),

    ...tableOptions,
  });

  useTableLocalStorage(tableId, table);

  return table;
};
