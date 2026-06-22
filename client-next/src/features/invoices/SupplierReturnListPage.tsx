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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/format';
import { InvoiceNodeStatus } from '@/gql/schema';
import { invoiceListQueryOptions } from '@/features/invoices/queries';
import { useInvoiceStatusName } from '@/features/invoices/status';
import { supplierReturnFilter } from '@/features/invoices/supplierReturn';
import type { InvoiceRowFragment } from '@/features/invoices/invoices.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/replenishment/supplier-return/',
);
const helper = createColumnHelper<InvoiceRowFragment>();

// Sentinel for the "all statuses" option (shadcn Select can't use an empty value).
const ALL = 'all';

// Statuses a supplier return moves through (drives the filter dropdown).
const STATUS_OPTIONS: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Verified,
];

export function SupplierReturnListPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { t } = useTranslation();
  const statusName = useInvoiceStatusName();
  const { storeId } = route.useParams();

  const { data } = useQuery({
    ...invoiceListQueryOptions(
      storeId,
      'supplier-return',
      supplierReturnFilter(search),
      search,
    ),
    enabled: Boolean(storeId),
  });

  const columns = useMemo(
    () => [
      helper.accessor('otherPartyName', {
        id: 'otherPartyName',
        header: t('label.name'),
      }),
      helper.accessor('status', {
        id: 'status',
        header: t('label.status'),
        cell: c => statusName(c.getValue()),
      }),
      helper.accessor('invoiceNumber', {
        id: 'invoiceNumber',
        header: t('label.number'),
      }),
      helper.accessor('createdDatetime', {
        id: 'createdDatetime',
        header: t('label.created-datetime'),
        cell: c => formatDate(c.getValue()),
      }),
      helper.accessor('comment', {
        id: 'comment',
        header: t('label.comment'),
        cell: c => c.getValue() ?? '',
      }),
      helper.accessor('theirReference', {
        id: 'theirReference',
        header: t('label.reference'),
        cell: c => c.getValue() ?? '',
      }),
    ],
    [t, statusName],
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
        sortKey: first?.id ?? 'createdDatetime',
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
        <h1 className="grow text-xl font-semibold">
          {t('app.supplier-return')}
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
        <Select
          value={search.status ?? ALL}
          onValueChange={value =>
            navigate({
              search: prev => ({
                ...prev,
                status: (value === ALL ? undefined : value) as
                  | InvoiceNodeStatus
                  | undefined,
                page: 1,
              }),
            })
          }
        >
          <SelectTrigger size="sm" className="min-w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('label.all-statuses')}</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>
                {statusName(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/$storeId/replenishment/supplier-return/$invoiceId',
            params: { storeId, invoiceId: row.id },
          })
        }
      />
      <DataTablePagination table={table} />
    </div>
  );
}
