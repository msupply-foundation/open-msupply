import { Fragment, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useTranslation, type TxKey } from '@/intl';
import { formatDate } from '@/lib/format';
import { DataTable } from '@/components/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  // from sm up. min-w-0 + word-break let long values (URLs, addresses) wrap
  // instead of forcing horizontal overflow on a narrow viewport.
  return (
    <div className="flex flex-col justify-between gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 font-medium [overflow-wrap:anywhere] sm:text-right">
        {value}
      </div>
    </div>
  );
}

export function SupplierDetailPage() {
  const { storeId, nameId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...supplierByIdQueryOptions(storeId, nameId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <p>{t('messages.loading')}</p>;
  if (!data) return <p>{t('messages.name-not-found')}</p>;

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

  return (
    // min-w-0 lets the flex children (the scrollable tables below) shrink
    // narrower than their content instead of pushing the page wide on a phone.
    <div className="flex h-full min-w-0 flex-col gap-4">
      <h1 className="text-xl font-bold [overflow-wrap:anywhere]">
        {supplier.name}
      </h1>
      <Tabs
        defaultValue="details"
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <TabsList>
          <TabsTrigger value="details">{t('label.details')}</TabsTrigger>
          <TabsTrigger value="purchase-orders">
            {t('label.purchase-orders')}
          </TabsTrigger>
          <TabsTrigger value="contacts">{t('label.contacts')}</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <DetailsTab supplier={supplier} />
        </TabsContent>
        <TabsContent value="purchase-orders" className="flex min-h-0 flex-col">
          <PurchaseOrdersTab
            storeId={storeId}
            nameId={nameId}
            supplierName={supplier.name}
          />
        </TabsContent>
        <TabsContent value="contacts" className="flex min-h-0 flex-col">
          <ContactsTab storeId={storeId} nameId={nameId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailsTab({ supplier }: { supplier: SupplierDetailFragment }) {
  const { t } = useTranslation();
  const yesNo = (value: boolean) =>
    value ? t('messages.yes') : t('messages.no');

  const fields: { label: string; value: ReactNode }[] = [
    { label: t('label.code'), value: supplier.code },
    { label: t('label.charge-code'), value: supplier.chargeCode ?? '—' },
    { label: t('label.comment'), value: supplier.comment ?? '—' },
    { label: t('label.phone'), value: supplier.phone ?? '—' },
    { label: t('label.email'), value: supplier.email ?? '—' },
    { label: t('label.hsh-code'), value: supplier.hshCode ?? '—' },
    { label: t('label.hsh-name'), value: supplier.hshName ?? '—' },
    { label: t('label.currency'), value: supplier.currency?.code ?? '—' },
    { label: t('label.margin'), value: supplier.margin ?? '—' },
    { label: t('label.freight-factor'), value: supplier.freightFactor ?? '—' },
    {
      label: t('label.date-created'),
      value: formatDate(supplier.createdDatetime) || '—',
    },
    { label: t('label.manufacturer'), value: yesNo(supplier.isManufacturer) },
    { label: t('label.donor'), value: yesNo(supplier.isDonor) },
    { label: t('label.on-hold'), value: yesNo(supplier.isOnHold) },
    {
      label: t('label.address'),
      value:
        [supplier.address1, supplier.address2].filter(Boolean).join(', ') ||
        '—',
    },
    { label: t('label.country'), value: supplier.country ?? '—' },
    {
      label: t('label.website'),
      value: supplier.website ? (
        <a
          className="text-primary underline-offset-4 hover:underline"
          href={supplier.website}
          target="_blank"
          rel="noopener noreferrer"
        >
          {supplier.website}
        </a>
      ) : (
        '—'
      ),
    },
  ];

  return (
    <Card className="max-w-[560px]">
      <CardContent>
        <div className="flex flex-col gap-2">
          {fields.map((field, i) => (
            <Fragment key={field.label}>
              {i > 0 ? <Separator /> : null}
              <Field label={field.label} value={field.value} />
            </Fragment>
          ))}
        </div>
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

function ContactsTab({ storeId, nameId }: { storeId: string; nameId: string }) {
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
    <div className="py-4">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
