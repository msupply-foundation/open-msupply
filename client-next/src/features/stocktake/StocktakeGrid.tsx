import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
} from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ReasonOptionNodeType, type UpdateStocktakeLineInput } from '@/gql/schema';
import { numericField } from '@/components/detail/inputs';
import { useTranslation, type TxKey } from '@/intl';
import type { TFunction } from 'i18next';
import { stocktakeSdk } from './api';
import { reasonOptionsQueryOptions, stocktakeKeys } from './queries';
import type {
  ReasonOptionRowFragment,
  StocktakeLineRowFragment,
  StocktakeRowFragment,
} from './stocktake.generated';

interface Props {
  storeId: string;
  stocktakeId: string;
  header: StocktakeRowFragment | null | undefined;
  lines: StocktakeLineRowFragment[];
}

// Every editable field is a plain string in the form; converted on save.
interface LineForm {
  counted: string;
  batch: string;
  expiry: string;
  packSize: string;
  costPrice: string;
  sellPrice: string;
  comment: string;
  reasonId: string;
}
interface FormValues {
  lines: Record<string, LineForm>;
}

interface RowReasons {
  positive: ReasonOptionRowFragment[];
  negative: ReasonOptionRowFragment[];
}

// Code | Item | Batch | Expiry | Pack | Snapshot | Counted | Cost | Sell | Reason | Comment
const COLS =
  '90px minmax(160px, 1.4fr) 110px 140px 70px 90px 95px 90px 90px 170px 150px';
const GRID_MIN_WIDTH = 1240;
// Fixed row heights — both layouts are uniform, so fixed-size virtualization is
// smoother than per-row measurement. CARD_HEIGHT comfortably fits the card's
// content (~344px); keep it ahead of the content if fields are added.
const ROW_HEIGHT = 44;
const CARD_HEIGHT = 352;

const cell = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

const inputBase: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '4px 6px',
  border: '1px solid #c4c4c4',
  borderRadius: 4,
  font: 'inherit',
  background: '#fff',
};

function inputStyle(invalid: boolean): CSSProperties {
  return invalid ? { ...inputBase, borderColor: '#d32f2f' } : inputBase;
}

// Server error __typename -> message key. Translated at the point of display.
const ERROR_KEYS: Record<string, TxKey> = {
  AdjustmentReasonNotProvided: 'error.adjustment-reason-not-provided',
  AdjustmentReasonNotValid: 'error.adjustment-reason-not-valid',
  StockLineReducedBelowZero: 'error.stock-below-zero',
  SnapshotCountCurrentCountMismatchLine: 'error.snapshot-mismatch',
  CannotEditStocktake: 'error.cannot-edit-stocktake',
};

type ErrorField = 'reason' | 'counted' | 'snapshot' | 'row';

function errorField(typename: string): ErrorField {
  switch (typename) {
    case 'AdjustmentReasonNotProvided':
    case 'AdjustmentReasonNotValid':
      return 'reason';
    case 'StockLineReducedBelowZero':
      return 'counted';
    case 'SnapshotCountCurrentCountMismatchLine':
      return 'snapshot';
    default:
      return 'row';
  }
}

// Numbers must be empty (not entered) or a non-negative finite value. Returns a
// translated message (RHF stores it; the grid surfaces invalid lines visually).
function makeValidateNonNeg(t: TFunction) {
  return (raw: string): true | string => {
    if (raw === '') return true;
    const n = Number(raw);
    if (Number.isNaN(n)) return t('error.enter-number');
    if (n < 0) return t('error.non-negative');
    return true;
  };
}

function adjustmentDirection(
  countedRaw: string,
  snapshot: number,
): 'positive' | 'negative' | null {
  if (countedRaw === '') return null;
  const n = Number(countedRaw);
  if (Number.isNaN(n) || n === snapshot) return null;
  return n > snapshot ? 'positive' : 'negative';
}

interface RowProps {
  line: StocktakeLineRowFragment;
  index: number;
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  reasons: RowReasons;
  errorField: ErrorField | undefined;
  onCountedKeyDown: (e: KeyboardEvent<HTMLInputElement>, index: number) => void;
}

// A reason is only relevant (and only required by the server) when the count
// differs from the snapshot. The select stays present but disabled otherwise so
// the row keeps a constant height for virtualization.
function useRowReasons(
  control: Control<FormValues>,
  line: StocktakeLineRowFragment,
  reasons: RowReasons,
) {
  const counted = useWatch({ control, name: `lines.${line.id}.counted` });
  const direction = adjustmentDirection(counted ?? '', line.snapshotNumberOfPacks);
  const list =
    direction === 'positive'
      ? reasons.positive
      : direction === 'negative'
        ? reasons.negative
        : [];
  return { active: direction !== null, list };
}

function ReasonSelect({
  line,
  register,
  active,
  list,
  invalid,
}: {
  line: StocktakeLineRowFragment;
  register: UseFormRegister<FormValues>;
  active: boolean;
  list: ReasonOptionRowFragment[];
  invalid: boolean;
}) {
  const { t } = useTranslation();
  return (
    <select
      {...register(`lines.${line.id}.reasonId`)}
      disabled={!active}
      aria-invalid={invalid}
      style={{
        ...inputStyle(invalid),
        background: active ? '#fff' : '#f5f5f5',
      }}
    >
      <option value="">{active ? t('messages.select-reason') : '—'}</option>
      {list.map(r => (
        <option key={r.id} value={r.id}>
          {r.reason}
        </option>
      ))}
    </select>
  );
}

function DesktopRow({
  line,
  index,
  register,
  control,
  reasons,
  errorField: errField,
  onCountedKeyDown,
}: RowProps) {
  const { t } = useTranslation();
  const numericReg = useMemo(() => ({ validate: makeValidateNonNeg(t) }), [t]);
  const reason = useRowReasons(control, line, reasons);
  return (
    <>
      <span style={cell}>{line.item.code}</span>
      <span style={cell} title={line.item.name}>
        {line.item.name}
      </span>
      <input style={inputBase} {...register(`lines.${line.id}.batch`)} />
      <input
        type="date"
        style={inputBase}
        {...register(`lines.${line.id}.expiry`)}
      />
      <input
        type="text"
        style={inputBase}
        {...numericField(register(`lines.${line.id}.packSize`, numericReg))}
      />
      <span
        style={{
          textAlign: 'right',
          color: errField === 'snapshot' ? '#d32f2f' : undefined,
          fontWeight: errField === 'snapshot' ? 600 : undefined,
        }}
      >
        {line.snapshotNumberOfPacks}
      </span>
      <input
        type="text"
        data-index={index}
        style={inputStyle(errField === 'counted')}
        {...numericField(register(`lines.${line.id}.counted`, numericReg))}
        onKeyDown={e => onCountedKeyDown(e, index)}
      />
      <input
        type="text"
        style={inputBase}
        {...numericField(register(`lines.${line.id}.costPrice`, numericReg))}
      />
      <input
        type="text"
        style={inputBase}
        {...numericField(register(`lines.${line.id}.sellPrice`, numericReg))}
      />
      <ReasonSelect
        line={line}
        register={register}
        active={reason.active}
        list={reason.list}
        invalid={errField === 'reason'}
      />
      <input style={inputBase} {...register(`lines.${line.id}.comment`)} />
    </>
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

function MobileCard({
  line,
  index,
  register,
  control,
  reasons,
  errorField: errField,
  onCountedKeyDown,
}: RowProps) {
  const { t } = useTranslation();
  const numericReg = useMemo(() => ({ validate: makeValidateNonNeg(t) }), [t]);
  const reason = useRowReasons(control, line, reasons);
  return (
    <Stack spacing={1} sx={{ height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ ...cell, flex: 1 }}>
          {line.item.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {line.item.code}
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <CardField
          label={t('label.counted-snapshot', {
            snapshot: line.snapshotNumberOfPacks,
          })}
        >
          <input
            type="text"
            data-index={index}
            style={inputStyle(errField === 'counted')}
            {...numericField(register(`lines.${line.id}.counted`, numericReg))}
            onKeyDown={e => onCountedKeyDown(e, index)}
          />
        </CardField>
        <CardField label={t('label.pack-size')}>
          <input
            type="text"
            style={inputBase}
            {...numericField(register(`lines.${line.id}.packSize`, numericReg))}
          />
        </CardField>
        <CardField label={t('label.batch')}>
          <input style={inputBase} {...register(`lines.${line.id}.batch`)} />
        </CardField>
        <CardField label={t('label.expiry')}>
          <input
            type="date"
            style={inputBase}
            {...register(`lines.${line.id}.expiry`)}
          />
        </CardField>
        <CardField label={t('label.cost-price')}>
          <input
            type="text"
            style={inputBase}
            {...numericField(register(`lines.${line.id}.costPrice`, numericReg))}
          />
        </CardField>
        <CardField label={t('label.sell-price')}>
          <input
            type="text"
            style={inputBase}
            {...numericField(register(`lines.${line.id}.sellPrice`, numericReg))}
          />
        </CardField>
      </Box>
      <CardField label={t('label.reason')}>
        <ReasonSelect
          line={line}
          register={register}
          active={reason.active}
          list={reason.list}
          invalid={errField === 'reason'}
        />
      </CardField>
      <CardField label={t('label.comment')}>
        <input style={inputBase} {...register(`lines.${line.id}.comment`)} />
      </CardField>
    </Stack>
  );
}

export function StocktakeGrid({ storeId, stocktakeId, header, lines }: Props) {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const { t } = useTranslation();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));

  const { data: reasonOptions = [] } = useQuery(reasonOptionsQueryOptions());
  const reasons = useMemo<RowReasons>(
    () => ({
      positive: reasonOptions.filter(
        r => r.type === ReasonOptionNodeType.PositiveInventoryAdjustment,
      ),
      negative: reasonOptions.filter(
        r => r.type === ReasonOptionNodeType.NegativeInventoryAdjustment,
      ),
    }),
    [reasonOptions],
  );

  const linesById = useMemo(
    () => new Map(lines.map(l => [l.id, l])),
    [lines],
  );

  const defaultValues = useMemo<FormValues>(
    () => ({
      lines: Object.fromEntries(
        lines.map(l => [
          l.id,
          {
            counted: l.countedNumberOfPacks?.toString() ?? '',
            batch: l.batch ?? '',
            expiry: l.expiryDate ?? '',
            packSize: l.packSize?.toString() ?? '',
            costPrice: l.costPricePerPack?.toString() ?? '',
            sellPrice: l.sellPricePerPack?.toString() ?? '',
            comment: l.comment ?? '',
            reasonId: l.reasonOption?.id ?? '',
          },
        ]),
      ),
    }),
    [lines],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { dirtyFields, isDirty, errors },
  } = useForm<FormValues>({ defaultValues, mode: 'onChange' });

  // lineId -> server error __typename from the last save.
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowHeight = isPhone ? CARD_HEIGHT : ROW_HEIGHT;
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });
  useEffect(() => virtualizer.measure(), [isPhone, virtualizer]);

  const focusRow = useCallback(
    (index: number) => {
      if (index < 0 || index >= lines.length) return;
      virtualizer.scrollToIndex(index, { align: 'auto' });
      requestAnimationFrame(() => {
        scrollRef.current
          ?.querySelector<HTMLInputElement>(`input[data-index="${index}"]`)
          ?.focus();
      });
    },
    [lines.length, virtualizer],
  );

  const onCountedKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        focusRow(index + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusRow(index - 1);
      }
    },
    [focusRow],
  );

  const save = useMutation({
    mutationFn: (updates: UpdateStocktakeLineInput[]) =>
      stocktakeSdk.upsertStocktakeLines({
        storeId,
        updateStocktakeLines: updates,
      }),
  });

  const onSave = handleSubmit(async values => {
    const dirtyLines = dirtyFields.lines ?? {};
    const updates: UpdateStocktakeLineInput[] = [];

    for (const id of Object.keys(dirtyLines)) {
      const d = dirtyLines[id];
      const f = values.lines[id];
      if (!d || !f) continue;
      const line = linesById.get(id);
      if (!line) continue;

      const input: UpdateStocktakeLineInput = { id };
      if (d.batch) input.batch = f.batch;
      if (d.expiry)
        input.expiryDate = { value: f.expiry === '' ? null : f.expiry };
      if (d.packSize && f.packSize !== '') input.packSize = Number(f.packSize);
      if (d.costPrice && f.costPrice !== '')
        input.costPricePerPack = Number(f.costPrice);
      if (d.sellPrice && f.sellPrice !== '')
        input.sellPricePerPack = Number(f.sellPrice);
      if (d.comment) input.comment = f.comment;

      // Count and reason must travel together: the server validates the reason
      // against the adjustment, and rejects a reason sent without its count.
      if (d.counted || d.reasonId) {
        input.countedNumberOfPacks = f.counted === '' ? null : Number(f.counted);
        const direction = adjustmentDirection(
          f.counted,
          line.snapshotNumberOfPacks,
        );
        if (direction !== null && f.reasonId) input.reasonOptionId = f.reasonId;
      }

      if (Object.keys(input).length > 1) updates.push(input);
    }

    if (!updates.length) return;

    const result = await save.mutateAsync(updates);
    const responses = result.batchStocktake.updateStocktakeLines ?? [];

    const failed: Record<string, string> = {};
    const messages = new Set<string>();
    for (const r of responses) {
      if (r.response.__typename === 'UpdateStocktakeLineError') {
        const typename = r.response.error.__typename;
        failed[r.id] = typename;
        const key = ERROR_KEYS[typename];
        messages.add(key ? t(key) : r.response.error.description);
      }
    }

    queryClient.invalidateQueries({
      queryKey: stocktakeKeys.lines(storeId, stocktakeId),
    });

    if (Object.keys(failed).length === 0) {
      setServerErrors({});
      setSnackbar(null);
      reset(values); // clean baseline without a refetch round-trip
    } else {
      // Keep edits dirty so the user can fix the flagged lines and re-save.
      setServerErrors(failed);
      setSnackbar([...messages].join(' '));
    }
  });

  const dirtyCount = Object.keys(dirtyFields.lines ?? {}).length;
  const errorCount = useMemo(
    () =>
      Object.values(errors.lines ?? {}).filter(e => e && Object.keys(e).length)
        .length,
    [errors.lines],
  );

  const renderRow = (index: number) => {
    const line = lines[index];
    const serverError = serverErrors[line.id];
    const props: RowProps = {
      line,
      index,
      register,
      control,
      reasons,
      errorField: serverError ? errorField(serverError) : undefined,
      onCountedKeyDown,
    };
    return isPhone ? <MobileCard {...props} /> : <DesktopRow {...props} />;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Typography variant="h5">
          {t('heading.stocktake', { number: header?.stocktakeNumber ?? '' })}
        </Typography>
        {header?.status ? <Chip label={header.status} size="small" /> : null}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {[
            t('messages.line-count', { value: lines.length.toLocaleString() }),
            dirtyCount
              ? t('messages.edited-count', { value: dirtyCount })
              : null,
            errorCount
              ? t('messages.invalid-count', { value: errorCount })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
        <Button
          variant="contained"
          disabled={!isDirty || errorCount > 0 || save.isPending}
          onClick={onSave}
        >
          {save.isPending ? t('button.saving') : t('button.save')}
        </Button>
      </Box>

      <Paper
        variant="outlined"
        sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        <Box ref={scrollRef} sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Box sx={{ minWidth: isPhone ? undefined : GRID_MIN_WIDTH }}>
            {!isPhone && (
              <Box
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  display: 'grid',
                  gridTemplateColumns: COLS,
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.100',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                <span>{t('label.code')}</span>
                <span>{t('label.item')}</span>
                <span>{t('label.batch')}</span>
                <span>{t('label.expiry')}</span>
                <span>{t('label.pack')}</span>
                <span style={{ textAlign: 'right' }}>{t('label.snapshot')}</span>
                <span>{t('label.counted')}</span>
                <span>{t('label.cost')}</span>
                <span>{t('label.sell')}</span>
                <span>{t('label.reason')}</span>
                <span>{t('label.comment')}</span>
              </Box>
            )}

            <Box
              sx={{
                height: virtualizer.getTotalSize(),
                position: 'relative',
                width: '100%',
              }}
            >
              {virtualizer.getVirtualItems().map(vi => {
                const line = lines[vi.index];
                return (
                  <Box
                    key={line.id}
                    sx={{
                      // Position with `top` (not `transform`): a transformed
                      // ancestor breaks native <select>/date popups in Chromium.
                      position: 'absolute',
                      top: vi.start,
                      left: 0,
                      width: '100%',
                      height: vi.size,
                      borderBottom: 1,
                      borderColor: 'divider',
                      px: 2,
                      fontSize: 13,
                      ...(isPhone
                        ? { py: 1.5 }
                        : {
                            display: 'grid',
                            gridTemplateColumns: COLS,
                            gap: 1,
                            alignItems: 'center',
                          }),
                    }}
                  >
                    {renderRow(vi.index)}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={10000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnackbar(null)} variant="filled">
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
}
