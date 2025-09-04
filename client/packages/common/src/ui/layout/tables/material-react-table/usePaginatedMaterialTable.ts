import {
  isEqual,
  useMaterialTableColumns,
  useUrlQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import {
  MRT_RowData,
  MRT_TableOptions,
  useMaterialReactTable,
  MRT_RowSelectionState,
  MRT_SortingState,
  MRT_Updater,
  MRT_PaginationState,
  MRT_ColumnDef,
  MRT_ColumnFiltersState,
} from 'material-react-table';
import { useCallback, useRef, useState } from 'react';

type FilterType = 'none' | 'text' | 'number' | 'enum' | 'dateRange';

interface EnumOption {
  value: string;
  label: string;
}

export type PaginatedTableColumnDefinition<T extends MRT_RowData> =
  MRT_ColumnDef<T> & {
    filterType?: FilterType;
    filterValues?: EnumOption[];
  };

interface PaginatedTableConfig<T extends MRT_RowData>
  extends MRT_TableOptions<T> {
  onRowClick?: (row: T) => void;
  isLoading: boolean;
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
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort,
  });
  const { urlQuery, updateQuery } = useUrlQuery();
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const paginationRef = useRef<number>(0);

  const pagination = { page, first, offset };

  const { mrtColumnDefinitions, filterUpdaters, getFilterState } =
    useMaterialTableColumns(columns);

  console.log('mrtColumnDefinitions', mrtColumnDefinitions);

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

  console.log('urlQuery', urlQuery);

  const filterState = getFilterState();

  console.log('filterState', filterState);

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

  const handleFilterChange = useCallback(
    (filterUpdate: MRT_Updater<MRT_ColumnFiltersState>) => {
      if (typeof filterUpdate === 'function') {
        const newFilterState = filterUpdate(filterState);
        console.log('newFilter', newFilterState);
        const changedFilter = newFilterState.find(
          fil =>
            !isEqual(fil.value, filterState.find(f => f.id === fil.id)?.value)
        );
        console.log('changedFilter', changedFilter);
        if (!changedFilter) {
          const removedFilter = filterState.find(
            f => !newFilterState.find(nf => nf.id === f.id)
          );
          console.log('removedFilter', removedFilter);
          if (removedFilter) updateQuery({ [removedFilter.id]: undefined });
          return;
        }
        const filterUpdater = filterUpdaters[changedFilter.id];
        const newValue = changedFilter.value;
        // console.log('Column filters changed:', newFilter);
        if (filterUpdater) filterUpdater(newValue);
      }
    },
    [updateQuery, urlQuery]
  );

  const table = useMaterialReactTable<T>({
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
    // columnFilterDisplayMode: 'popover',
    // TO-DO: Once the props are more established, extract common props between
    // two table types to common object or function
    muiTableBodyRowProps: ({ row, staticRowIndex }) => ({
      onClick: () => {
        if (onRowClick) onRowClick(row.original);
      },
      sx: {
        backgroundColor: staticRowIndex % 2 === 0 ? 'transparent' : '#fafafb', // light grey on odd rows
        '& td': {
          borderBottom: '1px solid rgba(224, 224, 224, 1)', // add bottom border to each cell
        },
      },
    }),
    // muiTableProps: {
    //   sx: {
    //     // tableLayout: 'fixed', // ensures columns share extra space
    //   },
    // },
    muiTableHeadCellProps: {
      sx: {
        fontSize: '14px',
        lineHeight: 1.2,
        verticalAlign: 'bottom',
        // border: '1px solid red',
        '& .MuiBox-root': {
          whiteSpace: 'normal',
          overflow: 'visible',
          textOverflow: 'unset',
          wordBreak: 'break-word',
          alignItems: 'flex-end',
        },
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: '14px',
        borderBottom: '1px solid rgba(224, 224, 224, 1)',
      },
    },
    ...tableOptions,
  });
  return table;
};
