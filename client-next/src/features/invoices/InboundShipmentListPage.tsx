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
import {
  Alert,
  Box,
  Button,
  FormControl,
  MenuItem,
  Select,
  Stack,
  TablePagination,
  Typography,
} from '@mui/material';
import { useTranslation } from '@/intl';
import { DataTable } from '@/components/DataTable';
import { SearchField } from '@/components/SearchField';
import { LineEditDialog } from '@/components/detail/LineEditDialog';
import { NameSearchInput } from '@/components/detail/NameSearchInput';
import { formatDate, formatCurrency } from '@/lib/format';
import { InvoiceNodeStatus } from '@/gql/schema';
import { invoiceListQueryOptions } from '@/features/invoices/queries';
import { useInvoiceStatusName } from '@/features/invoices/status';
import { inboundFilter } from '@/features/invoices/inboundShipment';
import { inboundSdk } from '@/features/invoices/inboundDetail.queries';
import type { InvoiceRowFragment } from '@/features/invoices/invoices.generated';
import type { NameRowFragment } from '@/features/names/names.generated';

const route = getRouteApi('/_authenticated/$storeId/replenishment/inbound-shipment/');
const helper = createColumnHelper<InvoiceRowFragment>();

// Statuses an inbound shipment moves through (drives the filter dropdown).
const STATUS_OPTIONS: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Received,
  InvoiceNodeStatus.Verified,
];

export function InboundShipmentListPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { t } = useTranslation();
  const statusName = useInvoiceStatusName();
  const { storeId } = route.useParams();

  const { data } = useQuery({
    ...invoiceListQueryOptions(
      storeId,
      'inbound-shipment',
      inboundFilter(search),
      search,
    ),
    enabled: Boolean(storeId),
  });

  const columns = useMemo(
    () => [
      helper.accessor('otherPartyName', { id: 'otherPartyName', header: t('label.supplier') }),
      helper.accessor('status', { id: 'status', header: t('label.status'), cell: c => statusName(c.getValue()) }),
      helper.accessor('invoiceNumber', { id: 'invoiceNumber', header: t('label.number') }),
      helper.accessor('createdDatetime', { id: 'createdDatetime', header: t('label.created'), cell: c => formatDate(c.getValue()) }),
      helper.accessor('deliveredDatetime', { id: 'deliveredDatetime', header: t('label.delivered'), cell: c => formatDate(c.getValue()) }),
      helper.accessor('comment', { id: 'comment', header: t('label.comment'), cell: c => c.getValue() ?? '' }),
      helper.accessor('theirReference', { id: 'theirReference', header: t('label.reference'), cell: c => c.getValue() ?? '' }),
      helper.accessor(row => row.pricing.totalAfterTax, { id: 'total', header: t('label.total'), enableSorting: false, cell: c => formatCurrency(c.getValue()) }),
    ],
    [t, statusName],
  );

  const [createOpen, setCreateOpen] = useState(false);

  const sorting: SortingState = [{ id: search.sortKey, desc: search.sortDesc }];
  const pagination: PaginationState = { pageIndex: search.page - 1, pageSize: search.pageSize };

  const onSortingChange: OnChangeFn<SortingState> = updater => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const first = next[0];
    navigate({ search: prev => ({ ...prev, sortKey: first?.id ?? 'invoiceNumber', sortDesc: first?.desc ?? false, page: 1 }) });
  };
  const onPaginationChange: OnChangeFn<PaginationState> = updater => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    navigate({ search: prev => ({ ...prev, page: next.pageIndex + 1, pageSize: next.pageSize }) });
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {t('app.inbound-shipment')}
        </Typography>
        <SearchField
          value={search.search ?? ''}
          onChange={value =>
            navigate({ search: prev => ({ ...prev, search: value || undefined, page: 1 }) })
          }
          placeholder={t('placeholder.search')}
        />
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select
            displayEmpty
            value={search.status ?? ''}
            onChange={e =>
              navigate({
                search: prev => ({
                  ...prev,
                  status: (e.target.value || undefined) as InvoiceNodeStatus | undefined,
                  page: 1,
                }),
              })
            }
          >
            <MenuItem value="">{t('label.all-statuses')}</MenuItem>
            {STATUS_OPTIONS.map(s => (
              <MenuItem key={s} value={s}>
                {statusName(s)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          {t('button.new')}
        </Button>
      </Box>
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/$storeId/replenishment/inbound-shipment/$invoiceId',
            params: { storeId, invoiceId: row.id },
          })
        }
      />
      <TablePagination
        component="div"
        count={data?.totalCount ?? 0}
        page={search.page - 1}
        rowsPerPage={search.pageSize}
        rowsPerPageOptions={[25, 50, 100]}
        onPageChange={(_, p) => navigate({ search: prev => ({ ...prev, page: p + 1 }) })}
        onRowsPerPageChange={e => navigate({ search: prev => ({ ...prev, pageSize: Number(e.target.value), page: 1 }) })}
      />
      <CreateInboundDialog
        open={createOpen}
        storeId={storeId}
        onClose={() => setCreateOpen(false)}
        onCreated={invoiceId => {
          setCreateOpen(false);
          navigate({
            to: '/$storeId/replenishment/inbound-shipment/$invoiceId',
            params: { storeId, invoiceId },
          });
        }}
      />
    </Box>
  );
}

// Pick a supplier and create a new inbound shipment, then jump to its detail.
const SUPPLIER_FILTER = { isSupplier: true, isVisible: true };

function CreateInboundDialog({
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
  const [supplier, setSupplier] = useState<NameRowFragment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSupplier(null);
      setError(null);
    }
  }, [open]);

  const create = useMutation({
    mutationFn: async () => {
      if (!supplier) return;
      const res = await inboundSdk.insertInbound({
        storeId,
        input: { id: crypto.randomUUID(), otherPartyId: supplier.id },
      });
      const result = res.insertInboundShipment;
      if (result.__typename === 'InsertInboundShipmentError')
        throw new Error(result.error.description);
      onCreated(result.id);
    },
    onError: e => setError(e instanceof Error ? e.message : String(e)),
  });

  return (
    <LineEditDialog
      open={open}
      title={t('heading.new-inbound-shipment')}
      okLabel={t('button.create')}
      onClose={onClose}
      onOk={() => create.mutate()}
      okDisabled={!supplier}
      saving={create.isPending}
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <NameSearchInput
          storeId={storeId}
          filter={SUPPLIER_FILTER}
          value={supplier}
          onChange={setSupplier}
          label={t('label.supplier-name')}
          autoFocus
        />
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </LineEditDialog>
  );
}
