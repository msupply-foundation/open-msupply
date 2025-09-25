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
  MRT_Updater,
  MRT_PaginationState,
} from 'material-react-table';
import { useCallback, useMemo, useRef, useState } from 'react';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';

interface PaginatedTableConfig<T extends MRT_RowData>
  extends BaseTableConfig<T> {
  totalCount: number;
}

/** Use for any paginated datasets. Sort, filter and pagination must be handled externally */
export const usePaginatedMaterialTable = <T extends MRT_RowData>({
  isLoading,
  onRowClick,
  totalCount,
  ...tableOptions
}: PaginatedTableConfig<T>) => {
  const t = useTranslation();
  const {
    updatePaginationQuery,
    queryParams: { page, first, offset },
  } = useUrlQueryParams();
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const paginationRef = useRef<number>(0);

  const pagination = { page, first, offset };

  const handlePaginationChange = useCallback(
    (paginationUpdate: MRT_Updater<MRT_PaginationState>) => {
      if (typeof paginationUpdate === 'function') {
        const lastUpdate = paginationRef.current;
        const current = { pageIndex: page, pageSize: first };
        const newPaginationValue = paginationUpdate(current);
        paginationRef.current = Date.now();
        // This is a hacky workaround for this bug:
        // https://github.com/KevinVandy/material-react-table/issues/1251
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

    autoResetPageIndex: false,
    onPaginationChange: handlePaginationChange,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    rowCount: totalCount,
    state: {
      pagination: { pageIndex: pagination.page, pageSize: pagination.first },
      rowSelection,
    },

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
      if (totalCount === 0) return <Box />; // empty box to kep toolbar layout consistent

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

    ...tableOptions,
  });

  const selectedRows = useMemo(
    () => table.getSelectedRowModel().rows.map(r => r.original),
    [rowSelection]
  );

  return { table, selectedRows };
};
