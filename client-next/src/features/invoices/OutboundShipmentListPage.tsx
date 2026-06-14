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
import { Box, TablePagination, Typography } from '@mui/material';
import { useSession } from '@/app/session';
import { useTranslation } from '@/intl';
import { DataTable } from '@/components/DataTable';
import { formatDate, formatCurrency } from '@/lib/format';
import { InvoiceNodeType } from '@/gql/schema';
import { invoiceListQueryOptions } from '@/features/invoices/queries';
import { useInvoiceStatusName } from '@/features/invoices/status';
import type { InvoiceRowFragment } from '@/features/invoices/invoices.generated';

const route = getRouteApi('/_authenticated/distribution/outbound-shipment');
const helper = createColumnHelper<InvoiceRowFragment>();

export function OutboundShipmentListPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { t } = useTranslation();
  const statusName = useInvoiceStatusName();
  const storeId = useSession(s => s.store?.id) ?? '';

  const { data } = useQuery({
    ...invoiceListQueryOptions(
      storeId,
      'outbound-shipment',
      { type: { equalTo: InvoiceNodeType.OutboundShipment } },
      search,
    ),
    enabled: Boolean(storeId),
  });

  const columns = useMemo(
    () => [
      helper.accessor('otherPartyName', { id: 'otherPartyName', header: t('label.name') }),
      helper.accessor('status', { id: 'status', header: t('label.status'), cell: c => statusName(c.getValue()) }),
      helper.accessor('invoiceNumber', { id: 'invoiceNumber', header: t('label.number') }),
      helper.accessor('createdDatetime', { id: 'createdDatetime', header: t('label.created'), cell: c => formatDate(c.getValue()) }),
      helper.accessor('theirReference', { id: 'theirReference', header: t('label.reference'), cell: c => c.getValue() ?? '' }),
      helper.accessor('comment', { id: 'comment', header: t('label.comment'), cell: c => c.getValue() ?? '' }),
      helper.accessor(row => row.pricing.totalAfterTax, { id: 'total', header: t('label.total'), enableSorting: false, cell: c => formatCurrency(c.getValue()) }),
    ],
    [t, statusName],
  );

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
    manualPagination: true,
    rowCount: data?.totalCount ?? 0,
    state: { sorting, pagination },
    onSortingChange,
    onPaginationChange,
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
      <Typography variant="h5">{t('app.outbound-shipment')}</Typography>
      <DataTable table={table} />
      <TablePagination
        component="div"
        count={data?.totalCount ?? 0}
        page={search.page - 1}
        rowsPerPage={search.pageSize}
        rowsPerPageOptions={[25, 50, 100]}
        onPageChange={(_, p) => navigate({ search: prev => ({ ...prev, page: p + 1 }) })}
        onRowsPerPageChange={e => navigate({ search: prev => ({ ...prev, pageSize: Number(e.target.value), page: 1 }) })}
      />
    </Box>
  );
}
