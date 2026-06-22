import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  InvoiceNodeType,
  type InvoiceNodeStatus,
  UpdateCustomerReturnStatusInput,
} from '@/gql/schema';
import { useTranslation } from '@/intl';
import { formatCurrency } from '@/lib/format';
import { useIsPhone } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DetailHeaderBar } from '@/components/detail/DetailHeaderBar';
import { StatusBar } from '@/components/detail/StatusBar';
import { useConfirm } from '@/components/detail/useConfirm';
import { useInvoiceStatusName } from './status';
import { invoiceStatusFlow, invoiceReachedAt } from './statusFlow';
import {
  customerReturnKeys,
  customerReturnSdk,
  customerReturnQueryOptions,
} from './customerReturnDetail.queries';
import type {
  CustomerReturnDetailFragment,
  CustomerReturnLineRowFragment,
} from './customerReturnDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/distribution/customer-return/$invoiceId',
);

// Customer return advances only forward into these two statuses.
const TO_CUSTOMER_RETURN_STATUS: Partial<
  Record<InvoiceNodeStatus, UpdateCustomerReturnStatusInput>
> = {
  RECEIVED: UpdateCustomerReturnStatusInput.Received,
  VERIFIED: UpdateCustomerReturnStatusInput.Verified,
} as Partial<Record<InvoiceNodeStatus, UpdateCustomerReturnStatusInput>>;

// One stacked label/value row inside a mobile line card.
function CardRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 justify-between gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm">{value}</span>
    </div>
  );
}

// Phone equivalent of a read-only line table row: one outlined card with
// stacked label/value rows. No editable inputs (lines are read-only here).
function LineCard({ line }: { line: CustomerReturnLineRowFragment }) {
  const { t } = useTranslation();
  return (
    <div className="mb-2 rounded-md border bg-card p-3">
      <div className="flex flex-col gap-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="min-w-0 flex-1 break-words text-sm font-semibold">
            {line.item.name}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {line.item.code}
          </span>
        </div>
        {line.batch ? (
          <CardRow label={t('label.batch')} value={line.batch} />
        ) : null}
        {line.expiryDate ? (
          <CardRow label={t('label.expiry')} value={line.expiryDate} />
        ) : null}
        <CardRow label={t('label.pack-size')} value={line.packSize} />
        <CardRow label={t('label.pack-quantity')} value={line.numberOfPacks} />
        <CardRow
          label={t('label.total-quantity')}
          value={(line.packSize * line.numberOfPacks).toLocaleString()}
        />
        <CardRow
          label={t('label.price-per-pack')}
          value={formatCurrency(line.sellPricePerPack)}
        />
        <CardRow
          label={t('label.total')}
          value={formatCurrency(line.sellPricePerPack * line.numberOfPacks)}
        />
      </div>
    </div>
  );
}

export function CustomerReturnDetailPage() {
  const { storeId, invoiceId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...customerReturnQueryOptions(storeId, invoiceId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <p>{t('messages.loading')}</p>;
  if (!data) return <p>{t('messages.invoice-not-found')}</p>;

  return <CustomerReturnEditor storeId={storeId} invoice={data} />;
}

function CustomerReturnEditor({
  storeId,
  invoice,
}: {
  storeId: string;
  invoice: CustomerReturnDetailFragment;
}) {
  const { t } = useTranslation();
  const isPhone = useIsPhone();
  const queryClient = useQueryClient();
  const statusName = useInvoiceStatusName();
  const { confirm, dialog } = useConfirm();

  const flow = invoiceStatusFlow(InvoiceNodeType.CustomerReturn, {
    linked: Boolean(invoice.linkedShipment?.id),
  });
  const editable = flow.editable.includes(invoice.status);
  const lines = invoice.lines.nodes;

  // Header fields are controlled inputs; lines are read-only (the
  // generate-lines wizard is deferred), so Save only ever pushes the header.
  const [theirReference, setTheirReference] = useState(
    invoice.theirReference ?? '',
  );
  const [comment, setComment] = useState(invoice.comment ?? '');

  // Re-baseline whenever the document refetches (after a save/status change).
  useEffect(() => {
    setTheirReference(invoice.theirReference ?? '');
    setComment(invoice.comment ?? '');
  }, [invoice]);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: customerReturnKeys.detail(storeId, invoice.id),
    });

  const headerDirty =
    theirReference !== (invoice.theirReference ?? '') ||
    comment !== (invoice.comment ?? '');

  const save = useMutation({
    mutationFn: async () => {
      const res = await customerReturnSdk.updateCustomerReturn({
        storeId,
        input: { id: invoice.id, theirReference, comment },
      });
      if (res.updateCustomerReturn.__typename === 'UpdateCustomerReturnError')
        throw new Error(res.updateCustomerReturn.error.description);
    },
    onSuccess: invalidate,
    onError: e => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const advance = useMutation({
    mutationFn: async (target: InvoiceNodeStatus) => {
      const status = TO_CUSTOMER_RETURN_STATUS[target];
      const res = await customerReturnSdk.updateCustomerReturn({
        storeId,
        input: { id: invoice.id, status },
      });
      if (res.updateCustomerReturn.__typename === 'UpdateCustomerReturnError')
        throw new Error(res.updateCustomerReturn.error.description);
    },
    onSuccess: invalidate,
    onError: e => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const toggleHold = useMutation({
    mutationFn: () =>
      customerReturnSdk.updateCustomerReturn({
        storeId,
        input: { id: invoice.id, onHold: !invoice.onHold },
      }),
    onSuccess: invalidate,
  });

  const onAdvance = async (target: InvoiceNodeStatus) => {
    const ok = await confirm({
      message: t('messages.confirm-status-as', { status: statusName(target) }),
    });
    if (ok) advance.mutate(target);
  };

  const onToggleHold = async () => {
    const ok = await confirm({
      message: invoice.onHold
        ? t('messages.off-hold-confirm')
        : t('messages.on-hold-confirm'),
    });
    if (ok) toggleHold.mutate();
  };

  const summary = t('messages.line-count', {
    value: lines.length.toLocaleString(),
  });

  return (
    <div className="flex h-full flex-col gap-3">
      <DetailHeaderBar
        title={t('heading.customer-return', { number: invoice.invoiceNumber })}
        statusLabel={statusName(invoice.status)}
        summary={summary}
        onSave={() => save.mutate()}
        saveDisabled={!headerDirty || !editable}
        saving={save.isPending}
        actions={
          editable ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleHold}
              disabled={toggleHold.isPending}
            >
              {invoice.onHold ? t('button.take-off-hold') : t('button.hold')}
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="grid gap-1.5 sm:min-w-[220px]">
          <Label>{t('label.customer-name')}</Label>
          <Input value={invoice.otherPartyName} disabled />
        </div>
        <div className="grid gap-1.5 sm:min-w-[220px]">
          <Label>{t('label.customer-ref')}</Label>
          <Input
            value={theirReference}
            onChange={e => setTheirReference(e.target.value)}
            disabled={!editable}
          />
        </div>
        <div className="grid flex-1 gap-1.5">
          <Label>{t('label.comment')}</Label>
          <Input
            value={comment}
            onChange={e => setComment(e.target.value)}
            disabled={!editable}
          />
        </div>
      </div>

      {isPhone ? (
        <div className="min-h-0 flex-1 overflow-auto">
          {lines.map(line => (
            <LineCard key={line.id} line={line} />
          ))}
          {lines.length === 0 ? (
            <p className="py-4 text-muted-foreground">
              {t('messages.no-lines')}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-card">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="font-semibold">
                  {t('label.code')}
                </TableHead>
                <TableHead className="font-semibold">
                  {t('label.name')}
                </TableHead>
                <TableHead className="font-semibold">
                  {t('label.batch')}
                </TableHead>
                <TableHead className="font-semibold">
                  {t('label.expiry')}
                </TableHead>
                <TableHead className="text-right font-semibold">
                  {t('label.pack-size')}
                </TableHead>
                <TableHead className="text-right font-semibold">
                  {t('label.pack-quantity')}
                </TableHead>
                <TableHead className="text-right font-semibold">
                  {t('label.total-quantity')}
                </TableHead>
                <TableHead className="text-right font-semibold">
                  {t('label.price-per-pack')}
                </TableHead>
                <TableHead className="text-right font-semibold">
                  {t('label.total')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(line => (
                <TableRow key={line.id}>
                  <TableCell>{line.item.code}</TableCell>
                  <TableCell>{line.item.name}</TableCell>
                  <TableCell>{line.batch ?? ''}</TableCell>
                  <TableCell>{line.expiryDate ?? ''}</TableCell>
                  <TableCell className="text-right">{line.packSize}</TableCell>
                  <TableCell className="text-right">
                    {line.numberOfPacks}
                  </TableCell>
                  <TableCell className="text-right">
                    {(line.packSize * line.numberOfPacks).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.sellPricePerPack)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.sellPricePerPack * line.numberOfPacks)}
                  </TableCell>
                </TableRow>
              ))}
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <p className="py-4 text-muted-foreground">
                      {t('messages.no-lines')}
                    </p>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}

      <StatusBar
        sequence={flow.sequence}
        current={invoice.status}
        reachedAt={invoiceReachedAt(invoice)}
        label={statusName}
        nextOptions={flow.next[invoice.status] ?? []}
        onAdvance={onAdvance}
        advancing={advance.isPending}
        disabled={!editable || invoice.onHold}
      />

      {dialog}
    </div>
  );
}
