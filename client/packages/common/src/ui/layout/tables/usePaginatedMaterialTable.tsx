import React from 'react';
import {
  Box,
  Typography,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import type {
  MRT_RowData,
  MRT_RowSelectionState,
  MRT_Updater,
  MRT_PaginationState,
} from './mrtCompat';
import { useCallback, useMemo, useState } from 'react';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';
import { TablePagination, Pagination } from '@mui/material';

interface PaginatedTableConfig<T extends MRT_RowData>
  extends Omit<BaseTableConfig<T>, 'enablePagination' | 'enableBottomToolbar'> {
  totalCount: number;
}

/** Custom actions component that renders MUI Pagination with page numbers inside TablePagination */
const TablePaginationActions = ({
  page,
  count,
  rowsPerPage,
  onPageChange,
}: {
  page: number;
  count: number;
  rowsPerPage: number;
  onPageChange: (event: React.MouseEvent<HTMLButtonElement> | null, page: number) => void;
}) => {
  const totalPages = Math.max(1, Math.ceil(count / rowsPerPage));
  return (
    <Pagination
      page={page + 1}
      count={totalPages}
      onChange={(_, p) => onPageChange(null, p - 1)}
      showFirstButton
      showLastButton
      siblingCount={2}
      size="small"
      shape="rounded"
      sx={{ '& .MuiPagination-ul': { flexWrap: 'nowrap' } }}
    />
  );
};

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

  const pagination = { page, first, offset };

  const handlePaginationChange = useCallback(
    (paginationUpdate: MRT_Updater<MRT_PaginationState>) => {
      if (typeof paginationUpdate === 'function') {
        const current = { pageIndex: page, pageSize: first };
        const newPaginationValue = paginationUpdate(current);
        updatePaginationQuery(
          newPaginationValue.pageIndex,
          newPaginationValue.pageSize
        );
      }
    },
    [updatePaginationQuery, page, first]
  );

  const hasSelection = Object.keys(rowSelection).length > 0;

  const renderBottomToolbar = useCallback(() => {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          '& .MuiInputLabel-root': { fontSize: '0.9em' },
        }}
      >
        {totalCount > 0 && (
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
              {`${offset + 1}-${Math.min(first + offset, totalCount)}`}
            </Typography>
            <Typography sx={{ marginRight: '4px' }}>{t('label.of')}</Typography>
            <Typography sx={{ fontWeight: 'bold', marginRight: '4px' }}>
              {totalCount}
            </Typography>
          </Box>
        )}
        {!hasSelection && (
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            rowsPerPage={first}
            rowsPerPageOptions={[10, 20, 50, 100]}
            ActionsComponent={TablePaginationActions}
            labelDisplayedRows={() => null}
            onPageChange={(_e, newPage) =>
              handlePaginationChange(() => ({ pageIndex: newPage, pageSize: first }))
            }
            onRowsPerPageChange={e =>
              handlePaginationChange(() => ({
                pageIndex: 0,
                pageSize: parseInt(e.target.value, 10),
              }))
            }
            SelectProps={{
              sx: { minWidth: '40px', fontSize: '0.9em', marginRight: 0 },
            }}
            slotProps={{
              spacer: { sx: { flex: 0 } },
              toolbar: {
                sx: {
                  '& .MuiTablePagination-actions': { marginLeft: 0 },
                },
              },
              displayedRows: { sx: { display: 'none' } },
            }}
            sx={{
              '& .MuiTablePagination-toolbar': { minHeight: 0, padding: 0 },
              '& .MuiTablePagination-selectLabel':
                { fontSize: '0.9em' },
            }}
          />
        )}
      </Box>
    );
  }, [totalCount, offset, first, page, hasSelection, handlePaginationChange, t]);

  const table = useBaseMaterialTable<T>({
    isLoading,
    onRowClick,

    autoResetPageIndex: false,
    onPaginationChange: handlePaginationChange,
    onRowSelectionChange: setRowSelection,
    rowCount: totalCount,
    state: {
      pagination: { pageIndex: pagination.page, pageSize: pagination.first },
      rowSelection,
    },

    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    enableBottomToolbar: true,
    enablePagination: false, // pagination UI handled manually in renderBottomToolbar
    renderBottomToolbar,

    ...tableOptions,
  });

  const selectedRows = useMemo(
    () => table.getSelectedRowModel().rows.map(r => r.original),
    // `table` intentionally omitted — its ref changes every render.
    // `rowSelection` is the only state that drives selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowSelection]
  );

  return { table, selectedRows };
};
