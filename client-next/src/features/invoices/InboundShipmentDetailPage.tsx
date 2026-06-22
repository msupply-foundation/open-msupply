import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import {
  InvoiceNodeType,
  type InvoiceNodeStatus,
  UpdateInboundShipmentStatusInput,
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
  INPUT_BASE,
  inputStyle,
  makeNonNegativeValidator,
  numericField,
  sanitizeNumeric,
} from '@/components/detail/inputs';
import type { ItemOptionFragment } from '@/features/items/items.generated';
import { useInvoiceStatusName } from './status';
import { invoiceStatusFlow, invoiceReachedAt } from './statusFlow';
import {
  inboundKeys,
  inboundSdk,
  inboundShipmentQueryOptions,
} from './inboundDetail.queries';
import type {
  InboundDetailFragment,
  InboundLineRowFragment,
} from './inboundDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/replenishment/inbound-shipment/$invoiceId',
);

// Inbound advances only forward into these three statuses.
const TO_INBOUND_STATUS: Partial<
  Record<InvoiceNodeStatus, UpdateInboundShipmentStatusInput>
> = {
  DELIVERED: UpdateInboundShipmentStatusInput.Delivered,
  RECEIVED: UpdateInboundShipmentStatusInput.Received,
  VERIFIED: UpdateInboundShipmentStatusInput.Verified,
} as Partial<Record<InvoiceNodeStatus, UpdateInboundShipmentStatusInput>>;

export function InboundShipmentDetailPage() {
  const { storeId, invoiceId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...inboundShipmentQueryOptions(storeId, invoiceId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <p>{t('messages.loading')}</p>;
  if (!data) return <p>{t('messages.invoice-not-found')}</p>;

  return <InboundEditor storeId={storeId} invoice={data} />;
}

interface LineForm {
  batch: string;
  expiry: string;
  manufactureDate: string;
  packSize: string;
  numberOfPacks: string;
  cost: string;
  sell: string;
  note: string;
}
interface FormValues {
  lines: Record<string, LineForm>;
}

const toLineForm = (l: InboundLineRowFragment): LineForm => ({
  batch: l.batch ?? '',
  expiry: l.expiryDate ?? '',
  manufactureDate: l.manufactureDate ?? '',
  packSize: l.packSize?.toString() ?? '',
  numberOfPacks: l.numberOfPacks?.toString() ?? '',
  cost: l.costPricePerPack?.toString() ?? '',
  sell: l.sellPricePerPack?.toString() ?? '',
  note: l.note ?? '',
});

function InboundEditor({
  storeId,
  invoice,
}: {
  storeId: string;
  invoice: InboundDetailFragment;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusName = useInvoiceStatusName();
  const { confirm, dialog } = useConfirm();
  const isPhone = useIsPhone();

  const flow = invoiceStatusFlow(InvoiceNodeType.InboundShipment);
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
      queryKey: inboundKeys.detail(storeId, invoice.id),
    });

  const headerDirty =
    theirReference !== (invoice.theirReference ?? '') ||
    comment !== (invoice.comment ?? '');

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const messages = new Set<string>();

      if (headerDirty) {
        const res = await inboundSdk.updateInbound({
          storeId,
          input: { id: invoice.id, theirReference, comment },
        });
        if (
          res.updateInboundShipment.__typename === 'UpdateInboundShipmentError'
        )
          messages.add(res.updateInboundShipment.error.description);
      }

      const dirtyLines = dirtyFields.lines ?? {};
      await Promise.all(
        Object.keys(dirtyLines).map(async id => {
          const d = dirtyLines[id];
          const f = values.lines[id];
          if (!d || !f || !linesById.has(id)) return;
          const res = await inboundSdk.updateInboundLine({
            storeId,
            input: {
              id,
              ...(d.batch ? { batch: f.batch } : {}),
              ...(d.expiry
                ? { expiryDate: { value: f.expiry === '' ? null : f.expiry } }
                : {}),
              ...(d.manufactureDate
                ? {
                    manufactureDate: {
                      value:
                        f.manufactureDate === '' ? null : f.manufactureDate,
                    },
                  }
                : {}),
              ...(d.packSize && f.packSize !== ''
                ? { packSize: Number(f.packSize) }
                : {}),
              ...(d.numberOfPacks && f.numberOfPacks !== ''
                ? { numberOfPacks: Number(f.numberOfPacks) }
                : {}),
              ...(d.cost && f.cost !== ''
                ? { costPricePerPack: Number(f.cost) }
                : {}),
              ...(d.sell && f.sell !== ''
                ? { sellPricePerPack: Number(f.sell) }
                : {}),
              ...(d.note
                ? { note: { value: f.note === '' ? null : f.note } }
                : {}),
            },
          });
          if (
            res.updateInboundShipmentLine.__typename ===
            'UpdateInboundShipmentLineError'
          )
            messages.add(res.updateInboundShipmentLine.error.description);
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
      const status = TO_INBOUND_STATUS[target];
      const res = await inboundSdk.updateInbound({
        storeId,
        input: { id: invoice.id, status },
      });
      if (res.updateInboundShipment.__typename === 'UpdateInboundShipmentError')
        throw new Error(res.updateInboundShipment.error.description);
    },
    onSuccess: invalidate,
    onError: e => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const toggleHold = useMutation({
    mutationFn: () =>
      inboundSdk.updateInbound({
        storeId,
        input: { id: invoice.id, onHold: !invoice.onHold },
      }),
    onSuccess: invalidate,
  });

  const deleteLine = useMutation({
    mutationFn: (id: string) =>
      inboundSdk.deleteInboundLine({ storeId, input: { id } }),
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

  const onDeleteLine = async (line: InboundLineRowFragment) => {
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

  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex h-full flex-col gap-3">
      <DetailHeaderBar
        title={t('heading.inbound-shipment', { number: invoice.invoiceNumber })}
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
        <div className="min-h-0 flex-1 overflow-auto">
          {lines.map(line => (
            <InboundLineCard
              key={line.id}
              line={line}
              editable={editable}
              register={register}
              numeric={numeric}
              errors={errors}
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
                  {t('label.manufacture-date')}
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
                <TableHead className="font-semibold">
                  {t('label.sell-price-per-pack')}
                </TableHead>
                <TableHead className="font-semibold">
                  {t('label.comment')}
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
                    <TableCell className="w-[120px]">
                      {editable ? (
                        <input
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.batch`)}
                        />
                      ) : (
                        (line.batch ?? '')
                      )}
                    </TableCell>
                    <TableCell className="w-[150px]">
                      {editable ? (
                        <input
                          type="date"
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.expiry`)}
                        />
                      ) : (
                        (line.expiryDate ?? '')
                      )}
                    </TableCell>
                    <TableCell className="w-[150px]">
                      {editable ? (
                        <input
                          type="date"
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.manufactureDate`)}
                        />
                      ) : (
                        (line.manufactureDate ?? '')
                      )}
                    </TableCell>
                    <TableCell className="w-[90px]">
                      {editable ? (
                        <input
                          style={inputStyle(Boolean(lineErr?.packSize))}
                          {...numericField(
                            register(`lines.${line.id}.packSize`, numeric),
                          )}
                        />
                      ) : (
                        line.packSize
                      )}
                    </TableCell>
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
                    <TableCell className="w-[100px]">
                      {editable ? (
                        <input
                          style={inputStyle(Boolean(lineErr?.cost))}
                          {...numericField(
                            register(`lines.${line.id}.cost`, numeric),
                          )}
                        />
                      ) : (
                        formatCurrency(line.costPricePerPack)
                      )}
                    </TableCell>
                    <TableCell className="w-[100px]">
                      {editable ? (
                        <input
                          style={inputStyle(Boolean(lineErr?.sell))}
                          {...numericField(
                            register(`lines.${line.id}.sell`, numeric),
                          )}
                        />
                      ) : (
                        formatCurrency(line.sellPricePerPack)
                      )}
                    </TableCell>
                    <TableCell className="w-[140px]">
                      {editable ? (
                        <input
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.note`)}
                        />
                      ) : (
                        (line.note ?? '')
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        line.costPricePerPack * line.numberOfPacks,
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
                  <TableCell colSpan={12}>
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

      <AddInboundLineDialog
        open={addOpen}
        storeId={storeId}
        invoiceId={invoice.id}
        existingItemIds={lines.map(l => l.itemId)}
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

function CardField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// Phone layout for a single line: a stacked card replacing the desktop table
// row. Mirrors the same react-hook-form registrations so edits feed one Save.
function InboundLineCard({
  line,
  editable,
  register,
  numeric,
  errors,
  onDelete,
}: {
  line: InboundLineRowFragment;
  editable: boolean;
  register: UseFormRegister<FormValues>;
  numeric: { validate: (raw: string) => true | string };
  errors: FieldErrors<FormValues>;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const lineErr = errors.lines?.[line.id];
  return (
    <div className="mb-2 rounded-md border bg-card p-3">
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 text-sm font-semibold">
          {line.item.name}
        </span>
        <span className="text-xs text-muted-foreground">{line.item.code}</span>
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
        <CardField label={t('label.batch')}>
          {editable ? (
            <input style={INPUT_BASE} {...register(`lines.${line.id}.batch`)} />
          ) : (
            <span className="text-sm">{line.batch ?? ''}</span>
          )}
        </CardField>
        <CardField label={t('label.expiry')}>
          {editable ? (
            <input
              type="date"
              style={INPUT_BASE}
              {...register(`lines.${line.id}.expiry`)}
            />
          ) : (
            <span className="text-sm">{line.expiryDate ?? ''}</span>
          )}
        </CardField>
        <CardField label={t('label.manufacture-date')}>
          {editable ? (
            <input
              type="date"
              style={INPUT_BASE}
              {...register(`lines.${line.id}.manufactureDate`)}
            />
          ) : (
            <span className="text-sm">{line.manufactureDate ?? ''}</span>
          )}
        </CardField>
        <CardField label={t('label.pack-size')}>
          {editable ? (
            <input
              style={inputStyle(Boolean(lineErr?.packSize))}
              {...numericField(register(`lines.${line.id}.packSize`, numeric))}
            />
          ) : (
            <span className="text-sm">{line.packSize}</span>
          )}
        </CardField>
        <CardField label={t('label.pack-quantity')}>
          {editable ? (
            <input
              style={inputStyle(Boolean(lineErr?.numberOfPacks))}
              {...numericField(
                register(`lines.${line.id}.numberOfPacks`, numeric),
              )}
            />
          ) : (
            <span className="text-sm">{line.numberOfPacks}</span>
          )}
        </CardField>
        <CardField label={t('label.cost-per-pack')}>
          {editable ? (
            <input
              style={inputStyle(Boolean(lineErr?.cost))}
              {...numericField(register(`lines.${line.id}.cost`, numeric))}
            />
          ) : (
            <span className="text-sm">
              {formatCurrency(line.costPricePerPack)}
            </span>
          )}
        </CardField>
        <CardField label={t('label.sell-price-per-pack')}>
          {editable ? (
            <input
              style={inputStyle(Boolean(lineErr?.sell))}
              {...numericField(register(`lines.${line.id}.sell`, numeric))}
            />
          ) : (
            <span className="text-sm">
              {formatCurrency(line.sellPricePerPack)}
            </span>
          )}
        </CardField>
        <CardField label={t('label.total')}>
          <span className="text-sm">
            {formatCurrency(line.costPricePerPack * line.numberOfPacks)}
          </span>
        </CardField>
      </div>
      <div className="mt-2">
        <CardField label={t('label.comment')}>
          {editable ? (
            <input style={INPUT_BASE} {...register(`lines.${line.id}.note`)} />
          ) : (
            <span className="text-sm">{line.note ?? ''}</span>
          )}
        </CardField>
      </div>
    </div>
  );
}

function AddInboundLineDialog({
  open,
  storeId,
  invoiceId,
  existingItemIds,
  onClose,
  onAdded,
}: {
  open: boolean;
  storeId: string;
  invoiceId: string;
  existingItemIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const { t } = useTranslation();
  const [item, setItem] = useState<ItemOptionFragment | null>(null);
  const [batch, setBatch] = useState('');
  const [expiry, setExpiry] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [packSize, setPackSize] = useState('1');
  const [numberOfPacks, setNumberOfPacks] = useState('0');
  const [cost, setCost] = useState('0');
  const [sell, setSell] = useState('0');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setItem(null);
      setBatch('');
      setExpiry('');
      setManufactureDate('');
      setPackSize('1');
      setNumberOfPacks('0');
      setCost('0');
      setSell('0');
      setNote('');
      setError(null);
    }
  }, [open]);

  const insert = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const res = await inboundSdk.insertInboundLine({
        storeId,
        input: {
          id: crypto.randomUUID(),
          invoiceId,
          itemId: item.id,
          packSize: Number(packSize) || 1,
          numberOfPacks: Number(numberOfPacks) || 0,
          costPricePerPack: Number(cost) || 0,
          sellPricePerPack: Number(sell) || 0,
          batch: batch || null,
          expiryDate: expiry || null,
          manufactureDate: manufactureDate || null,
          note: note || null,
        },
      });
      if (
        res.insertInboundShipmentLine.__typename ===
        'InsertInboundShipmentLineError'
      )
        throw new Error(res.insertInboundShipmentLine.error.description);
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
      okDisabled={!item || Number(packSize) < 1}
      saving={insert.isPending}
    >
      <div className="flex flex-col gap-4 pt-1">
        <ItemSearchInput
          storeId={storeId}
          value={item}
          onChange={setItem}
          excludeItemIds={existingItemIds}
          autoFocus
        />
        <div className="flex gap-4">
          <div className="grid flex-1 gap-1.5">
            <Label>{t('label.batch')}</Label>
            <Input value={batch} onChange={e => setBatch(e.target.value)} />
          </div>
          <div className="grid flex-1 gap-1.5">
            <Label>{t('label.expiry')}</Label>
            <Input
              type="date"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
            />
          </div>
          <div className="grid flex-1 gap-1.5">
            <Label>{t('label.manufacture-date')}</Label>
            <Input
              type="date"
              value={manufactureDate}
              onChange={e => setManufactureDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="grid flex-1 gap-1.5">
            <Label>{t('label.pack-size')}</Label>
            <Input
              inputMode="decimal"
              value={packSize}
              onChange={e => setPackSize(sanitizeNumeric(e.target.value))}
            />
          </div>
          <div className="grid flex-1 gap-1.5">
            <Label>{t('label.pack-quantity')}</Label>
            <Input
              inputMode="decimal"
              value={numberOfPacks}
              onChange={e => setNumberOfPacks(sanitizeNumeric(e.target.value))}
            />
          </div>
          <div className="grid flex-1 gap-1.5">
            <Label>{t('label.cost-per-pack')}</Label>
            <Input
              inputMode="decimal"
              value={cost}
              onChange={e => setCost(sanitizeNumeric(e.target.value))}
            />
          </div>
          <div className="grid flex-1 gap-1.5">
            <Label>{t('label.sell-price-per-pack')}</Label>
            <Input
              inputMode="decimal"
              value={sell}
              onChange={e => setSell(sanitizeNumeric(e.target.value))}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>{t('label.comment')}</Label>
          <Input value={note} onChange={e => setNote(e.target.value)} />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </LineEditDialog>
  );
}
