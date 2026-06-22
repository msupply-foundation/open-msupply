import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  getCoreRowModel,
  useReactTable,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { useTranslation } from '@/intl';
import { DataTable } from '@/components/DataTable';
import { DataTablePagination } from '@/components/DataTablePagination';
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
    <div className="flex h-full flex-col gap-2">
      <h1 className="text-xl font-semibold">{t('app.stock')}</h1>
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/$storeId/stock/$stockLineId',
            params: { storeId, stockLineId: row.id },
          })
        }
      />
      <DataTablePagination table={table} />
    </div>
  );
}
