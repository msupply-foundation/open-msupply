import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm, type UseFormRegister } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import {
  InvoiceNodeType,
  type InvoiceNodeStatus,
  UpdateOutboundShipmentStatusInput,
} from '@/gql/schema';
import { useTranslation } from '@/intl';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIsPhone } from '@/hooks/useMediaQuery';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DetailHeaderBar } from '@/components/detail/DetailHeaderBar';
import { StatusBar } from '@/components/detail/StatusBar';
import { LineEditDialog } from '@/components/detail/LineEditDialog';
import { ItemSearchInput } from '@/components/detail/ItemSearchInput';
import { useConfirm } from '@/components/detail/useConfirm';
import {
  inputStyle,
  makeNonNegativeValidator,
  numericField,
  sanitizeNumeric,
} from '@/components/detail/inputs';
import type { ItemOptionFragment } from '@/features/items/items.generated';
import type { StockLineRowFragment } from '@/features/stock/stock.generated';
import { useInvoiceStatusName } from './status';
import { invoiceStatusFlow, invoiceReachedAt } from './statusFlow';
import {
  availableStockLinesQueryOptions,
  outboundKeys,
  outboundSdk,
  outboundShipmentQueryOptions,
} from './outboundDetail.queries';
import type {
  OutboundDetailFragment,
  OutboundLineRowFragment,
} from './outboundDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/distribution/outbound-shipment/$invoiceId',
);

// Outbound advances only forward into these three statuses.
const TO_OUTBOUND_STATUS: Partial<
  Record<InvoiceNodeStatus, UpdateOutboundShipmentStatusInput>
> = {
  ALLOCATED: UpdateOutboundShipmentStatusInput.Allocated,
  PICKED: UpdateOutboundShipmentStatusInput.Picked,
  SHIPPED: UpdateOutboundShipmentStatusInput.Shipped,
} as Partial<Record<InvoiceNodeStatus, UpdateOutboundShipmentStatusInput>>;

export function OutboundShipmentDetailPage() {
  const { storeId, invoiceId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...outboundShipmentQueryOptions(storeId, invoiceId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <p>{t('messages.loading')}</p>;
  if (!data) return <p>{t('messages.invoice-not-found')}</p>;

  return <OutboundEditor storeId={storeId} invoice={data} />;
}

interface LineForm {
  numberOfPacks: string;
}
interface FormValues {
  lines: Record<string, LineForm>;
}

const toLineForm = (l: OutboundLineRowFragment): LineForm => ({
  numberOfPacks: l.numberOfPacks?.toString() ?? '',
});

function OutboundEditor({
  storeId,
  invoice,
}: {
  storeId: string;
  invoice: OutboundDetailFragment;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusName = useInvoiceStatusName();
  const { confirm, dialog } = useConfirm();
  const isPhone = useIsPhone();

  const flow = invoiceStatusFlow(InvoiceNodeType.OutboundShipment);
  const editable = flow.editable.includes(invoice.status);
  const lines = invoice.lines.nodes;
  const linesById = useMemo(() => new Map(lines.map(l => [l.id, l])), [lines]);

  const defaultValues = useMemo<FormValues>(
    () => ({
      lines: Object.fromEntries(lines.map(l => [l.id, toLineForm(l)])),
    }),
    [lines],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { dirtyFields, isDirty, errors },
  } = useForm<FormValues>({ defaultValues, mode: 'onChange' });

  // Header fields are controlled and tracked separately from the line grid;
  // both feed the single Save.
  const [theirReference, setTheirReference] = useState(
    invoice.theirReference ?? '',
  );
  const [comment, setComment] = useState(invoice.comment ?? '');
  const [addOpen, setAddOpen] = useState(false);

  // Re-baseline the form whenever the document refetches (after a save/status change).
  useEffect(() => {
    reset(defaultValues);
    setTheirReference(invoice.theirReference ?? '');
    setComment(invoice.comment ?? '');
  }, [invoice, defaultValues, reset]);

  const numeric = useMemo(
    () => ({ validate: makeNonNegativeValidator(t) }),
    [t],
  );

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: outboundKeys.detail(storeId, invoice.id),
    });

  const headerDirty =
    theirReference !== (invoice.theirReference ?? '') ||
    comment !== (invoice.comment ?? '');

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const messages = new Set<string>();

      if (headerDirty) {
        const res = await outboundSdk.updateOutbound({
          storeId,
          input: { id: invoice.id, theirReference, comment },
        });
        const r = res.updateOutboundShipment;
        if (
          r.__typename === 'UpdateOutboundShipmentError' ||
          r.__typename === 'NodeError'
        )
          messages.add(r.error.description);
      }

      const dirtyLines = dirtyFields.lines ?? {};
      await Promise.all(
        Object.keys(dirtyLines).map(async id => {
          const d = dirtyLines[id];
          const f = values.lines[id];
          if (!d || !f || !linesById.has(id)) return;
          if (!d.numberOfPacks || f.numberOfPacks === '') return;
          const res = await outboundSdk.updateOutboundLine({
            storeId,
            input: { id, numberOfPacks: Number(f.numberOfPacks) },
          });
          if (
            res.updateOutboundShipmentLine.__typename ===
            'UpdateOutboundShipmentLineError'
          )
            messages.add(res.updateOutboundShipmentLine.error.description);
        }),
      );

      return [...messages];
    },
    onSuccess: errs => {
      invalidate();
      if (errs.length) toast.error(errs.join(' '));
    },
  });

  const advance = useMutation({
    mutationFn: async (target: InvoiceNodeStatus) => {
      const status = TO_OUTBOUND_STATUS[target];
      const res = await outboundSdk.updateOutbound({
        storeId,
        input: { id: invoice.id, status },
      });
      const r = res.updateOutboundShipment;
      if (
        r.__typename === 'UpdateOutboundShipmentError' ||
        r.__typename === 'NodeError'
      )
        throw new Error(r.error.description);
    },
    onSuccess: invalidate,
    onError: e => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const toggleHold = useMutation({
    mutationFn: () =>
      outboundSdk.updateOutbound({
        storeId,
        input: { id: invoice.id, onHold: !invoice.onHold },
      }),
    onSuccess: invalidate,
  });

  const deleteLine = useMutation({
    mutationFn: (id: string) =>
      outboundSdk.deleteOutboundLine({ storeId, input: { id } }),
    onSuccess: invalidate,
  });

  const onSave = handleSubmit(values => save.mutate(values));

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

  const onDeleteLine = async (line: OutboundLineRowFragment) => {
    const ok = await confirm({ message: t('messages.confirm-delete-line') });
    if (ok) deleteLine.mutate(line.id);
  };

  const dirtyLineCount = Object.keys(dirtyFields.lines ?? {}).length;
  const errorCount = useMemo(
    () =>
      Object.values(errors.lines ?? {}).filter(e => e && Object.keys(e).length)
        .length,
    [errors.lines],
  );
  const summary = [
    t('messages.line-count', { value: lines.length.toLocaleString() }),
    dirtyLineCount || headerDirty
      ? t('messages.edited-count', {
          value: dirtyLineCount + (headerDirty ? 1 : 0),
        })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex h-full flex-col gap-3">
      <DetailHeaderBar
        title={t('heading.outbound-shipment', {
          number: invoice.invoiceNumber,
        })}
        statusLabel={statusName(invoice.status)}
        summary={summary}
        onSave={onSave}
        saveDisabled={(!isDirty && !headerDirty) || errorCount > 0 || !editable}
        saving={save.isPending}
        actions={
          editable ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleHold}
                disabled={toggleHold.isPending}
              >
                {invoice.onHold ? t('button.take-off-hold') : t('button.hold')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddOpen(true)}
              >
                <PlusIcon />
                {t('button.add-item')}
              </Button>
            </>
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
            <OutboundLineCard
              key={line.id}
              line={line}
              editable={editable}
              invalid={Boolean(errors.lines?.[line.id]?.numberOfPacks)}
              register={register}
              onDelete={() => onDeleteLine(line)}
            />
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
                  {t('label.price-per-pack')}
                </TableHead>
                <TableHead className="text-right font-semibold">
                  {t('label.total')}
                </TableHead>
                {editable ? <TableHead className="w-px" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(line => {
                const lineErr = errors.lines?.[line.id];
                return (
                  <TableRow key={line.id}>
                    <TableCell>{line.item.code}</TableCell>
                    <TableCell>{line.item.name}</TableCell>
                    <TableCell>{line.batch ?? ''}</TableCell>
                    <TableCell>{line.expiryDate ?? ''}</TableCell>
                    <TableCell>{line.packSize}</TableCell>
                    <TableCell className="w-[90px]">
                      {editable ? (
                        <input
                          style={inputStyle(Boolean(lineErr?.numberOfPacks))}
                          {...numericField(
                            register(`lines.${line.id}.numberOfPacks`, numeric),
                          )}
                        />
                      ) : (
                        line.numberOfPacks
                      )}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(line.sellPricePerPack)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        line.sellPricePerPack * line.numberOfPacks,
                      )}
                    </TableCell>
                    {editable ? (
                      <TableCell className="w-px">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => onDeleteLine(line)}
                              aria-label={t('button.delete')}
                            >
                              <Trash2Icon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('button.delete')}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
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

      <AddOutboundLineDialog
        open={addOpen}
        storeId={storeId}
        invoiceId={invoice.id}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAddOpen(false);
          invalidate();
        }}
      />

      {dialog}
    </div>
  );
}

function CardRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// Phone layout for a single outbound line: a stacked card replacing the table
// row. Mirrors the desktop columns (read-only details + the one editable
// numberOfPacks input + delete) but flows vertically so a 390px viewport never
// overflows horizontally.
function OutboundLineCard({
  line,
  editable,
  invalid,
  register,
  onDelete,
}: {
  line: OutboundLineRowFragment;
  editable: boolean;
  invalid: boolean;
  register: UseFormRegister<FormValues>;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const numeric = useMemo(
    () => ({ validate: makeNonNegativeValidator(t) }),
    [t],
  );
  return (
    <div className="mb-2 rounded-md border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold">{line.item.name}</span>
          <span className="block text-xs text-muted-foreground">
            {line.item.code}
          </span>
        </div>
        {editable ? (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onDelete}
            aria-label={t('button.delete')}
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <CardRow label={t('label.batch')}>
          <span className="text-sm">{line.batch ?? '—'}</span>
        </CardRow>
        <CardRow label={t('label.expiry')}>
          <span className="text-sm">{line.expiryDate ?? '—'}</span>
        </CardRow>
        <CardRow label={t('label.pack-size')}>
          <span className="text-sm">{line.packSize}</span>
        </CardRow>
        <CardRow label={t('label.pack-quantity')}>
          {editable ? (
            <input
              style={inputStyle(invalid)}
              {...numericField(
                register(`lines.${line.id}.numberOfPacks`, numeric),
              )}
            />
          ) : (
            <span className="text-sm">{line.numberOfPacks}</span>
          )}
        </CardRow>
        <CardRow label={t('label.price-per-pack')}>
          <span className="text-sm">
            {formatCurrency(line.sellPricePerPack)}
          </span>
        </CardRow>
        <CardRow label={t('label.total')}>
          <span className="text-sm">
            {formatCurrency(line.sellPricePerPack * line.numberOfPacks)}
          </span>
        </CardRow>
      </div>
    </div>
  );
}

const NONE = 'none';

// Add an outbound line: pick an item, then a specific available batch (stock
// line), then the number of packs to issue (capped at what's available). This
// is a single-batch manual allocation — the full FEFO auto-allocation engine
// is still deferred.
function AddOutboundLineDialog({
  open,
  storeId,
  invoiceId,
  onClose,
  onAdded,
}: {
  open: boolean;
  storeId: string;
  invoiceId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { t } = useTranslation();
  const [item, setItem] = useState<ItemOptionFragment | null>(null);
  const [stockLineId, setStockLineId] = useState('');
  const [numberOfPacks, setNumberOfPacks] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setItem(null);
      setStockLineId('');
      setNumberOfPacks('');
      setError(null);
    }
  }, [open]);

  const { data: stockLines = [], isFetching } = useQuery({
    ...availableStockLinesQueryOptions(storeId, item?.id ?? ''),
    enabled: open && Boolean(item?.id),
  });

  const selected: StockLineRowFragment | null =
    stockLines.find(s => s.id === stockLineId) ?? null;
  const maxPacks = selected?.availableNumberOfPacks ?? 0;
  const packs = Number(numberOfPacks);
  const valid = Boolean(selected) && packs > 0 && packs <= maxPacks;

  const insert = useMutation({
    mutationFn: async () => {
      const res = await outboundSdk.insertOutboundLine({
        storeId,
        input: {
          id: crypto.randomUUID(),
          invoiceId,
          stockLineId,
          numberOfPacks: packs,
        },
      });
      if (
        res.insertOutboundShipmentLine.__typename ===
        'InsertOutboundShipmentLineError'
      )
        throw new Error(res.insertOutboundShipmentLine.error.description);
    },
    onSuccess: onAdded,
    onError: e => setError(e instanceof Error ? e.message : String(e)),
  });

  return (
    <LineEditDialog
      open={open}
      title={t('heading.add-item')}
      onClose={onClose}
      onOk={() => insert.mutate()}
      okDisabled={!valid}
      saving={insert.isPending}
    >
      <div className="flex flex-col gap-4 pt-1">
        <ItemSearchInput
          storeId={storeId}
          value={item}
          onChange={v => {
            setItem(v);
            setStockLineId('');
            setNumberOfPacks('');
          }}
          autoFocus
        />
        {item ? (
          <div className="grid gap-1.5">
            <Label>{t('label.batch')}</Label>
            <Select
              value={stockLineId === '' ? NONE : stockLineId}
              onValueChange={v => setStockLineId(v === NONE ? '' : v)}
              disabled={isFetching || stockLines.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stockLines.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {(s.batch || '—') +
                      ` · ${t('label.expiry')} ${formatDate(s.expiryDate) || '—'}` +
                      ` · ${s.availableNumberOfPacks} ${t('label.available-packs')}` +
                      ` · ${t('label.pack-size')} ${s.packSize}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {item && !isFetching && stockLines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('messages.no-results')}
          </p>
        ) : null}
        {selected ? (
          <div className="grid gap-1.5">
            <Label>{t('label.pack-quantity')}</Label>
            <Input
              value={numberOfPacks}
              onChange={e => setNumberOfPacks(sanitizeNumeric(e.target.value))}
              inputMode="decimal"
              aria-invalid={packs > maxPacks}
            />
            <span className="text-xs text-muted-foreground">
              {`${t('label.available-packs')}: ${maxPacks}`}
            </span>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </LineEditDialog>
  );
}
