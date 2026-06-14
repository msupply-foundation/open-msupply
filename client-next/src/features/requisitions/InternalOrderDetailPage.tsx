import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  RequisitionNodeType,
  RequisitionNodeStatus,
  UpdateRequestRequisitionStatusInput,
} from '@/gql/schema';
import { useTranslation } from '@/intl';
import { DetailHeaderBar } from '@/components/detail/DetailHeaderBar';
import { StatusBar } from '@/components/detail/StatusBar';
import { LineEditDialog } from '@/components/detail/LineEditDialog';
import { ItemSearchInput } from '@/components/detail/ItemSearchInput';
import { useConfirm } from '@/components/detail/useConfirm';
import { INPUT_BASE, inputStyle, makeNonNegativeValidator, numericField } from '@/components/detail/inputs';
import type { ItemOptionFragment } from '@/features/items/items.generated';
import { useRequisitionStatusName } from './status';
import { requisitionStatusFlow, requisitionReachedAt } from './statusFlow';
import {
  requestKeys,
  requestSdk,
  requestRequisitionQueryOptions,
} from './requestDetail.queries';
import type {
  RequestDetailFragment,
  RequestLineRowFragment,
} from './requestDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/replenishment/internal-order/$requisitionId',
);

export function InternalOrderDetailPage() {
  const { storeId, requisitionId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...requestRequisitionQueryOptions(storeId, requisitionId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <Typography>{t('messages.loading')}</Typography>;
  if (!data) return <Typography>{t('messages.requisition-not-found')}</Typography>;

  return <RequestEditor storeId={storeId} requisition={data} />;
}

interface LineForm {
  requestedQuantity: string;
  comment: string;
}
interface FormValues {
  lines: Record<string, LineForm>;
}

const toLineForm = (l: RequestLineRowFragment): LineForm => ({
  requestedQuantity: l.requestedQuantity?.toString() ?? '',
  comment: l.comment ?? '',
});

// Stacked label/value pair used inside the phone line cards.
function CardField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function RequestEditor({
  storeId,
  requisition,
}: {
  storeId: string;
  requisition: RequestDetailFragment;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusName = useRequisitionStatusName();
  const { confirm, dialog } = useConfirm();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));

  const flow = requisitionStatusFlow(RequisitionNodeType.Request);
  const editable = flow.editable.includes(requisition.status);
  const lines = requisition.lines.nodes;
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
  const [theirReference, setTheirReference] = useState(requisition.theirReference ?? '');
  const [comment, setComment] = useState(requisition.comment ?? '');
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Re-baseline the form whenever the document refetches (after a save/status change).
  useEffect(() => {
    reset(defaultValues);
    setTheirReference(requisition.theirReference ?? '');
    setComment(requisition.comment ?? '');
  }, [requisition, defaultValues, reset]);

  const numeric = useMemo(() => ({ validate: makeNonNegativeValidator(t) }), [t]);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: requestKeys.detail(storeId, requisition.id),
    });

  const headerDirty =
    theirReference !== (requisition.theirReference ?? '') ||
    comment !== (requisition.comment ?? '');

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const messages = new Set<string>();

      if (headerDirty) {
        const res = await requestSdk.updateRequest({
          storeId,
          input: { id: requisition.id, theirReference, comment },
        });
        if (
          res.updateRequestRequisition.__typename ===
          'UpdateRequestRequisitionError'
        )
          messages.add(res.updateRequestRequisition.error.description);
      }

      const dirtyLines = dirtyFields.lines ?? {};
      await Promise.all(
        Object.keys(dirtyLines).map(async id => {
          const d = dirtyLines[id];
          const f = values.lines[id];
          if (!d || !f || !linesById.has(id)) return;
          const res = await requestSdk.updateRequestLine({
            storeId,
            input: {
              id,
              ...(d.requestedQuantity && f.requestedQuantity !== ''
                ? { requestedQuantity: Number(f.requestedQuantity) }
                : {}),
              ...(d.comment ? { comment: f.comment } : {}),
            },
          });
          if (
            res.updateRequestRequisitionLine.__typename ===
            'UpdateRequestRequisitionLineError'
          )
            messages.add(res.updateRequestRequisitionLine.error.description);
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
    mutationFn: async (target: RequisitionNodeStatus) => {
      const status =
        target === RequisitionNodeStatus.Sent
          ? UpdateRequestRequisitionStatusInput.Sent
          : undefined;
      const res = await requestSdk.updateRequest({
        storeId,
        input: { id: requisition.id, status },
      });
      if (
        res.updateRequestRequisition.__typename ===
        'UpdateRequestRequisitionError'
      )
        throw new Error(res.updateRequestRequisition.error.description);
    },
    onSuccess: invalidate,
    onError: e => setSnackbar(e instanceof Error ? e.message : String(e)),
  });

  const useSuggested = useMutation({
    mutationFn: async () => {
      const res = await requestSdk.useSuggested({
        storeId,
        input: { requestRequisitionId: requisition.id },
      });
      if (
        res.useSuggestedQuantity.__typename === 'UseSuggestedQuantityError'
      )
        throw new Error(res.useSuggestedQuantity.error.description);
    },
    onSuccess: invalidate,
    onError: e => setSnackbar(e instanceof Error ? e.message : String(e)),
  });

  const deleteLine = useMutation({
    mutationFn: (id: string) =>
      requestSdk.deleteRequestLine({ storeId, input: { id } }),
    onSuccess: invalidate,
  });

  const onSave = handleSubmit(values => save.mutate(values));

  const onAdvance = async (target: RequisitionNodeStatus) => {
    const ok = await confirm({
      message: t('messages.confirm-status-as', { status: statusName(target) }),
    });
    if (ok) advance.mutate(target);
  };

  const onUseSuggested = async () => {
    const ok = await confirm({ message: t('messages.confirm-use-suggested') });
    if (ok) useSuggested.mutate();
  };

  const onDeleteLine = async (line: RequestLineRowFragment) => {
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
        title={t('heading.internal-order', { number: requisition.requisitionNumber })}
        statusLabel={statusName(requisition.status)}
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
                onClick={onUseSuggested}
                disabled={useSuggested.isPending || lines.length === 0}
              >
                {t('button.use-suggested')}
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
          value={requisition.otherPartyName}
          size="small"
          disabled
          sx={{ minWidth: 220 }}
        />
        <TextField
          label={t('label.number')}
          value={requisition.requisitionNumber}
          size="small"
          disabled
          sx={{ minWidth: 120 }}
        />
        <TextField
          label={t('label.supplier-ref')}
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
        {isPhone ? (
          <Box sx={{ p: 1 }}>
            {lines.map(line => {
              const lineErr = errors.lines?.[line.id];
              return (
                <Paper
                  key={line.id}
                  variant="outlined"
                  sx={{ p: 1.5, mb: 1 }}
                >
                  <Stack spacing={1}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ flex: 1, minWidth: 0 }}
                      >
                        {line.item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {line.item.code}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: 1,
                      }}
                    >
                      <CardField label={t('label.available-soh')}>
                        <Typography variant="body2">
                          {line.itemStats.availableStockOnHand.toLocaleString()}
                        </Typography>
                      </CardField>
                      <CardField label={t('label.amc')}>
                        <Typography variant="body2">
                          {line.itemStats.averageMonthlyConsumption.toLocaleString()}
                        </Typography>
                      </CardField>
                      <CardField label={t('label.suggested')}>
                        <Typography variant="body2">
                          {line.suggestedQuantity.toLocaleString()}
                        </Typography>
                      </CardField>
                    </Box>
                    <CardField label={t('label.requested')}>
                      {editable ? (
                        <input
                          style={inputStyle(Boolean(lineErr?.requestedQuantity))}
                          {...numericField(
                            register(
                              `lines.${line.id}.requestedQuantity`,
                              numeric,
                            ),
                          )}
                        />
                      ) : (
                        <Typography variant="body2">
                          {line.requestedQuantity}
                        </Typography>
                      )}
                    </CardField>
                    <CardField label={t('label.comment')}>
                      {editable ? (
                        <input
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.comment`)}
                        />
                      ) : (
                        <Typography variant="body2">
                          {line.comment ?? ''}
                        </Typography>
                      )}
                    </CardField>
                    {editable ? (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon fontSize="small" />}
                          onClick={() => onDeleteLine(line)}
                        >
                          {t('button.delete')}
                        </Button>
                      </Box>
                    ) : null}
                  </Stack>
                </Paper>
              );
            })}
            {lines.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2, px: 1 }}>
                {t('messages.no-lines')}
              </Typography>
            ) : null}
          </Box>
        ) : (
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.code')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.name')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.unit')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.available-soh')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.amc')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.suggested')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.requested')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('label.comment')}</TableCell>
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
                    <TableCell>{line.item.unitName ?? ''}</TableCell>
                    <TableCell align="right">
                      {line.itemStats.availableStockOnHand.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      {line.itemStats.averageMonthlyConsumption.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      {line.suggestedQuantity.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ width: 110 }}>
                      {editable ? (
                        <input
                          style={inputStyle(Boolean(lineErr?.requestedQuantity))}
                          {...numericField(
                            register(`lines.${line.id}.requestedQuantity`, numeric),
                          )}
                        />
                      ) : (
                        line.requestedQuantity
                      )}
                    </TableCell>
                    <TableCell sx={{ width: 200 }}>
                      {editable ? (
                        <input
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.comment`)}
                        />
                      ) : (
                        line.comment ?? ''
                      )}
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
        )}
      </Paper>

      <StatusBar
        sequence={flow.sequence}
        current={requisition.status}
        reachedAt={requisitionReachedAt(requisition)}
        label={statusName}
        nextOptions={flow.next[requisition.status] ?? []}
        onAdvance={onAdvance}
        advancing={advance.isPending}
        disabled={!editable}
      />

      <AddRequestLineDialog
        open={addOpen}
        storeId={storeId}
        requisitionId={requisition.id}
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

function AddRequestLineDialog({
  open,
  storeId,
  requisitionId,
  existingItemIds,
  onClose,
  onAdded,
}: {
  open: boolean;
  storeId: string;
  requisitionId: string;
  existingItemIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const { t } = useTranslation();
  const [item, setItem] = useState<ItemOptionFragment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setItem(null);
      setError(null);
    }
  }, [open]);

  const insert = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const res = await requestSdk.insertRequestLine({
        storeId,
        input: {
          id: crypto.randomUUID(),
          requisitionId,
          itemId: item.id,
        },
      });
      if (
        res.insertRequestRequisitionLine.__typename ===
        'InsertRequestRequisitionLineError'
      )
        throw new Error(res.insertRequestRequisitionLine.error.description);
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
      okDisabled={!item}
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
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </LineEditDialog>
  );
}
