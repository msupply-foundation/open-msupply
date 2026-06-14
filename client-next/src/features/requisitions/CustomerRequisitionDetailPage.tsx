import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm, type UseFormRegister } from 'react-hook-form';
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
  type RequisitionNodeStatus,
  UpdateResponseRequisitionStatusInput,
} from '@/gql/schema';
import { useTranslation } from '@/intl';
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
} from '@/components/detail/inputs';
import type { ItemOptionFragment } from '@/features/items/items.generated';
import { useRequisitionStatusName } from './status';
import { requisitionStatusFlow, requisitionReachedAt } from './statusFlow';
import {
  responseKeys,
  responseSdk,
  responseRequisitionQueryOptions,
} from './responseDetail.queries';
import type {
  ResponseDetailFragment,
  ResponseLineRowFragment,
} from './responseDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/distribution/customer-requisition/$requisitionId',
);

export function CustomerRequisitionDetailPage() {
  const { storeId, requisitionId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...responseRequisitionQueryOptions(storeId, requisitionId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <Typography>{t('messages.loading')}</Typography>;
  if (!data)
    return <Typography>{t('messages.requisition-not-found')}</Typography>;

  return <ResponseEditor storeId={storeId} requisition={data} />;
}

interface LineForm {
  requestedQuantity: string;
  supplyQuantity: string;
  comment: string;
}
interface FormValues {
  lines: Record<string, LineForm>;
}

const toLineForm = (l: ResponseLineRowFragment): LineForm => ({
  requestedQuantity: l.requestedQuantity?.toString() ?? '',
  supplyQuantity: l.supplyQuantity?.toString() ?? '',
  comment: l.comment ?? '',
});

function ResponseEditor({
  storeId,
  requisition,
}: {
  storeId: string;
  requisition: ResponseDetailFragment;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusName = useRequisitionStatusName();
  const { confirm, dialog } = useConfirm();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));

  const flow = requisitionStatusFlow(RequisitionNodeType.Response);
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
  const [theirReference, setTheirReference] = useState(
    requisition.theirReference ?? '',
  );
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
      queryKey: responseKeys.detail(storeId, requisition.id),
    });

  const headerDirty =
    theirReference !== (requisition.theirReference ?? '') ||
    comment !== (requisition.comment ?? '');

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const messages = new Set<string>();

      if (headerDirty) {
        const res = await responseSdk.updateResponse({
          storeId,
          input: { id: requisition.id, theirReference, comment },
        });
        if (
          res.updateResponseRequisition.__typename ===
          'UpdateResponseRequisitionError'
        )
          messages.add(res.updateResponseRequisition.error.description);
      }

      const dirtyLines = dirtyFields.lines ?? {};
      await Promise.all(
        Object.keys(dirtyLines).map(async id => {
          const d = dirtyLines[id];
          const f = values.lines[id];
          if (!d || !f || !linesById.has(id)) return;
          const res = await responseSdk.updateResponseLine({
            storeId,
            input: {
              id,
              ...(d.requestedQuantity && f.requestedQuantity !== ''
                ? { requestedQuantity: Number(f.requestedQuantity) }
                : {}),
              ...(d.supplyQuantity && f.supplyQuantity !== ''
                ? { supplyQuantity: Number(f.supplyQuantity) }
                : {}),
              ...(d.comment ? { comment: f.comment } : {}),
            },
          });
          if (
            res.updateResponseRequisitionLine.__typename ===
            'UpdateResponseRequisitionLineError'
          )
            messages.add(res.updateResponseRequisitionLine.error.description);
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
    mutationFn: async () => {
      const res = await responseSdk.updateResponse({
        storeId,
        input: {
          id: requisition.id,
          status: UpdateResponseRequisitionStatusInput.Finalised,
        },
      });
      if (
        res.updateResponseRequisition.__typename ===
        'UpdateResponseRequisitionError'
      )
        throw new Error(res.updateResponseRequisition.error.description);
    },
    onSuccess: invalidate,
    onError: e => setSnackbar(e instanceof Error ? e.message : String(e)),
  });

  const supplyRequested = useMutation({
    mutationFn: async () => {
      const res = await responseSdk.supplyRequested({
        storeId,
        input: { responseRequisitionId: requisition.id },
      });
      if (
        res.supplyRequestedQuantity.__typename === 'SupplyRequestedQuantityError'
      )
        throw new Error(res.supplyRequestedQuantity.error.description);
    },
    onSuccess: invalidate,
    onError: e => setSnackbar(e instanceof Error ? e.message : String(e)),
  });

  const deleteLine = useMutation({
    mutationFn: (id: string) =>
      responseSdk.deleteResponseLine({ storeId, input: { id } }),
    onSuccess: invalidate,
  });

  const onSave = handleSubmit(values => save.mutate(values));

  const onAdvance = async (target: RequisitionNodeStatus) => {
    const ok = await confirm({
      message: t('messages.confirm-status-as', { status: statusName(target) }),
    });
    if (ok) advance.mutate();
  };

  const onSupplyRequested = async () => {
    const ok = await confirm({
      message: t('messages.confirm-supply-requested'),
    });
    if (ok) supplyRequested.mutate();
  };

  const onDeleteLine = async (line: ResponseLineRowFragment) => {
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1.5 }}>
      <DetailHeaderBar
        title={t('heading.customer-requisition', {
          number: requisition.requisitionNumber,
        })}
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
                onClick={onSupplyRequested}
                disabled={supplyRequested.isPending}
              >
                {t('button.supply-requested')}
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
          label={t('label.customer-name')}
          value={requisition.otherPartyName}
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

      {isPhone ? (
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {lines.map(line => {
            const lineErr = errors.lines?.[line.id];
            return (
              <ResponseLineCard
                key={line.id}
                line={line}
                editable={editable}
                requestedInvalid={Boolean(lineErr?.requestedQuantity)}
                supplyInvalid={Boolean(lineErr?.supplyQuantity)}
                register={register}
                numeric={numeric}
                onDelete={() => onDeleteLine(line)}
              />
            );
          })}
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
                <TableCell sx={{ fontWeight: 600 }}>{t('label.unit')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.our-soh')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.customer-soh')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.suggested')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('label.requested')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.already-issued')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('label.remaining-to-supply')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('label.supply-quantity')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('label.comment')}
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
                    <TableCell>{line.item.unitName ?? ''}</TableCell>
                    <TableCell align="right">
                      {line.itemStats.stockOnHand}
                    </TableCell>
                    <TableCell align="right">
                      {line.availableStockOnHand}
                    </TableCell>
                    <TableCell align="right">{line.suggestedQuantity}</TableCell>
                    <TableCell sx={{ width: 110 }}>
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
                        line.requestedQuantity
                      )}
                    </TableCell>
                    <TableCell align="right">{line.alreadyIssued}</TableCell>
                    <TableCell align="right">
                      {line.remainingQuantityToSupply}
                    </TableCell>
                    <TableCell sx={{ width: 110 }}>
                      {editable ? (
                        <input
                          style={inputStyle(Boolean(lineErr?.supplyQuantity))}
                          {...numericField(
                            register(
                              `lines.${line.id}.supplyQuantity`,
                              numeric,
                            ),
                          )}
                        />
                      ) : (
                        line.supplyQuantity
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      {editable ? (
                        <input
                          style={INPUT_BASE}
                          {...register(`lines.${line.id}.comment`)}
                        />
                      ) : (
                        (line.comment ?? '')
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
        current={requisition.status}
        reachedAt={requisitionReachedAt(requisition)}
        label={statusName}
        nextOptions={flow.next[requisition.status] ?? []}
        onAdvance={onAdvance}
        advancing={advance.isPending}
        disabled={!editable}
      />

      <AddResponseLineDialog
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

// Stacked label/value row used inside the phone card layout.
function CardRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Box>
  );
}

// Phone layout for a single response line: the same editable fields as the
// desktop table row, stacked in a card so there is no horizontal overflow.
function ResponseLineCard({
  line,
  editable,
  requestedInvalid,
  supplyInvalid,
  register,
  numeric,
  onDelete,
}: {
  line: ResponseLineRowFragment;
  editable: boolean;
  requestedInvalid: boolean;
  supplyInvalid: boolean;
  register: UseFormRegister<FormValues>;
  numeric: { validate: (raw: string) => true | string };
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ flex: 1, minWidth: 0 }}>
            {line.item.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {line.item.code}
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <CardRow label={t('label.our-soh')}>
            <Typography variant="body2">{line.itemStats.stockOnHand}</Typography>
          </CardRow>
          <CardRow label={t('label.customer-soh')}>
            <Typography variant="body2">{line.availableStockOnHand}</Typography>
          </CardRow>
          <CardRow label={t('label.suggested')}>
            <Typography variant="body2">{line.suggestedQuantity}</Typography>
          </CardRow>
          <CardRow label={t('label.already-issued')}>
            <Typography variant="body2">{line.alreadyIssued}</Typography>
          </CardRow>
          <CardRow label={t('label.requested')}>
            {editable ? (
              <input
                style={inputStyle(requestedInvalid)}
                {...numericField(
                  register(`lines.${line.id}.requestedQuantity`, numeric),
                )}
              />
            ) : (
              <Typography variant="body2">{line.requestedQuantity}</Typography>
            )}
          </CardRow>
          <CardRow label={t('label.supply-quantity')}>
            {editable ? (
              <input
                style={inputStyle(supplyInvalid)}
                {...numericField(
                  register(`lines.${line.id}.supplyQuantity`, numeric),
                )}
              />
            ) : (
              <Typography variant="body2">{line.supplyQuantity}</Typography>
            )}
          </CardRow>
        </Box>
        <CardRow label={t('label.remaining-to-supply')}>
          <Typography variant="body2">
            {line.remainingQuantityToSupply}
          </Typography>
        </CardRow>
        <CardRow label={t('label.comment')}>
          {editable ? (
            <input style={INPUT_BASE} {...register(`lines.${line.id}.comment`)} />
          ) : (
            <Typography variant="body2">{line.comment ?? ''}</Typography>
          )}
        </CardRow>
        {editable ? (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon fontSize="small" />}
              onClick={onDelete}
            >
              {t('button.delete')}
            </Button>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}

function AddResponseLineDialog({
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
      const res = await responseSdk.insertResponseLine({
        storeId,
        input: {
          id: crypto.randomUUID(),
          requisitionId,
          itemId: item.id,
        },
      });
      if (
        res.insertResponseRequisitionLine.__typename ===
        'InsertResponseRequisitionLineError'
      )
        throw new Error(res.insertResponseRequisitionLine.error.description);
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
