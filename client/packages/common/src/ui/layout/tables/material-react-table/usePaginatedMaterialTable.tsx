import React from 'react';
import {
  Box,
  Typography,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import {
  MRT_RowData,
  MRT_RowSelectionState,
  MRT_SortingState,
  MRT_Updater,
  MRT_PaginationState,
} from 'material-react-table';
import { useCallback, useMemo, useRef, useState } from 'react';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';

interface PaginatedTableConfig<T extends MRT_RowData>
  extends BaseTableConfig<T> {
  totalCount: number;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
}

export const usePaginatedMaterialTable = <T extends MRT_RowData>({
  isLoading,
  onRowClick,
  totalCount,
  initialSort,
  ...tableOptions
}: PaginatedTableConfig<T>) => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort,
  });
  const t = useTranslation();
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const paginationRef = useRef<number>(0);

  const pagination = { page, first, offset };

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
        updatePaginationQuery(
          newPaginationValue.pageIndex,
          newPaginationValue.pageSize
        );
      }
    },
    [updatePaginationQuery]
  );

  const table = useBaseMaterialTable<T>({
    isLoading,
    onRowClick,

    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    enableBottomToolbar: Object.keys(rowSelection).length === 0, // required for pagination
    enablePagination: true,
    paginationDisplayMode: 'pages',
    muiBottomToolbarProps: {
      sx: {
        '& .MuiInputLabel-root': {
          fontSize: '0.9em',
        },
        // Makes the content vertically centered (when custom component added)
        '& > .MuiBox-root': {
          padding: 0,
        },
      },
    },
    muiPaginationProps: {
      rowsPerPageOptions: [10, 20, 50, 100], // TO-DO: Make this customisable?
      SelectProps: {
        sx: {
          minWidth: '40px',
          fontSize: '0.9em',
        },
      },
    },
    // Summary display in toolbar, e.g. "Showing 1-20 of 45"
    renderBottomToolbarCustomActions: () => {
      const xToY = `${offset + 1}-${Math.min(first + offset, totalCount)}`;
      return (
        <Box
          display="flex"
          flexDirection="row"
          flexWrap="wrap"
          flex={1}
          paddingLeft={2}
        >
          <Typography sx={{ marginRight: '4px' }}>
            {t('label.showing')}
          </Typography>
          <Typography sx={{ fontWeight: 'bold', marginRight: '4px' }}>
            {xToY}
          </Typography>
          <Typography sx={{ marginRight: '4px' }}>{t('label.of')}</Typography>
          <Typography sx={{ fontWeight: 'bold', marginRight: '4px' }}>
            {totalCount}
          </Typography>
        </Box>
      );
    },

    onSortingChange: handleSortingChange,
    autoResetPageIndex: false,
    onPaginationChange: handlePaginationChange,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    rowCount: totalCount,
    state: {
      sorting: [{ id: sortBy.key, desc: !!sortBy.isDesc }],
      pagination: { pageIndex: pagination.page, pageSize: pagination.first },
      showProgressBars: isLoading,
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
