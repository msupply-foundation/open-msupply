import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  InvoiceNodeType,
  type InvoiceNodeStatus,
  UpdateSupplierReturnStatusInput,
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
  supplierReturnKeys,
  supplierReturnSdk,
  supplierReturnQueryOptions,
} from './supplierReturnDetail.queries';
import type { SupplierReturnDetailFragment } from './supplierReturnDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/replenishment/supplier-return/$invoiceId',
);

// Supplier return advances only forward into these two statuses.
const TO_SUPPLIER_RETURN_STATUS: Partial<
  Record<InvoiceNodeStatus, UpdateSupplierReturnStatusInput>
> = {
  PICKED: UpdateSupplierReturnStatusInput.Picked,
  SHIPPED: UpdateSupplierReturnStatusInput.Shipped,
} as Partial<Record<InvoiceNodeStatus, UpdateSupplierReturnStatusInput>>;

export function SupplierReturnDetailPage() {
  const { storeId, invoiceId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...supplierReturnQueryOptions(storeId, invoiceId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <p>{t('messages.loading')}</p>;
  if (!data) return <p>{t('messages.invoice-not-found')}</p>;

  return <SupplierReturnEditor storeId={storeId} invoice={data} />;
}

function SupplierReturnEditor({
  storeId,
  invoice,
}: {
  storeId: string;
  invoice: SupplierReturnDetailFragment;
}) {
  const { t } = useTranslation();
  const isPhone = useIsPhone();
  const queryClient = useQueryClient();
  const statusName = useInvoiceStatusName();
  const { confirm, dialog } = useConfirm();

  const flow = invoiceStatusFlow(InvoiceNodeType.SupplierReturn);
  const editable = flow.editable.includes(invoice.status);
  const lines = invoice.lines.nodes;

  // Header fields are controlled and feed the single Save.
  const [theirReference, setTheirReference] = useState(
    invoice.theirReference ?? '',
  );
  const [comment, setComment] = useState(invoice.comment ?? '');

  // Re-baseline the form whenever the document refetches (after a save/status change).
  useEffect(() => {
    setTheirReference(invoice.theirReference ?? '');
    setComment(invoice.comment ?? '');
  }, [invoice]);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: supplierReturnKeys.detail(storeId, invoice.id),
    });

  const headerDirty =
    theirReference !== (invoice.theirReference ?? '') ||
    comment !== (invoice.comment ?? '');

  const save = useMutation({
    mutationFn: () =>
      supplierReturnSdk.updateSupplierReturn({
        storeId,
        input: { id: invoice.id, theirReference, comment },
      }),
    onSuccess: invalidate,
    onError: e => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const advance = useMutation({
    mutationFn: (target: InvoiceNodeStatus) =>
      supplierReturnSdk.updateSupplierReturn({
        storeId,
        input: { id: invoice.id, status: TO_SUPPLIER_RETURN_STATUS[target] },
      }),
    onSuccess: invalidate,
    onError: e => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const toggleHold = useMutation({
    mutationFn: () =>
      supplierReturnSdk.updateSupplierReturn({
        storeId,
        input: { id: invoice.id, onHold: !invoice.onHold },
      }),
    onSuccess: invalidate,
  });

  const onSave = () => save.mutate();

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

  const summary = [
    t('messages.line-count', { value: lines.length.toLocaleString() }),
    headerDirty ? t('messages.edited-count', { value: 1 }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex h-full flex-col gap-3">
      <DetailHeaderBar
        title={t('heading.supplier-return', { number: invoice.invoiceNumber })}
        statusLabel={statusName(invoice.status)}
        summary={summary}
        onSave={onSave}
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
          <Label>{t('label.supplier-name')}</Label>
          <Input value={invoice.otherPartyName} disabled />
        </div>
        <div className="grid gap-1.5 sm:min-w-[220px]">
          <Label>{t('label.supplier-ref')}</Label>
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
        // Phone: stack each read-only line as a card so the page never scrolls
        // horizontally. The sm+ table below stays unchanged.
        <div className="min-h-0 flex-1 overflow-auto">
          {lines.map(line => (
            <SupplierReturnLineCard key={line.id} line={line} />
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
                <TableHead className="font-semibold">
                  {t('label.pack-size')}
                </TableHead>
                <TableHead className="font-semibold">
                  {t('label.pack-quantity')}
                </TableHead>
                <TableHead className="font-semibold">
                  {t('label.cost-per-pack')}
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
                  <TableCell>{line.packSize}</TableCell>
                  <TableCell>{line.numberOfPacks}</TableCell>
                  <TableCell>{formatCurrency(line.costPricePerPack)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.costPricePerPack * line.numberOfPacks)}
                  </TableCell>
                </TableRow>
              ))}
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
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

// Phone-only stacked label/value row inside a line card.
function CardRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm">{value}</span>
    </div>
  );
}

// Read-only line rendered as a card on phones (no horizontal scroll). Mirrors
// the desktop table columns.
function SupplierReturnLineCard({
  line,
}: {
  line: SupplierReturnDetailFragment['lines']['nodes'][number];
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-2 rounded-md border bg-card p-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="min-w-0 flex-1 break-words text-sm font-semibold">
            {line.item.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {line.item.code}
          </span>
        </div>
        <CardRow label={t('label.batch')} value={line.batch ?? ''} />
        <CardRow label={t('label.expiry')} value={line.expiryDate ?? ''} />
        <CardRow label={t('label.pack-size')} value={line.packSize} />
        <CardRow label={t('label.pack-quantity')} value={line.numberOfPacks} />
        <CardRow
          label={t('label.cost-per-pack')}
          value={formatCurrency(line.costPricePerPack)}
        />
        <CardRow
          label={t('label.total')}
          value={formatCurrency(line.costPricePerPack * line.numberOfPacks)}
        />
      </div>
    </div>
  );
}
