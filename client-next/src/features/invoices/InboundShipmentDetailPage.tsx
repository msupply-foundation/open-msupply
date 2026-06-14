import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Snackbar,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  InvoiceNodeType,
  type InvoiceNodeStatus,
  UpdateInboundShipmentStatusInput,
} from '@/gql/schema';
import { useTranslation } from '@/intl';
import { formatCurrency } from '@/lib/format';
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

  if (isLoading) return <Typography>{t('messages.loading')}</Typography>;
  if (!data) return <Typography>{t('messages.invoice-not-found')}</Typography>;

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
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));

  const flow = invoiceStatusFlow(InvoiceNodeType.InboundShipment);
  const editable = flow.editable.includes(invoice.status);
  const lines = invoice.lines.nodes;
  const linesById = useMemo(
    () => new Map(lines.map(l => [l.id, l])),
    [lines],
  );

  const defaultValues = useMemo<FormValues>(
    () => ({ lines: Object.fromEntries(lines.map(l => [l.id, toLineForm(l)])) }),
    [lines],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { dirtyFields, isDirty, errors },
  } = useForm<FormValues>({ defaultValues, mode: 'onChange' });

  // Header fields are controlled (MUI inputs) and tracked separately from the
  // line grid; both feed the single Save.
  const [theirReference, setTheirReference] = useState(invoice.theirReference ?? '');
  const [comment, setComment] = useState(invoice.comment ?? '');
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Re-baseline the form whenever the document refetches (after a save/status change).
  useEffect(() => {
    reset(defaultValues);
    setTheirReference(invoice.theirReference ?? '');
    setComment(invoice.comment ?? '');
  }, [invoice, defaultValues, reset]);

  const numeric = useMemo(() => ({ validate: makeNonNegativeValidator(t) }), [t]);

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
        if (res.updateInboundShipment.__typename === 'UpdateInboundShipmentError')
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
                      value: f.manufactureDate === '' ? null : f.manufactureDate,
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
      if (errs.length) setSnackbar(errs.join(' '));
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
    onError: e => setSnackbar(e instanceof Error ? e.message : String(e)),
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
      ? t('messages.edited-count', { value: dirtyLineCount + (headerDirty ? 1 : 0) })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const [addOpen, setAddOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1.5 }}>
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
                size="small"
                color="inherit"
                onClick={onToggleHold}
                disabled={toggleHold.isPending}
              >
                {invoice.onHold ? t('button.take-off-hold') : t('button.hold')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAddOpen(true)}
              >
                {t('button.add-item')}
              </Button>
            </>
          ) : null
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('label.supplier-name')}
          value={invoice.otherPartyName}
          size="small"
          disabled
          fullWidth={isPhone}
          sx={{ minWidth: { xs: 0, sm: 220 } }}
        />
        <TextField
          label={t('label.supplier-ref')}
          value={theirReference}
          onChange={e => setTheirReference(e.target.value)}
          size="small"
          disabled={!editable}
          fullWidth={isPhone}
          sx={{ minWidth: { xs: 0, sm: 220 } }}
        />
        <TextField
          label={t('label.comment')}
          value={comment}
          onChange={e => setComment(e.target.value)}
          size="small"
          fullWidth
          disabled={!editable}
        />
      </Stack>

      {isPhone ? (
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
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
            <Typography color="text.secondary" sx={{ py: 2 }}>
              {t('messages.no-lines')}
            </Typography>
          ) : null}
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.code')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.name')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.batch')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.expiry')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('label.manufacture-date')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.pack-size')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.pack-quantity')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.cost-per-pack')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('label.sell-price-per-pack')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.comment')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.total')}
                </TableCell>
                {editable ? <TableCell padding="checkbox" /> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map(line => {
                const lineErr = errors.lines?.[line.id];
                return (
                  <TableRow key={line.id} hover>
                    <TableCell>{line.item.code}</TableCell>
                    <TableCell>{line.item.name}</TableCell>
                    <TableCell sx={{ width: 120 }}>
                      {editable ? (
                        <input
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.batch`)}
                        />
                      ) : (
                        line.batch ?? ''
                      )}
                    </TableCell>
                    <TableCell sx={{ width: 150 }}>
                      {editable ? (
                        <input
                          type="date"
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.expiry`)}
                        />
                      ) : (
                        line.expiryDate ?? ''
                      )}
                    </TableCell>
                    <TableCell sx={{ width: 150 }}>
                      {editable ? (
                        <input
                          type="date"
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.manufactureDate`)}
                        />
                      ) : (
                        line.manufactureDate ?? ''
                      )}
                    </TableCell>
                    <TableCell sx={{ width: 90 }}>
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
                    <TableCell sx={{ width: 90 }}>
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
                    <TableCell sx={{ width: 100 }}>
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
                    <TableCell sx={{ width: 100 }}>
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
                    <TableCell sx={{ width: 140 }}>
                      {editable ? (
                        <input
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.note`)}
                        />
                      ) : (
                        line.note ?? ''
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(line.costPricePerPack * line.numberOfPacks)}
                    </TableCell>
                    {editable ? (
                      <TableCell padding="checkbox">
                        <Tooltip title={t('button.delete')}>
                          <IconButton
                            size="small"
                            onClick={() => onDeleteLine(line)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      {t('messages.no-lines')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Paper>
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

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={8000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setSnackbar(null)}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function CardField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Box>
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
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ flex: 1, minWidth: 0 }}>
          {line.item.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {line.item.code}
        </Typography>
        {editable ? (
          <IconButton size="small" edge="end" onClick={onDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1,
          mt: 1,
        }}
      >
        <CardField label={t('label.batch')}>
          {editable ? (
            <input style={INPUT_BASE} {...register(`lines.${line.id}.batch`)} />
          ) : (
            <Typography variant="body2">{line.batch ?? ''}</Typography>
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
            <Typography variant="body2">{line.expiryDate ?? ''}</Typography>
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
            <Typography variant="body2">{line.manufactureDate ?? ''}</Typography>
          )}
        </CardField>
        <CardField label={t('label.pack-size')}>
          {editable ? (
            <input
              style={inputStyle(Boolean(lineErr?.packSize))}
              {...numericField(register(`lines.${line.id}.packSize`, numeric))}
            />
          ) : (
            <Typography variant="body2">{line.packSize}</Typography>
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
            <Typography variant="body2">{line.numberOfPacks}</Typography>
          )}
        </CardField>
        <CardField label={t('label.cost-per-pack')}>
          {editable ? (
            <input
              style={inputStyle(Boolean(lineErr?.cost))}
              {...numericField(register(`lines.${line.id}.cost`, numeric))}
            />
          ) : (
            <Typography variant="body2">
              {formatCurrency(line.costPricePerPack)}
            </Typography>
          )}
        </CardField>
        <CardField label={t('label.sell-price-per-pack')}>
          {editable ? (
            <input
              style={inputStyle(Boolean(lineErr?.sell))}
              {...numericField(register(`lines.${line.id}.sell`, numeric))}
            />
          ) : (
            <Typography variant="body2">
              {formatCurrency(line.sellPricePerPack)}
            </Typography>
          )}
        </CardField>
        <CardField label={t('label.total')}>
          <Typography variant="body2">
            {formatCurrency(line.costPricePerPack * line.numberOfPacks)}
          </Typography>
        </CardField>
      </Box>
      <Box sx={{ mt: 1 }}>
        <CardField label={t('label.comment')}>
          {editable ? (
            <input style={INPUT_BASE} {...register(`lines.${line.id}.note`)} />
          ) : (
            <Typography variant="body2">{line.note ?? ''}</Typography>
          )}
        </CardField>
      </Box>
    </Paper>
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
      <Stack spacing={2} sx={{ pt: 1 }}>
        <ItemSearchInput
          storeId={storeId}
          value={item}
          onChange={setItem}
          excludeItemIds={existingItemIds}
          autoFocus
        />
        <Stack direction="row" spacing={2}>
          <TextField
            label={t('label.batch')}
            value={batch}
            onChange={e => setBatch(e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label={t('label.expiry')}
            type="date"
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t('label.manufacture-date')}
            type="date"
            value={manufactureDate}
            onChange={e => setManufactureDate(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label={t('label.pack-size')}
            value={packSize}
            onChange={e => setPackSize(sanitizeNumeric(e.target.value))}
            size="small"
            fullWidth
            inputMode="decimal"
          />
          <TextField
            label={t('label.pack-quantity')}
            value={numberOfPacks}
            onChange={e => setNumberOfPacks(sanitizeNumeric(e.target.value))}
            size="small"
            fullWidth
            inputMode="decimal"
          />
          <TextField
            label={t('label.cost-per-pack')}
            value={cost}
            onChange={e => setCost(sanitizeNumeric(e.target.value))}
            size="small"
            fullWidth
            inputMode="decimal"
          />
          <TextField
            label={t('label.sell-price-per-pack')}
            value={sell}
            onChange={e => setSell(sanitizeNumeric(e.target.value))}
            size="small"
            fullWidth
            inputMode="decimal"
          />
        </Stack>
        <TextField
          label={t('label.comment')}
          value={note}
          onChange={e => setNote(e.target.value)}
          size="small"
          fullWidth
        />
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </LineEditDialog>
  );
}
