import { useUrlQuery, useUrlQueryParams } from '@openmsupply-client/common';
import {
  MRT_RowData,
  MRT_TableOptions,
  useMaterialReactTable,
  MRT_RowSelectionState,
} from 'material-react-table';
import { useState } from 'react';

interface PaginatedTableConfig<T extends MRT_RowData>
  extends MRT_TableOptions<T> {
  onRowClick?: (row: T) => void;
  isLoading: boolean;
  totalCount: number;
}

export const usePaginatedMaterialTable = <T extends MRT_RowData>({
  isLoading,
  onRowClick,
  totalCount,
  ...tableOptions
}: PaginatedTableConfig<T>) => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'invoiceNumber', dir: 'desc' },
    filters: [
      { key: 'otherPartyName' },
      { key: 'status', condition: 'equalTo' },
      { key: 'theirReference' },
      { key: 'createdDatetime', condition: 'between' },
      { key: 'shippedDatetime', condition: 'between' },
      { key: 'invoiceNumber', condition: 'equalTo', isNumber: true },
    ],
  });
  const { urlQuery, updateQuery } = useUrlQuery();
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});

  const pagination = { page, first, offset };

  const columnFilters = Object.entries(filter).map(([id, value]) => ({
    id,
    value,
  }));

  const table = useMaterialReactTable<T>({
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    onSortingChange: sortUpdate => {
      if (typeof sortUpdate === 'function') {
        const newSortValue = sortUpdate([
          { id: sortBy.key, desc: !!sortBy.isDesc },
        ])[0];
        // console.log('Sorting changed:', newSortValue);
        if (newSortValue)
          updateSortQuery(newSortValue.id, newSortValue.desc ? 'desc' : 'asc');
      }
    },
    onPaginationChange: pagination => {
      const current = { pageIndex: page, pageSize: first };
      if (typeof pagination === 'function') {
        // console.log('current', current);
        const newPaginationValue = pagination(current);
        // console.log('Pagination changed:', newPaginationValue);
        updatePaginationQuery(newPaginationValue.pageIndex);
      }
    },
    onColumnFiltersChange: columnFilters => {
      if (typeof columnFilters === 'function') {
        const newFilter = columnFilters([]);
        // console.log('Column filters changed:', newFilter);
        // @ts-expect-error -- temporary
        updateQuery({
          ...urlQuery,

          ...Object.fromEntries(newFilter.map(f => [f.id, f.value])),
        });
      }
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    rowCount: totalCount,
    state: {
      sorting: [{ id: sortBy.key, desc: !!sortBy.isDesc }],
      pagination: { pageIndex: pagination.page, pageSize: pagination.first },
      showProgressBars: isLoading,
      columnFilters,
      rowSelection,
    },
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
