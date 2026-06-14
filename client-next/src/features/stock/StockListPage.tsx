import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  getCoreRowModel,
  useReactTable,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { Box, TablePagination, Typography } from '@mui/material';
import { useTranslation } from '@/intl';
import { DataTable } from '@/components/DataTable';
import { useStockColumns } from './columns';
import { stockListQueryOptions } from './queries';

const route = getRouteApi('/_authenticated/$storeId/stock/');

export function StockListPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { t } = useTranslation();
  const columns = useStockColumns();
  const { storeId } = route.useParams();

  const { data } = useQuery({
    ...stockListQueryOptions(storeId, search),
    enabled: Boolean(storeId),
  });

  const sorting: SortingState = [{ id: search.sortKey, desc: search.sortDesc }];
  const pagination: PaginationState = {
    pageIndex: search.page - 1,
    pageSize: search.pageSize,
  };

  const onSortingChange: OnChangeFn<SortingState> = updater => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const first = next[0];
    navigate({
      search: prev => ({
        ...prev,
        sortKey: first?.id ?? 'name',
        sortDesc: first?.desc ?? false,
        page: 1,
      }),
    });
  };

  const onPaginationChange: OnChangeFn<PaginationState> = updater => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    navigate({
      search: prev => ({
        ...prev,
        page: next.pageIndex + 1,
        pageSize: next.pageSize,
      }),
    });
  };

  const table = useReactTable({
    data: data?.nodes ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSortingRemoval: false,
    manualPagination: true,
    rowCount: data?.totalCount ?? 0,
    state: { sorting, pagination },
    onSortingChange,
    onPaginationChange,
  });

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}
    >
      <Typography variant="h5">{t('app.stock')}</Typography>
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/$storeId/stock/$stockLineId',
            params: { storeId, stockLineId: row.id },
          })
        }
      />
      <TablePagination
        component="div"
        count={data?.totalCount ?? 0}
        page={search.page - 1}
        rowsPerPage={search.pageSize}
        rowsPerPageOptions={[25, 50, 100]}
        onPageChange={(_, p) =>
          navigate({ search: prev => ({ ...prev, page: p + 1 }) })
        }
        onRowsPerPageChange={e =>
          navigate({
            search: prev => ({
              ...prev,
              pageSize: Number(e.target.value),
              page: 1,
            }),
          })
        }
      />
    </Box>
  );
}
