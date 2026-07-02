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
  type UseFormSetValue,
} from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PencilIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  ReasonOptionNodeType,
  type UpdateStocktakeLineInput,
} from '@/gql/schema';
import { numericField } from '@/components/detail/inputs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/detail/useConfirm';
import { useIsPhone } from '@/hooks/useMediaQuery';
import { useTranslation } from '@/intl';
import type { TFunction } from 'i18next';
import { stocktakeSdk } from './api';
import { reasonOptionsQueryOptions, stocktakeKeys } from './queries';
import {
  adjustmentDirection,
  errorField,
  errorMessage,
  type ErrorField,
} from './errors';
import { StocktakeLineEditModal, type RowReasons } from './StocktakeLineEditModal';
import type {
  ReasonOptionRowFragment,
  StocktakeLineRowFragment,
  StocktakeRowFragment,
} from './stocktake.generated';

const route = getRouteApi('/_authenticated/$storeId/stocktake/$stocktakeId');

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

// Code | Item | Batch | Expiry | Pack | Snapshot | Counted | Cost | Sell | Reason | Comment | Edit
const COLS =
  '90px minmax(160px, 1.4fr) 110px 140px 70px 90px 95px 90px 90px 170px 150px 48px';
const GRID_MIN_WIDTH = 1288;
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

interface RowProps {
  line: StocktakeLineRowFragment;
  index: number;
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  reasons: RowReasons;
  errorField: ErrorField | undefined;
  onCountedKeyDown: (e: KeyboardEvent<HTMLInputElement>, index: number) => void;
  onEdit: (itemId: string) => void;
  setValue: UseFormSetValue<FormValues>;
}

// A reason is only relevant (and only required by the server) when the count
// differs from the snapshot. The select stays present but disabled otherwise so
// the row keeps a constant height for virtualization.
function useRowReasons(
  control: Control<FormValues>,
  setValue: UseFormSetValue<FormValues>,
  line: StocktakeLineRowFragment,
  reasons: RowReasons,
) {
  const counted = useWatch({ control, name: `lines.${line.id}.counted` });
  const reasonId = useWatch({ control, name: `lines.${line.id}.reasonId` });
  const direction = adjustmentDirection(
    counted ?? '',
    line.snapshotNumberOfPacks,
  );
  const list = useMemo(
    () =>
      direction === 'positive'
        ? reasons.positive
        : direction === 'negative'
          ? reasons.negative
          : [],
    [direction, reasons],
  );
  // Clear a reason that no longer matches the adjustment direction (e.g. the
  // count crossed the snapshot): a wrong-sign reason would be rejected by the
  // server, and the select must reflect the now-empty value.
  useEffect(() => {
    if (reasonId && !list.some(r => r.id === reasonId)) {
      setValue(`lines.${line.id}.reasonId`, '', { shouldDirty: false });
    }
  }, [reasonId, list, setValue, line.id]);
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
  onEdit,
  setValue,
}: RowProps) {
  const { t } = useTranslation();
  const numericReg = useMemo(() => ({ validate: makeValidateNonNeg(t) }), [t]);
  const reason = useRowReasons(control, setValue, line, reasons);
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
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('button.edit')}
        onClick={() => onEdit(line.item.id)}
      >
        <PencilIcon className="size-4" />
      </Button>
    </>
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

function MobileCard({
  line,
  index,
  register,
  control,
  reasons,
  errorField: errField,
  onCountedKeyDown,
  onEdit,
  setValue,
}: RowProps) {
  const { t } = useTranslation();
  const numericReg = useMemo(() => ({ validate: makeValidateNonNeg(t) }), [t]);
  const reason = useRowReasons(control, setValue, line, reasons);
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="flex-1 truncate text-sm font-semibold">
          {line.item.name}
        </span>
        <span className="text-xs text-muted-foreground">{line.item.code}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('button.edit')}
          onClick={() => onEdit(line.item.id)}
        >
          <PencilIcon className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
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
            {...numericField(
              register(`lines.${line.id}.costPrice`, numericReg),
            )}
          />
        </CardField>
        <CardField label={t('label.sell-price')}>
          <input
            type="text"
            style={inputBase}
            {...numericField(
              register(`lines.${line.id}.sellPrice`, numericReg),
            )}
          />
        </CardField>
      </div>
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
    </div>
  );
}

export function StocktakeGrid({ storeId, stocktakeId, header, lines }: Props) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isPhone = useIsPhone();
  const { editItemId } = route.useSearch();
  const navigate = route.useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();

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

  const linesById = useMemo(() => new Map(lines.map(l => [l.id, l])), [lines]);

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
    resetField,
    setValue,
    formState: { dirtyFields, isDirty, errors },
  } = useForm<FormValues>({ defaultValues, mode: 'onChange' });

  // lineId -> server error __typename from the last save.
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  // Re-baseline the inline form when the lines query changes (e.g. after the
  // per-item modal saves and invalidates): apply the new server values but keep
  // any unsaved inline edits. Skip the first run (useForm already seeded it).
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      return;
    }
    reset(defaultValues, { keepDirtyValues: true });
  }, [defaultValues, reset]);

  const editItemLines = useMemo(
    () => (editItemId ? lines.filter(l => l.item.id === editItemId) : []),
    [editItemId, lines],
  );
  const editItem = editItemLines[0]?.item;

  // Open the per-item editor. If the item has unsaved inline edits they won't
  // appear in the modal (it reads server values), so confirm — and on confirm
  // actually drop them, otherwise the resync effect's keepDirtyValues would
  // revive them and clobber whatever the modal saves.
  const openEditor = async (itemId: string) => {
    const dirtyLineIds = lines
      .filter(l => l.item.id === itemId && dirtyFields.lines?.[l.id])
      .map(l => l.id);
    if (dirtyLineIds.length) {
      const ok = await confirm({ message: t('messages.discard-inline-edits') });
      if (!ok) return;
      dirtyLineIds.forEach(id => resetField(`lines.${id}`));
    }
    navigate({ search: prev => ({ ...prev, editItemId: itemId }) });
  };
  const closeEditor = () =>
    navigate({ search: prev => ({ ...prev, editItemId: undefined }) });

  // Self-heal a stale/invalid editItemId (deep link, or the item's lines were
  // removed) so it doesn't linger in the URL doing nothing.
  useEffect(() => {
    if (editItemId && !editItem) {
      navigate({
        search: prev => ({ ...prev, editItemId: undefined }),
        replace: true,
      });
    }
  }, [editItemId, editItem, navigate]);

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
        input.countedNumberOfPacks =
          f.counted === '' ? null : Number(f.counted);
        const direction = adjustmentDirection(
          f.counted,
          line.snapshotNumberOfPacks,
        );
        // Only send a reason that matches the adjustment direction — a stale
        // wrong-sign reason would be rejected by the server.
        const validReasons =
          direction === 'positive'
            ? reasons.positive
            : direction === 'negative'
              ? reasons.negative
              : [];
        if (f.reasonId && validReasons.some(r => r.id === f.reasonId))
          input.reasonOptionId = f.reasonId;
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
        messages.add(errorMessage(t, typename, r.response.error.description));
      }
    }

    queryClient.invalidateQueries({
      queryKey: stocktakeKeys.lines(storeId, stocktakeId),
    });

    if (Object.keys(failed).length === 0) {
      setServerErrors({});
      reset(values); // clean baseline without a refetch round-trip
    } else {
      // Keep edits dirty so the user can fix the flagged lines and re-save.
      setServerErrors(failed);
      toast.error([...messages].join(' '));
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
      onEdit: openEditor,
      setValue,
    };
    return isPhone ? <MobileCard {...props} /> : <DesktopRow {...props} />;
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">
          {t('heading.stocktake', { number: header?.stocktakeNumber ?? '' })}
        </h1>
        {header?.status ? (
          <Badge variant="secondary">{header.status}</Badge>
        ) : null}
        <div className="grow" />
        <span className="text-sm text-muted-foreground">
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
        </span>
        <Button
          disabled={!isDirty || errorCount > 0 || save.isPending}
          onClick={onSave}
        >
          {save.isPending ? t('button.saving') : t('button.save')}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-md border bg-card">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
          <div style={{ minWidth: isPhone ? undefined : GRID_MIN_WIDTH }}>
            {!isPhone && (
              <div
                className="sticky top-0 z-10 grid gap-2 border-b bg-muted px-4 py-2 text-[13px] font-semibold"
                style={{ gridTemplateColumns: COLS }}
              >
                <span>{t('label.code')}</span>
                <span>{t('label.item')}</span>
                <span>{t('label.batch')}</span>
                <span>{t('label.expiry')}</span>
                <span>{t('label.pack')}</span>
                <span className="text-right">{t('label.snapshot')}</span>
                <span>{t('label.counted')}</span>
                <span>{t('label.cost')}</span>
                <span>{t('label.sell')}</span>
                <span>{t('label.reason')}</span>
                <span>{t('label.comment')}</span>
                <span />
              </div>
            )}

            <div
              className="relative w-full"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map(vi => {
                const line = lines[vi.index];
                return (
                  <div
                    key={line.id}
                    className={
                      isPhone
                        ? 'absolute left-0 w-full border-b px-4 py-3 text-[13px]'
                        : 'absolute left-0 grid w-full items-center gap-2 border-b px-4 text-[13px]'
                    }
                    style={{
                      // Position with `top` (not `transform`): a transformed
                      // ancestor breaks native <select>/date popups in Chromium.
                      top: vi.start,
                      height: vi.size,
                      ...(isPhone ? {} : { gridTemplateColumns: COLS }),
                    }}
                  >
                    {renderRow(vi.index)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {confirmDialog}
      {editItemId && editItem ? (
        <StocktakeLineEditModal
          key={editItemId}
          storeId={storeId}
          stocktakeId={stocktakeId}
          itemId={editItemId}
          itemName={editItem.name}
          itemCode={editItem.code}
          itemLines={editItemLines}
          reasons={reasons}
          onClose={closeEditor}
        />
      ) : null}
    </div>
  );
}
