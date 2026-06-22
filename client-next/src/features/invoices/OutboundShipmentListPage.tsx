import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useTranslation } from '@/intl';
import { DataTable } from '@/components/DataTable';
import { DataTablePagination } from '@/components/DataTablePagination';
import { SearchField } from '@/components/SearchField';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LineEditDialog } from '@/components/detail/LineEditDialog';
import { NameSearchInput } from '@/components/detail/NameSearchInput';
import { formatDate, formatCurrency } from '@/lib/format';
import { InvoiceNodeStatus } from '@/gql/schema';
import { invoiceListQueryOptions } from '@/features/invoices/queries';
import { useInvoiceStatusName } from '@/features/invoices/status';
import { outboundFilter } from '@/features/invoices/outboundShipment';
import { outboundSdk } from '@/features/invoices/outboundDetail.queries';
import type { InvoiceRowFragment } from '@/features/invoices/invoices.generated';
import type { NameRowFragment } from '@/features/names/names.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/distribution/outbound-shipment/',
);
const helper = createColumnHelper<InvoiceRowFragment>();

// Sentinel for the "all statuses" option (shadcn Select can't use an empty value).
const ALL = 'all';

// Statuses an outbound shipment moves through (drives the filter dropdown).
const STATUS_OPTIONS: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Allocated,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Verified,
];

export function OutboundShipmentListPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { t } = useTranslation();
  const statusName = useInvoiceStatusName();
  const { storeId } = route.useParams();

  const { data } = useQuery({
    ...invoiceListQueryOptions(
      storeId,
      'outbound-shipment',
      outboundFilter(search),
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
        header: t('label.created'),
        cell: c => formatDate(c.getValue()),
      }),
      helper.accessor('theirReference', {
        id: 'theirReference',
        header: t('label.reference'),
        cell: c => c.getValue() ?? '',
      }),
      helper.accessor('comment', {
        id: 'comment',
        header: t('label.comment'),
        cell: c => c.getValue() ?? '',
      }),
      helper.accessor(row => row.pricing.totalAfterTax, {
        id: 'total',
        header: t('label.total'),
        enableSorting: false,
        cell: c => formatCurrency(c.getValue()),
      }),
    ],
    [t, statusName],
  );

  const [createOpen, setCreateOpen] = useState(false);

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
        sortKey: first?.id ?? 'invoiceNumber',
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
          {t('app.outbound-shipment')}
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
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          {t('button.new')}
        </Button>
      </div>

      <NewOutboundDialog
        open={createOpen}
        storeId={storeId}
        onClose={() => setCreateOpen(false)}
        onCreated={invoiceId => {
          setCreateOpen(false);
          navigate({
            to: '/$storeId/distribution/outbound-shipment/$invoiceId',
            params: { storeId, invoiceId },
          });
        }}
      />
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/$storeId/distribution/outbound-shipment/$invoiceId',
            params: { storeId, invoiceId: row.id },
          })
        }
      />
      <DataTablePagination table={table} />
    </div>
  );
}

// Outbound shipments can only be raised against a customer of the current store.
const CUSTOMER_FILTER = { isCustomer: true, isVisible: true } as const;

// Create-document dialog: pick a customer, insert a new outbound shipment, and
// hand the new invoice id back so the list page can route into it. The insert
// response is the same 3-way union the detail page handles on update
// (InvoiceNode | InsertOutboundShipmentError | NodeError).
function NewOutboundDialog({
  open,
  storeId,
  onClose,
  onCreated,
}: {
  open: boolean;
  storeId: string;
  onClose: () => void;
  onCreated: (invoiceId: string) => void;
}) {
  const { t } = useTranslation();
  const [customer, setCustomer] = useState<NameRowFragment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCustomer(null);
      setError(null);
    }
  }, [open]);

  const create = useMutation({
    mutationFn: async () => {
      if (!customer) return;
      const res = await outboundSdk.insertOutbound({
        storeId,
        input: { id: crypto.randomUUID(), otherPartyId: customer.id },
      });
      const r = res.insertOutboundShipment;
      if (
        r.__typename === 'InsertOutboundShipmentError' ||
        r.__typename === 'NodeError'
      )
        throw new Error(r.error.description);
      // Remaining union member is InvoiceNode (the success case).
      return r.id;
    },
    onSuccess: id => {
      if (id) onCreated(id);
    },
    onError: e => setError(e instanceof Error ? e.message : String(e)),
  });

  return (
    <LineEditDialog
      open={open}
      title={t('heading.new-outbound-shipment')}
      okLabel={t('button.create')}
      onClose={onClose}
      onOk={() => create.mutate()}
      okDisabled={!customer}
      saving={create.isPending}
    >
      <div className="flex flex-col gap-4 pt-1">
        <NameSearchInput
          storeId={storeId}
          filter={CUSTOMER_FILTER}
          value={customer}
          onChange={setCustomer}
          label={t('label.customer-name')}
          autoFocus
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </LineEditDialog>
  );
}
