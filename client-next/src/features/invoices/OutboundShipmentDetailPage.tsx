import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  InvoiceNodeType,
  type InvoiceNodeStatus,
  UpdateOutboundShipmentStatusInput,
} from '@/gql/schema';
import { useTranslation } from '@/intl';
import { formatCurrency } from '@/lib/format';
import { DetailHeaderBar } from '@/components/detail/DetailHeaderBar';
import { StatusBar } from '@/components/detail/StatusBar';
import { useConfirm } from '@/components/detail/useConfirm';
import { inputStyle, makeNonNegativeValidator } from '@/components/detail/inputs';
import { useInvoiceStatusName } from './status';
import { invoiceStatusFlow, invoiceReachedAt } from './statusFlow';
import {
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

  if (isLoading) return <Typography>{t('messages.loading')}</Typography>;
  if (!data) return <Typography>{t('messages.invoice-not-found')}</Typography>;

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

  const flow = invoiceStatusFlow(InvoiceNodeType.OutboundShipment);
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
  const [theirReference, setTheirReference] = useState(
    invoice.theirReference ?? '',
  );
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
      if (errs.length) setSnackbar(errs.join(' '));
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
    onError: e => setSnackbar(e instanceof Error ? e.message : String(e)),
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1.5 }}>
      <DetailHeaderBar
        title={t('heading.outbound-shipment', { number: invoice.invoiceNumber })}
        statusLabel={statusName(invoice.status)}
        summary={summary}
        onSave={onSave}
        saveDisabled={(!isDirty && !headerDirty) || errorCount > 0 || !editable}
        saving={save.isPending}
        actions={
          editable ? (
            <Button
              size="small"
              color="inherit"
              onClick={onToggleHold}
              disabled={toggleHold.isPending}
            >
              {invoice.onHold ? t('button.take-off-hold') : t('button.hold')}
            </Button>
          ) : null
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('label.customer-name')}
          value={invoice.otherPartyName}
          size="small"
          disabled
          sx={{ minWidth: 220 }}
        />
        <TextField
          label={t('label.customer-ref')}
          value={theirReference}
          onChange={e => setTheirReference(e.target.value)}
          size="small"
          disabled={!editable}
          sx={{ minWidth: 220 }}
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

      <Paper variant="outlined" sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>{t('label.code')}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t('label.name')}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t('label.batch')}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t('label.expiry')}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t('label.pack-size')}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t('label.pack-quantity')}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t('label.price-per-pack')}</TableCell>
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
                  <TableCell>{line.batch ?? ''}</TableCell>
                  <TableCell>{line.expiryDate ?? ''}</TableCell>
                  <TableCell>{line.packSize}</TableCell>
                  <TableCell sx={{ width: 90 }}>
                    {editable ? (
                      <input
                        inputMode="decimal"
                        style={inputStyle(Boolean(lineErr?.numberOfPacks))}
                        {...register(`lines.${line.id}.numberOfPacks`, numeric)}
                      />
                    ) : (
                      line.numberOfPacks
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(line.sellPricePerPack)}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(line.sellPricePerPack * line.numberOfPacks)}
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
                <TableCell colSpan={9}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {t('messages.no-lines')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

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
