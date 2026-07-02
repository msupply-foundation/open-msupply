import { useEffect, useMemo, useState } from 'react';
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import type {
  InsertStocktakeLineInput,
  UpdateStocktakeLineInput,
} from '@/gql/schema';
import { LineEditDialog } from '@/components/detail/LineEditDialog';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  inputStyle,
  makeNonNegativeValidator,
  numericField,
} from '@/components/detail/inputs';
import { useTranslation } from '@/intl';
import { stocktakeSdk } from './api';
import { stocktakeKeys } from './queries';
import {
  adjustmentDirection,
  errorField,
  errorMessage,
  type ErrorField,
} from './errors';
import type {
  ReasonOptionRowFragment,
  StocktakeLineRowFragment,
} from './stocktake.generated';

export interface RowReasons {
  positive: ReasonOptionRowFragment[];
  negative: ReasonOptionRowFragment[];
}

// Every editable field is a string in the form; converted on save.
interface RowForm {
  lineId: string;
  isNew: boolean;
  snapshot: number;
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
  rows: RowForm[];
}

// Batch: Batch | Expiry | Pack | Snapshot | Counted | Reason | Comment
const BATCH_COLS =
  'minmax(90px,1fr) 130px 70px 80px 90px 170px minmax(120px,1fr)';
// Pricing: Batch | Cost | Sell
const PRICING_COLS = 'minmax(120px,1fr) 120px 120px';

function toRowForm(line: StocktakeLineRowFragment): RowForm {
  return {
    lineId: line.id,
    isNew: false,
    snapshot: line.snapshotNumberOfPacks,
    counted: line.countedNumberOfPacks?.toString() ?? '',
    batch: line.batch ?? '',
    expiry: line.expiryDate ?? '',
    packSize: line.packSize?.toString() ?? '',
    costPrice: line.costPricePerPack?.toString() ?? '',
    sellPrice: line.sellPricePerPack?.toString() ?? '',
    comment: line.comment ?? '',
    reasonId: line.reasonOption?.id ?? '',
  };
}

function newRow(defaultPackSize: number): RowForm {
  return {
    lineId: crypto.randomUUID(),
    isNew: true,
    snapshot: 0,
    counted: '',
    batch: '',
    expiry: '',
    // Seed the item's default pack size (parity with the legacy add-batch flow).
    packSize: defaultPackSize ? defaultPackSize.toString() : '1',
    costPrice: '',
    sellPrice: '',
    comment: '',
    reasonId: '',
  };
}

// The reason must match the adjustment direction, otherwise the server rejects
// it; a stale wrong-sign id must not be submitted.
function validReasonId(
  counted: string,
  snapshot: number,
  reasonId: string,
  reasons: RowReasons,
): string | undefined {
  const direction = adjustmentDirection(counted, snapshot);
  if (!direction || !reasonId) return undefined;
  const list =
    direction === 'positive' ? reasons.positive : reasons.negative;
  return list.some(r => r.id === reasonId) ? reasonId : undefined;
}

function buildUpdate(
  row: RowForm,
  dirty: Partial<Record<keyof RowForm, boolean | undefined>>,
  reasons: RowReasons,
): UpdateStocktakeLineInput | null {
  const input: UpdateStocktakeLineInput = { id: row.lineId };
  if (dirty.batch) input.batch = row.batch;
  if (dirty.expiry)
    input.expiryDate = { value: row.expiry === '' ? null : row.expiry };
  if (dirty.packSize && row.packSize !== '')
    input.packSize = Number(row.packSize);
  if (dirty.costPrice && row.costPrice !== '')
    input.costPricePerPack = Number(row.costPrice);
  if (dirty.sellPrice && row.sellPrice !== '')
    input.sellPricePerPack = Number(row.sellPrice);
  if (dirty.comment) input.comment = row.comment;
  // Count and reason travel together: the server rejects a reason without its
  // count change, and validates the reason against the adjustment direction.
  if (dirty.counted || dirty.reasonId) {
    input.countedNumberOfPacks = row.counted === '' ? null : Number(row.counted);
    const reasonId = validReasonId(
      row.counted,
      row.snapshot,
      row.reasonId,
      reasons,
    );
    if (reasonId) input.reasonOptionId = reasonId;
  }
  return Object.keys(input).length > 1 ? input : null;
}

function buildInsert(
  row: RowForm,
  stocktakeId: string,
  itemId: string,
  reasons: RowReasons,
): InsertStocktakeLineInput | null {
  // Only insert a new batch the user actually populated.
  if (row.counted === '' && row.batch === '') return null;
  const input: InsertStocktakeLineInput = {
    id: row.lineId,
    stocktakeId,
    itemId,
  };
  if (row.batch) input.batch = row.batch;
  if (row.expiry) input.expiryDate = row.expiry;
  if (row.packSize !== '') input.packSize = Number(row.packSize);
  if (row.costPrice !== '') input.costPricePerPack = Number(row.costPrice);
  if (row.sellPrice !== '') input.sellPricePerPack = Number(row.sellPrice);
  if (row.comment) input.comment = row.comment;
  if (row.counted !== '') {
    input.countedNumberOfPacks = Number(row.counted);
    const reasonId = validReasonId(
      row.counted,
      row.snapshot,
      row.reasonId,
      reasons,
    );
    if (reasonId) input.reasonOptionId = reasonId;
  }
  return input;
}

interface RowProps {
  index: number;
  row: RowForm;
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  reasons: RowReasons;
  invalid: ErrorField | undefined;
}

function ReasonCell({
  index,
  row,
  register,
  control,
  setValue,
  reasons,
  invalid,
}: RowProps) {
  const { t } = useTranslation();
  const counted = useWatch({ control, name: `rows.${index}.counted` });
  const reasonId = useWatch({ control, name: `rows.${index}.reasonId` });
  const direction = adjustmentDirection(counted ?? '', row.snapshot);
  const list = useMemo(
    () =>
      direction === 'positive'
        ? reasons.positive
        : direction === 'negative'
          ? reasons.negative
          : [],
    [direction, reasons],
  );
  const active = direction !== null;
  // Drop a reason that no longer matches the adjustment direction so it isn't
  // submitted and the select reflects the empty value.
  useEffect(() => {
    if (reasonId && !list.some(r => r.id === reasonId)) {
      setValue(`rows.${index}.reasonId`, '', { shouldDirty: false });
    }
  }, [reasonId, list, setValue, index]);
  return (
    <select
      {...register(`rows.${index}.reasonId`)}
      disabled={!active}
      aria-invalid={invalid === 'reason'}
      style={{
        ...inputStyle(invalid === 'reason'),
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

function BatchRow(props: RowProps) {
  const { index, row, register, invalid } = props;
  const { t } = useTranslation();
  const numericReg = useMemo(() => ({ validate: makeNonNegativeValidator(t) }), [t]);
  return (
    <div
      className="grid items-center gap-2 border-b px-1 py-1 text-[13px]"
      style={{ gridTemplateColumns: BATCH_COLS }}
    >
      <input style={inputStyle(false)} {...register(`rows.${index}.batch`)} />
      <input
        type="date"
        style={inputStyle(false)}
        {...register(`rows.${index}.expiry`)}
      />
      <input
        type="text"
        style={inputStyle(false)}
        {...numericField(register(`rows.${index}.packSize`, numericReg))}
      />
      <span
        className="text-right"
        style={{
          color: invalid === 'snapshot' ? '#d32f2f' : undefined,
          fontWeight: invalid === 'snapshot' ? 600 : undefined,
        }}
      >
        {row.isNew ? '—' : row.snapshot}
      </span>
      <input
        type="text"
        style={inputStyle(invalid === 'counted')}
        {...numericField(register(`rows.${index}.counted`, numericReg))}
      />
      <ReasonCell {...props} />
      <input style={inputStyle(false)} {...register(`rows.${index}.comment`)} />
    </div>
  );
}

function PricingRow({ index, register }: RowProps) {
  const { t } = useTranslation();
  const numericReg = useMemo(() => ({ validate: makeNonNegativeValidator(t) }), [t]);
  return (
    <div
      className="grid items-center gap-2 border-b px-1 py-1 text-[13px]"
      style={{ gridTemplateColumns: PRICING_COLS }}
    >
      <input style={inputStyle(false)} {...register(`rows.${index}.batch`)} />
      <input
        type="text"
        style={inputStyle(false)}
        {...numericField(register(`rows.${index}.costPrice`, numericReg))}
      />
      <input
        type="text"
        style={inputStyle(false)}
        {...numericField(register(`rows.${index}.sellPrice`, numericReg))}
      />
    </div>
  );
}

interface Props {
  storeId: string;
  stocktakeId: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  itemLines: StocktakeLineRowFragment[];
  reasons: RowReasons;
  onClose: () => void;
}

/**
 * Per-item, multi-batch line editor (parity with the legacy stocktake modal).
 * Opens for one item, edits all its batch rows across Batch / Pricing tabs, and
 * supports adding new batches. Uses its own RHF form; on save it writes through
 * `batchStocktake` (insert + update) and invalidates the lines query — the
 * inline grid re-syncs from cache (see StocktakeGrid's reset effect).
 */
export function StocktakeLineEditModal({
  storeId,
  stocktakeId,
  itemId,
  itemName,
  itemCode,
  itemLines,
  reasons,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const defaultValues = useMemo<FormValues>(
    () => ({ rows: itemLines.map(toRowForm) }),
    [itemLines],
  );
  const defaultPackSize = itemLines[0]?.item.defaultPackSize ?? 1;

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues, mode: 'onChange' });
  const { fields, append } = useFieldArray({
    control,
    name: 'rows',
    keyName: 'key',
  });

  // lineId -> server error __typename from the last save.
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (vars: {
      insertStocktakeLines?: InsertStocktakeLineInput[];
      updateStocktakeLines?: UpdateStocktakeLineInput[];
    }) => stocktakeSdk.saveStocktakeLines({ storeId, ...vars }),
  });

  const onOk = handleSubmit(async values => {
    const dirty = (control._formState.dirtyFields.rows ?? []) as Array<
      Partial<Record<keyof RowForm, boolean>>
    >;
    const inserts: InsertStocktakeLineInput[] = [];
    const updates: UpdateStocktakeLineInput[] = [];

    values.rows.forEach((row, i) => {
      if (row.isNew) {
        const insert = buildInsert(row, stocktakeId, itemId, reasons);
        if (insert) inserts.push(insert);
      } else if (dirty[i]) {
        const update = buildUpdate(row, dirty[i], reasons);
        if (update) updates.push(update);
      }
    });

    if (!inserts.length && !updates.length) {
      onClose();
      return;
    }

    const res = await save.mutateAsync({
      insertStocktakeLines: inserts.length ? inserts : undefined,
      updateStocktakeLines: updates.length ? updates : undefined,
    });

    const batch = res.batchStocktake;
    const failed: Record<string, string> = {};
    const messages = new Set<string>();
    if (batch.__typename === 'BatchStocktakeResponse') {
      for (const r of batch.insertStocktakeLines ?? []) {
        if (r.response.__typename === 'InsertStocktakeLineError') {
          const typename = r.response.error.__typename;
          failed[r.id] = typename;
          messages.add(errorMessage(t, typename, r.response.error.description));
        }
      }
      for (const r of batch.updateStocktakeLines ?? []) {
        if (r.response.__typename === 'UpdateStocktakeLineError') {
          const typename = r.response.error.__typename;
          failed[r.id] = typename;
          messages.add(errorMessage(t, typename, r.response.error.description));
        }
      }
    }

    if (Object.keys(failed).length === 0) {
      // Only refetch on success: batchStocktake is transactional, so a partial
      // failure committed nothing and the form state is still correct to retry.
      queryClient.invalidateQueries({
        queryKey: stocktakeKeys.lines(storeId, stocktakeId),
      });
      onClose();
    } else {
      setServerErrors(failed);
      toast.error([...messages].join(' '));
    }
  });

  const errorCount = Object.values(errors.rows ?? {}).filter(
    e => e && Object.keys(e).length,
  ).length;

  return (
    <LineEditDialog
      open
      title={`${itemCode}  ${itemName}`}
      okLabel={t('button.save')}
      onClose={onClose}
      onOk={onOk}
      okDisabled={errorCount > 0}
      saving={save.isPending}
      maxWidth="lg"
    >
      <Tabs defaultValue="batch">
        <TabsList>
          <TabsTrigger value="batch">{t('label.batch')}</TabsTrigger>
          <TabsTrigger value="pricing">{t('label.pricing')}</TabsTrigger>
        </TabsList>

        {/* forceMount both panels so switching tabs hides/shows via CSS instead
            of unmounting + remounting every batch row (which tore down the DOM,
            re-ran per-row effects, and lost input focus). Radix sets data-state
            on the content element; hide the inactive one. */}
        <TabsContent
          value="batch"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          <div className="overflow-x-auto">
            <div className="min-w-190">
              <div
                className="grid gap-2 border-b px-1 py-1 text-xs font-semibold text-muted-foreground"
                style={{ gridTemplateColumns: BATCH_COLS }}
              >
                <span>{t('label.batch')}</span>
                <span>{t('label.expiry')}</span>
                <span>{t('label.pack')}</span>
                <span className="text-right">{t('label.snapshot')}</span>
                <span>{t('label.counted')}</span>
                <span>{t('label.reason')}</span>
                <span>{t('label.comment')}</span>
              </div>
              {fields.map((f, i) => (
                <BatchRow
                  key={f.key}
                  index={i}
                  row={f}
                  register={register}
                  control={control}
                  setValue={setValue}
                  reasons={reasons}
                  invalid={
                    serverErrors[f.lineId]
                      ? errorField(serverErrors[f.lineId])
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
          <div className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(newRow(defaultPackSize))}
            >
              <PlusIcon />
              {t('button.add-batch')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent
          value="pricing"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          <div className="overflow-x-auto">
            <div className="min-w-90">
              <div
                className="grid gap-2 border-b px-1 py-1 text-xs font-semibold text-muted-foreground"
                style={{ gridTemplateColumns: PRICING_COLS }}
              >
                <span>{t('label.batch')}</span>
                <span>{t('label.cost-price')}</span>
                <span>{t('label.sell-price')}</span>
              </div>
              {fields.map((f, i) => (
                <PricingRow
                  key={f.key}
                  index={i}
                  row={f}
                  register={register}
                  control={control}
                  setValue={setValue}
                  reasons={reasons}
                  invalid={undefined}
                />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </LineEditDialog>
  );
}
