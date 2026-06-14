import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Link as MuiLink,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useTranslation, type TxKey } from '@/intl';
import { formatDate } from '@/lib/format';
import { DataTable } from '@/components/DataTable';
import { PurchaseOrderNodeStatus } from '@/gql/schema';
import {
  supplierByIdQueryOptions,
  supplierPurchaseOrdersQueryOptions,
  supplierContactsQueryOptions,
} from './supplierDetail.queries';
import type {
  SupplierDetailFragment,
  PurchaseOrderRowFragment,
  SupplierContactRowFragment,
} from './supplierDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/replenishment/suppliers/$nameId',
);

// PO statuses that have an existing translation key; the others fall back to the
// raw enum value so this read-only table never references a missing key.
const PO_STATUS_KEY: Partial<Record<PurchaseOrderNodeStatus, TxKey>> = {
  [PurchaseOrderNodeStatus.New]: 'status.new',
  [PurchaseOrderNodeStatus.Sent]: 'status.sent',
  [PurchaseOrderNodeStatus.Finalised]: 'status.finalised',
};

function Field({ label, value }: { label: string; value: ReactNode }) {
  // Stack the label above the value on phones (xs) and place them side by side
  // from sm up. minWidth:0 + word-break let long values (URLs, addresses) wrap
  // instead of forcing horizontal overflow on a narrow viewport.
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.25, sm: 2 }}
      sx={{ justifyContent: 'space-between', alignItems: { sm: 'baseline' } }}
    >
      <Typography color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{
          fontWeight: 500,
          minWidth: 0,
          textAlign: { sm: 'right' },
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

export function SupplierDetailPage() {
  const { storeId, nameId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...supplierByIdQueryOptions(storeId, nameId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <Typography>{t('messages.loading')}</Typography>;
  if (!data) return <Typography>{t('messages.name-not-found')}</Typography>;

  return <SupplierDetail storeId={storeId} nameId={nameId} supplier={data} />;
}

function SupplierDetail({
  storeId,
  nameId,
  supplier,
}: {
  storeId: string;
  nameId: string;
  supplier: SupplierDetailFragment;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  return (
    // minWidth:0 lets the flex children (the scrollable tables below) shrink
    // narrower than their content instead of pushing the page wide on a phone.
    <Stack spacing={2} sx={{ height: '100%', minWidth: 0 }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
      >
        {supplier.name}
      </Typography>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        <Tab label={t('label.details')} />
        <Tab label={t('label.purchase-orders')} />
        <Tab label={t('label.contacts')} />
      </Tabs>
      {tab === 0 ? <DetailsTab supplier={supplier} /> : null}
      {tab === 1 ? (
        <PurchaseOrdersTab
          storeId={storeId}
          nameId={nameId}
          supplierName={supplier.name}
        />
      ) : null}
      {tab === 2 ? <ContactsTab storeId={storeId} nameId={nameId} /> : null}
    </Stack>
  );
}

function DetailsTab({ supplier }: { supplier: SupplierDetailFragment }) {
  const { t } = useTranslation();
  const yesNo = (value: boolean) => (value ? t('messages.yes') : t('messages.no'));

  return (
    <Card sx={{ maxWidth: 560 }}>
      <CardContent>
        <Stack spacing={1} divider={<Divider flexItem />}>
          <Field label={t('label.code')} value={supplier.code} />
          <Field
            label={t('label.charge-code')}
            value={supplier.chargeCode ?? '—'}
          />
          <Field label={t('label.comment')} value={supplier.comment ?? '—'} />
          <Field label={t('label.phone')} value={supplier.phone ?? '—'} />
          <Field label={t('label.email')} value={supplier.email ?? '—'} />
          <Field label={t('label.hsh-code')} value={supplier.hshCode ?? '—'} />
          <Field label={t('label.hsh-name')} value={supplier.hshName ?? '—'} />
          <Field
            label={t('label.currency')}
            value={supplier.currency?.code ?? '—'}
          />
          <Field
            label={t('label.margin')}
            value={supplier.margin ?? '—'}
          />
          <Field
            label={t('label.freight-factor')}
            value={supplier.freightFactor ?? '—'}
          />
          <Field
            label={t('label.date-created')}
            value={formatDate(supplier.createdDatetime) || '—'}
          />
          <Field
            label={t('label.manufacturer')}
            value={yesNo(supplier.isManufacturer)}
          />
          <Field label={t('label.donor')} value={yesNo(supplier.isDonor)} />
          <Field label={t('label.on-hold')} value={yesNo(supplier.isOnHold)} />
          <Field
            label={t('label.address')}
            value={
              [supplier.address1, supplier.address2]
                .filter(Boolean)
                .join(', ') || '—'
            }
          />
          <Field label={t('label.country')} value={supplier.country ?? '—'} />
          <Field
            label={t('label.website')}
            value={
              supplier.website ? (
                <MuiLink
                  href={supplier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {supplier.website}
                </MuiLink>
              ) : (
                '—'
              )
            }
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

const poHelper = createColumnHelper<PurchaseOrderRowFragment>();

function PurchaseOrdersTab({
  storeId,
  nameId,
  supplierName,
}: {
  storeId: string;
  nameId: string;
  supplierName: string;
}) {
  const { t } = useTranslation();

  const { data } = useQuery({
    ...supplierPurchaseOrdersQueryOptions(storeId, nameId, supplierName),
    enabled: Boolean(storeId),
  });

  const columns = useMemo(
    () => [
      poHelper.accessor('number', { id: 'number', header: t('label.number') }),
      poHelper.accessor('createdDatetime', {
        id: 'createdDatetime',
        header: t('label.created'),
        cell: c => formatDate(c.getValue()),
      }),
      poHelper.accessor('confirmedDatetime', {
        id: 'confirmedDatetime',
        header: t('label.confirmed'),
        cell: c => formatDate(c.getValue()),
      }),
      poHelper.accessor('status', {
        id: 'status',
        header: t('label.status'),
        cell: c => {
          const status = c.getValue();
          const key = PO_STATUS_KEY[status];
          return key ? t(key) : status;
        },
      }),
      poHelper.accessor('targetMonths', {
        id: 'targetMonths',
        header: t('label.target-months'),
        cell: c => c.getValue() ?? '',
      }),
      poHelper.accessor(row => row.lines.totalCount, {
        id: 'lines',
        header: t('label.lines'),
      }),
      poHelper.accessor('comment', {
        id: 'comment',
        header: t('label.comment'),
        cell: c => c.getValue() ?? '',
      }),
    ],
    [t],
  );

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data && data.length === 0)
    return <EmptyTab message={t('messages.no-purchase-orders')} />;

  return <DataTable table={table} />;
}

const contactHelper = createColumnHelper<SupplierContactRowFragment>();

function ContactsTab({
  storeId,
  nameId,
}: {
  storeId: string;
  nameId: string;
}) {
  const { t } = useTranslation();

  const { data } = useQuery({
    ...supplierContactsQueryOptions(storeId, nameId),
    enabled: Boolean(storeId),
  });

  const columns = useMemo(
    () => [
      contactHelper.accessor('firstName', {
        id: 'firstName',
        header: t('label.first-name'),
      }),
      contactHelper.accessor('lastName', {
        id: 'lastName',
        header: t('label.last-name'),
      }),
      contactHelper.accessor('position', {
        id: 'position',
        header: t('label.position'),
        cell: c => c.getValue() ?? '',
      }),
      contactHelper.accessor('email', {
        id: 'email',
        header: t('label.email'),
        cell: c => c.getValue() ?? '',
      }),
      contactHelper.accessor('phone', {
        id: 'phone',
        header: t('label.phone'),
        cell: c => c.getValue() ?? '',
      }),
      contactHelper.accessor('category1', {
        id: 'category1',
        header: t('label.category-1'),
        cell: c => c.getValue() ?? '',
      }),
    ],
    [t],
  );

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data && data.length === 0)
    return <EmptyTab message={t('messages.no-contacts')} />;

  return <DataTable table={table} />;
}

function EmptyTab({ message }: { message: string }) {
  return (
    <Box sx={{ py: 4 }}>
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}
