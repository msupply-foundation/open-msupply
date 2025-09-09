import {
  isEqual,
  useMaterialTableColumns,
  useUrlQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import {
  MRT_RowData,
  MRT_RowSelectionState,
  MRT_SortingState,
  MRT_Updater,
  MRT_PaginationState,
  MRT_ColumnFiltersState,
} from 'material-react-table';
import { useCallback, useMemo, useRef, useState } from 'react';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';
import { ColumnDef } from './types';

type FilterType = 'none' | 'text' | 'number' | 'enum' | 'dateRange';

interface EnumOption {
  value: string;
  label: string;
}

export type PaginatedTableColumnDefinition<T extends MRT_RowData> =
  ColumnDef<T> & {
    filterType?: FilterType;
    filterValues?: EnumOption[];
  };

interface PaginatedTableConfig<T extends MRT_RowData>
  extends BaseTableConfig<T> {
  totalCount: number;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  columns: PaginatedTableColumnDefinition<T>[];
}

export const usePaginatedMaterialTable = <T extends MRT_RowData>({
  isLoading,
  onRowClick,
  totalCount,
  initialSort,
  columns,
  ...tableOptions
}: PaginatedTableConfig<T>) => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort,
  });
  const { updateQuery } = useUrlQuery();
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const paginationRef = useRef<number>(0);

  const pagination = { page, first, offset };

  const { mrtColumnDefinitions, filterUpdaters, getFilterState } =
    useMaterialTableColumns(columns);

  const handleSortingChange = useCallback(
    (sortUpdate: MRT_Updater<MRT_SortingState>) => {
      if (typeof sortUpdate === 'function') {
        // MRT can handle multiple sort fields, but for now we're only
        // supporting one, so we take the first item of the array
        const newSortValue = sortUpdate([
          { id: sortBy.key, desc: !!sortBy.isDesc },
        ])[0];
        if (newSortValue)
          updateSortQuery(newSortValue.id, newSortValue.desc ? 'desc' : 'asc');
        else {
          // For some reason, when just changing the sort direction on a field,
          // the sortUpdate method doesn't return anything -- is this a bug in
          // MRT?
          updateSortQuery(sortBy.key, !sortBy.isDesc ? 'desc' : 'asc');
        }
      }
    },
    [sortBy, updateSortQuery]
  );

  const filterState = getFilterState();

  const handlePaginationChange = useCallback(
    (paginationUpdate: MRT_Updater<MRT_PaginationState>) => {
      if (typeof paginationUpdate === 'function') {
        const lastUpdate = paginationRef.current;
        const current = { pageIndex: page, pageSize: first };
        const newPaginationValue = paginationUpdate(current);
        paginationRef.current = Date.now();
        // There is a bug where this function is called twice in quick
        // succession the first time it's triggered. This is a hacky workaround
        // for now, but we should investigate further at some point, or report
        // the bug to MRT devs
        if (paginationRef.current - lastUpdate < 300) return;
        updatePaginationQuery(newPaginationValue.pageIndex);
      }
    },
    [updatePaginationQuery]
  );

  const handleFilterChange = (
    filterUpdate: MRT_Updater<MRT_ColumnFiltersState>
  ) => {
    // The "filterUpdate" function mutates the "old" state in place, which
    // messes up the comparisons, so we generate a fresh version just for this:
    const old = getFilterState();
    if (typeof filterUpdate === 'function') {
      const newFilterState = filterUpdate(old);
      const changedFilter = newFilterState.find(
        fil =>
          !isEqual(fil.value, filterState.find(f => f.id === fil.id)?.value)
      );
      if (!changedFilter) {
        const removedFilter = filterState.find(
          f => !newFilterState.find(nf => nf.id === f.id)
        );
        if (removedFilter) updateQuery({ [removedFilter.id]: undefined });
        return;
      }
      const filterUpdater = filterUpdaters[changedFilter.id];
      const newValue = changedFilter.value;
      if (filterUpdater) filterUpdater(newValue);
    }
  };

  const table = useBaseMaterialTable<T>({
    isLoading,
    onRowClick,

    columns: mrtColumnDefinitions,
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    onSortingChange: handleSortingChange,
    autoResetPageIndex: false,
    onPaginationChange: handlePaginationChange,
    onColumnFiltersChange: handleFilterChange,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    rowCount: totalCount,
    state: {
      sorting: [{ id: sortBy.key, desc: !!sortBy.isDesc }],
      pagination: { pageIndex: pagination.page, pageSize: pagination.first },
      showProgressBars: isLoading,
      columnFilters: filterState,
      rowSelection,
    },
    ...tableOptions,
  });

  const selectedRows = useMemo(
    () => table.getSelectedRowModel().rows.map(r => r.original),
    [rowSelection]
  );

  const resetRowSelection = () => {
    table.resetRowSelection();
  };

  return { table, selectedRows, resetRowSelection };
};
