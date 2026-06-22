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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LineEditDialog } from '@/components/detail/LineEditDialog';
import { NameSearchInput } from '@/components/detail/NameSearchInput';
import { formatDate } from '@/lib/format';
import { RequisitionNodeStatus } from '@/gql/schema';
import { requisitionListQueryOptions } from '@/features/requisitions/queries';
import { useRequisitionStatusName } from '@/features/requisitions/status';
import { internalOrderFilter } from '@/features/requisitions/internalOrder';
import { requestSdk } from '@/features/requisitions/requestDetail.queries';
import type { RequisitionRowFragment } from '@/features/requisitions/requisitions.generated';
import type { NameRowFragment } from '@/features/names/names.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/replenishment/internal-order/',
);
const helper = createColumnHelper<RequisitionRowFragment>();

// Sentinel for the "all statuses" option (shadcn Select can't use an empty value).
const ALL = 'all';

// Statuses a requisition moves through (drives the filter dropdown).
const STATUS_OPTIONS: RequisitionNodeStatus[] = [
  RequisitionNodeStatus.Draft,
  RequisitionNodeStatus.New,
  RequisitionNodeStatus.Sent,
  RequisitionNodeStatus.Finalised,
];

export function InternalOrderListPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { t } = useTranslation();
  const statusName = useRequisitionStatusName();
  const { storeId } = route.useParams();
  const [createOpen, setCreateOpen] = useState(false);

  const { data } = useQuery({
    ...requisitionListQueryOptions(
      storeId,
      'internal-order',
      internalOrderFilter(search),
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
      helper.accessor('theirReference', {
        id: 'theirReference',
        header: t('label.reference'),
        cell: c => c.getValue() ?? '',
      }),
      helper.accessor('status', {
        id: 'status',
        header: t('label.status'),
        cell: c => statusName(c.getValue()),
      }),
      helper.accessor('requisitionNumber', {
        id: 'requisitionNumber',
        header: t('label.number'),
      }),
      helper.accessor('createdDatetime', {
        id: 'createdDatetime',
        header: t('label.created'),
        cell: c => formatDate(c.getValue()),
      }),
      helper.accessor(row => row.lines.totalCount, {
        id: 'count-rows',
        header: t('label.count-rows'),
        enableSorting: false,
      }),
      helper.accessor('comment', {
        id: 'comment',
        header: t('label.comment'),
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
          {t('app.internal-order')}
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
                  | RequisitionNodeStatus
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

      <CreateInternalOrderDialog
        open={createOpen}
        storeId={storeId}
        onClose={() => setCreateOpen(false)}
      />
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/$storeId/replenishment/internal-order/$requisitionId',
            params: { storeId, requisitionId: row.id },
          })
        }
      />
      <DataTablePagination table={table} />
    </div>
  );
}

// A request requisition's other party MUST be a store, so the picker is
// filtered to visible stores. Min/Max months of stock seed the suggested
// quantities and default to the usual 1 / 3.
function CreateInternalOrderDialog({
  open,
  storeId,
  onClose,
}: {
  open: boolean;
  storeId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = route.useNavigate();
  const [party, setParty] = useState<NameRowFragment | null>(null);
  const [minMonths, setMinMonths] = useState('1');
  const [maxMonths, setMaxMonths] = useState('3');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setParty(null);
      setMinMonths('1');
      setMaxMonths('3');
      setError(null);
    }
  }, [open]);

  const create = useMutation({
    mutationFn: async () => {
      if (!party) return null;
      const res = await requestSdk.insertRequest({
        storeId,
        input: {
          id: crypto.randomUUID(),
          otherPartyId: party.id,
          minMonthsOfStock: Number(minMonths) || 0,
          maxMonthsOfStock: Number(maxMonths) || 0,
        },
      });
      if (
        res.insertRequestRequisition.__typename ===
        'InsertRequestRequisitionError'
      )
        throw new Error(res.insertRequestRequisition.error.description);
      return res.insertRequestRequisition.id;
    },
    onSuccess: id => {
      if (!id) return;
      onClose();
      navigate({
        to: '/$storeId/replenishment/internal-order/$requisitionId',
        params: { storeId, requisitionId: id },
      });
    },
    onError: e => setError(e instanceof Error ? e.message : String(e)),
  });

  return (
    <LineEditDialog
      open={open}
      title={t('heading.new-internal-order')}
      okLabel={t('button.create')}
      onClose={onClose}
      onOk={() => create.mutate()}
      okDisabled={!party}
      saving={create.isPending}
    >
      <div className="flex flex-col gap-4 pt-1">
        <NameSearchInput
          storeId={storeId}
          filter={{ isStore: true, isVisible: true }}
          value={party}
          onChange={setParty}
          label={t('label.supplier-name')}
          autoFocus
        />
        <div className="flex gap-4">
          <div className="grid flex-1 gap-1.5">
            <Label>{t('label.min-months-of-stock')}</Label>
            <Input
              type="number"
              value={minMonths}
              onChange={e => setMinMonths(e.target.value)}
            />
          </div>
          <div className="grid flex-1 gap-1.5">
            <Label>{t('label.max-months-of-stock')}</Label>
            <Input
              type="number"
              value={maxMonths}
              onChange={e => setMaxMonths(e.target.value)}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </LineEditDialog>
  );
}
