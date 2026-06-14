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
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '@/intl';
import { DataTable } from '@/components/DataTable';
import { SearchField } from '@/components/SearchField';
import { LineEditDialog } from '@/components/detail/LineEditDialog';
import { sanitizeNumeric } from '@/components/detail/inputs';
import { NameSearchInput } from '@/components/detail/NameSearchInput';
import { formatDate } from '@/lib/format';
import { RequisitionNodeStatus } from '@/gql/schema';
import { requisitionListQueryOptions } from '@/features/requisitions/queries';
import { useRequisitionStatusName } from '@/features/requisitions/status';
import { customerRequisitionFilter } from '@/features/requisitions/customerRequisition';
import { responseSdk } from '@/features/requisitions/responseDetail.queries';
import type { RequisitionRowFragment } from '@/features/requisitions/requisitions.generated';
import type { NameRowFragment } from '@/features/names/names.generated';

const route = getRouteApi('/_authenticated/$storeId/distribution/customer-requisition/');
const helper = createColumnHelper<RequisitionRowFragment>();

// Statuses a requisition moves through (drives the filter dropdown).
const STATUS_OPTIONS: RequisitionNodeStatus[] = [
  RequisitionNodeStatus.Draft,
  RequisitionNodeStatus.New,
  RequisitionNodeStatus.Sent,
  RequisitionNodeStatus.Finalised,
];

export function CustomerRequisitionListPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { t } = useTranslation();
  const statusName = useRequisitionStatusName();
  const { storeId } = route.useParams();
  const [createOpen, setCreateOpen] = useState(false);

  const { data } = useQuery({
    ...requisitionListQueryOptions(
      storeId,
      'customer-requisition',
      customerRequisitionFilter(search),
      search,
    ),
    enabled: Boolean(storeId),
  });

  const columns = useMemo(
    () => [
      helper.accessor('otherPartyName', { id: 'otherPartyName', header: t('label.name') }),
      helper.accessor('status', { id: 'status', header: t('label.status'), cell: c => statusName(c.getValue()) }),
      helper.accessor('requisitionNumber', { id: 'requisitionNumber', header: t('label.number') }),
      helper.accessor('createdDatetime', { id: 'createdDatetime', header: t('label.created'), cell: c => formatDate(c.getValue()) }),
      helper.accessor(row => row.shipments.totalCount, { id: 'shipments', header: t('label.shipments'), enableSorting: false }),
      helper.accessor('comment', { id: 'comment', header: t('label.comment'), cell: c => c.getValue() ?? '' }),
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
          {t('app.customer-requisition')}
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
                  status: (e.target.value || undefined) as RequisitionNodeStatus | undefined,
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          {t('button.new')}
        </Button>
      </Box>
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/$storeId/distribution/customer-requisition/$requisitionId',
            params: { storeId, requisitionId: row.id },
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
      <CreateCustomerRequisitionDialog
        open={createOpen}
        storeId={storeId}
        onClose={() => setCreateOpen(false)}
        onCreated={requisitionId => {
          setCreateOpen(false);
          navigate({
            to: '/$storeId/distribution/customer-requisition/$requisitionId',
            params: { storeId, requisitionId },
          });
        }}
      />
    </Box>
  );
}

// Create-customer-requisition modal: pick a customer and the min/max months of
// stock, insert the response requisition, then hand the new id back so the list
// page can route to its detail.
function CreateCustomerRequisitionDialog({
  open,
  storeId,
  onClose,
  onCreated,
}: {
  open: boolean;
  storeId: string;
  onClose: () => void;
  onCreated: (requisitionId: string) => void;
}) {
  const { t } = useTranslation();
  const [customer, setCustomer] = useState<NameRowFragment | null>(null);
  const [minMonths, setMinMonths] = useState('1');
  const [maxMonths, setMaxMonths] = useState('3');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCustomer(null);
      setMinMonths('1');
      setMaxMonths('3');
      setError(null);
    }
  }, [open]);

  const create = useMutation({
    mutationFn: async () => {
      if (!customer) return;
      const res = await responseSdk.insertResponse({
        storeId,
        input: {
          id: crypto.randomUUID(),
          otherPartyId: customer.id,
          minMonthsOfStock: Number(minMonths) || 0,
          maxMonthsOfStock: Number(maxMonths) || 0,
        },
      });
      if (
        res.insertResponseRequisition.__typename ===
        'InsertResponseRequisitionError'
      )
        throw new Error(res.insertResponseRequisition.error.description);
      if (res.insertResponseRequisition.__typename === 'RequisitionNode')
        onCreated(res.insertResponseRequisition.id);
    },
    onError: e => setError(e instanceof Error ? e.message : String(e)),
  });

  return (
    <LineEditDialog
      open={open}
      title={t('heading.new-customer-requisition')}
      okLabel={t('button.create')}
      onClose={onClose}
      onOk={() => create.mutate()}
      okDisabled={!customer}
      saving={create.isPending}
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <NameSearchInput
          storeId={storeId}
          filter={{ isCustomer: true, isVisible: true }}
          value={customer}
          onChange={setCustomer}
          label={t('label.customer-name')}
          autoFocus
        />
        <Stack direction="row" spacing={2}>
          <TextField
            label={t('label.min-months-of-stock')}
            value={minMonths}
            onChange={e => setMinMonths(sanitizeNumeric(e.target.value))}
            size="small"
            fullWidth
            inputMode="decimal"
          />
          <TextField
            label={t('label.max-months-of-stock')}
            value={maxMonths}
            onChange={e => setMaxMonths(sanitizeNumeric(e.target.value))}
            size="small"
            fullWidth
            inputMode="decimal"
          />
        </Stack>
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </LineEditDialog>
  );
}
