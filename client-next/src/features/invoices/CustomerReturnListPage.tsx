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
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  TablePagination,
  Typography,
} from '@mui/material';
import { useTranslation } from '@/intl';
import { DataTable } from '@/components/DataTable';
import { SearchField } from '@/components/SearchField';
import { formatDate } from '@/lib/format';
import { InvoiceNodeStatus } from '@/gql/schema';
import { invoiceListQueryOptions } from '@/features/invoices/queries';
import { useInvoiceStatusName } from '@/features/invoices/status';
import { customerReturnFilter } from '@/features/invoices/customerReturn';
import type { InvoiceRowFragment } from '@/features/invoices/invoices.generated';

const route = getRouteApi('/_authenticated/$storeId/distribution/customer-return/');
const helper = createColumnHelper<InvoiceRowFragment>();

// Statuses a customer return moves through (drives the filter dropdown).
const STATUS_OPTIONS: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Received,
  InvoiceNodeStatus.Verified,
];

export function CustomerReturnListPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { t } = useTranslation();
  const statusName = useInvoiceStatusName();
  const { storeId } = route.useParams();

  const { data } = useQuery({
    ...invoiceListQueryOptions(
      storeId,
      'customer-return',
      customerReturnFilter(search),
      search,
    ),
    enabled: Boolean(storeId),
  });

  const columns = useMemo(
    () => [
      helper.accessor('otherPartyName', { id: 'otherPartyName', header: t('label.name') }),
      helper.accessor('status', { id: 'status', header: t('label.status'), cell: c => statusName(c.getValue()) }),
      helper.accessor('invoiceNumber', { id: 'invoiceNumber', header: t('label.number') }),
      helper.accessor('createdDatetime', { id: 'createdDatetime', header: t('label.created-datetime'), cell: c => formatDate(c.getValue()) }),
      helper.accessor('comment', { id: 'comment', header: t('label.comment'), cell: c => c.getValue() ?? '' }),
      helper.accessor('theirReference', { id: 'theirReference', header: t('label.reference'), cell: c => c.getValue() ?? '' }),
    ],
    [t, statusName],
  );

  const sorting: SortingState = [{ id: search.sortKey, desc: search.sortDesc }];
  const pagination: PaginationState = { pageIndex: search.page - 1, pageSize: search.pageSize };

  const onSortingChange: OnChangeFn<SortingState> = updater => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const first = next[0];
    navigate({ search: prev => ({ ...prev, sortKey: first?.id ?? 'createdDatetime', sortDesc: first?.desc ?? false, page: 1 }) });
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
          {t('app.customer-return')}
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
      </Box>
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/$storeId/distribution/customer-return/$invoiceId',
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
    </Box>
  );
}
