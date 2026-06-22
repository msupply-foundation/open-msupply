import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { useTranslation } from '@/intl';
import { DataTable } from '@/components/DataTable';
import { DataTablePagination } from '@/components/DataTablePagination';
import { SearchField } from '@/components/SearchField';
import { nameListQueryOptions } from '@/features/names/queries';
import { customersFilter } from '@/features/names/customers';
import type { NameRowFragment } from '@/features/names/names.generated';

const route = getRouteApi('/_authenticated/$storeId/distribution/customers/');
const helper = createColumnHelper<NameRowFragment>();

export function CustomersListPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { t } = useTranslation();
  const { storeId } = route.useParams();

  const { data } = useQuery({
    ...nameListQueryOptions(
      storeId,
      'customers',
      customersFilter(search),
      search,
    ),
    enabled: Boolean(storeId),
  });

  const columns = useMemo(
    () => [
      helper.accessor('code', { id: 'code', header: t('label.code') }),
      helper.accessor('name', { id: 'name', header: t('label.name') }),
    ],
    [t],
  );

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
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex-grow text-xl font-semibold">
          {t('app.customers')}
        </h1>
        <SearchField
          value={search.search ?? ''}
          onChange={value =>
            navigate({
              search: prev => ({
                ...prev,
                search: value || undefined,
                page: 1,
              }),
            })
          }
          placeholder={t('placeholder.search')}
        />
      </div>
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/$storeId/distribution/customers/$nameId',
            params: { storeId, nameId: row.id },
          })
        }
      />
      <DataTablePagination table={table} />
    </div>
  );
}
