import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import { formatNumber, t } from '@/intl';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { TextField } from '@/ui/elements/inputs/TextField';
import { DateField } from '@/ui/elements/inputs/DateField';
import { type Column } from '@/ui/elements/table/DataTable';
import {
  getCellDefinition,
  getDateCell,
  getNumberCell,
} from '@/ui/elements/table/tableHelpers';
import { remToPx } from '@/ui/utils/rem';
import { StatusMarker } from '@/ui/elements/feedback/StatusMarker';
import { InfoTooltip } from '@/ui/elements/feedback/InfoTooltip';
import type { LocaleKey } from '@/intl';
import { lineHasError, type DraftRnrLine } from './rnrFormEdit';

// The R&R form line table's columns (spec/rnr-forms/ui-surface.md S3 § line
// table): one row per program item, white editable cells over a draft store,
// grey derived cells recomputed live by the host. The host owns the store and
// the recompute; the columns only call back — one field of one row
// (kdd/solid-reactivity-pitfalls § editable collections).

/** Edit ONE field of ONE draft line (a fine-grained store write). */
export type UpdateRnrLine = <F extends keyof DraftRnrLine>(
  id: string,
  field: F,
  value: DraftRnrLine[F]
) => void;

export type RnrLineColumnOptions = {
  /** FINALISED, or saving the finalise — every editable cell disables. */
  disabled: () => boolean;
  /** The period length in days — the stock-out duration input's cap. */
  periodLength: () => number;
  update: UpdateRnrLine;
};

// A column header with its info tooltip (ui-surface S3 — the description.rnr-*
// glosses ride the headers).
const headerWithInfo = (labelKey: LocaleKey, infoKey: LocaleKey) => () => (
  <span style={{ display: 'inline-flex', 'align-items': 'center' }}>
    {t(labelKey)}
    <InfoTooltip text={t(infoKey)} label={t(labelKey)} />
  </span>
);

// A derived numeric value, flagged with a marker when the line is in error
// (OMS-REG-REPL-07.46 — never colour alone).
const derivedNumber = (
  value: number,
  marker?: { severity: 'error' | 'warning'; label: string }
): JSX.Element => (
  <span
    style={{
      display: 'inline-flex',
      'align-items': 'center',
      gap: '0.25rem',
    }}
  >
    {formatNumber(value)}
    <Show when={marker}>
      {m => <StatusMarker severity={m().severity} label={m().label} />}
    </Show>
  </span>
);

export const rnrFormLineColumns = ({
  disabled,
  periodLength,
  update,
}: RnrLineColumnOptions): Column<DraftRnrLine, never>[] => [
  {
    c: { accessor: line => line.item.code, id: 'code' },
    header: () => t('label.code'),
    ...getCellDefinition('itemCode', { headerPosition: 'primary' }),
  },
  {
    c: { accessor: line => line.item.name, id: 'name' },
    header: () => t('label.name'),
    meta: { wrapLines: 2 },
    size: remToPx(14),
  },
  {
    c: { accessor: line => line.item.unitName ?? '', id: 'unit' },
    header: () => t('label.unit'),
    size: remToPx(5),
  },
  {
    // Blank when unassigned (ui-surface S3).
    c: {
      accessor: line =>
        line.item.venCategory === 'NOT_ASSIGNED' ? '' : line.item.venCategory,
      id: 'ven',
    },
    header: () => t('label.ven'),
    size: remToPx(4),
  },
  {
    c: { key: 'initialBalance' },
    header: headerWithInfo(
      'label.rnr-initial-balance',
      'description.rnr-initial-balance'
    ),
    ...getNumberCell(),
    size: remToPx(8),
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          label={t('label.rnr-initial-balance')}
          hideLabel
          size="small"
          disabled={disabled()}
          value={line.initialBalance}
          onChange={v => update(line.id, 'initialBalance', v ?? 0)}
        />
      );
    },
  },
  {
    c: { key: 'quantityReceived' },
    header: headerWithInfo('label.rnr-received', 'description.rnr-received'),
    ...getNumberCell(),
    size: remToPx(8),
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          label={t('label.rnr-received')}
          hideLabel
          size="small"
          disabled={disabled()}
          value={line.quantityReceived}
          onChange={v => update(line.id, 'quantityReceived', v ?? 0)}
        />
      );
    },
  },
  {
    c: { key: 'quantityConsumed' },
    header: headerWithInfo('label.rnr-consumed', 'description.rnr-consumed'),
    ...getNumberCell(),
    size: remToPx(8),
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          label={t('label.rnr-consumed')}
          hideLabel
          size="small"
          disabled={disabled()}
          value={line.quantityConsumed}
          onChange={v => update(line.id, 'quantityConsumed', v ?? 0)}
        />
      );
    },
  },
  {
    // Derived: the stock-out-adjusted consumption (rules § line generation).
    c: { key: 'adjustedQuantityConsumed' },
    header: headerWithInfo(
      'label.adjusted',
      'description.rnr-consumed-adjusted'
    ),
    ...getNumberCell(),
    size: remToPx(7),
    cell: info => derivedNumber(info.row.original.adjustedQuantityConsumed),
  },
  {
    c: { key: 'losses' },
    header: headerWithInfo('label.losses', 'description.rnr-losses'),
    ...getNumberCell(),
    size: remToPx(7),
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          label={t('label.losses')}
          hideLabel
          size="small"
          disabled={disabled()}
          value={line.losses}
          onChange={v => update(line.id, 'losses', v ?? 0)}
        />
      );
    },
  },
  {
    c: { key: 'adjustments' },
    header: headerWithInfo(
      'label.rnr-adjustments',
      'description.rnr-adjustments'
    ),
    ...getNumberCell(),
    size: remToPx(8),
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          label={t('label.rnr-adjustments')}
          hideLabel
          size="small"
          allowNegative
          disabled={disabled()}
          value={line.adjustments}
          onChange={v => update(line.id, 'adjustments', v ?? 0)}
        />
      );
    },
  },
  {
    c: { key: 'stockOutDuration' },
    header: () => t('label.rnr-stock-out-duration'),
    ...getNumberCell(),
    size: remToPx(7),
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          label={t('label.rnr-stock-out-duration')}
          hideLabel
          size="small"
          decimalLimit={0}
          max={periodLength()}
          disabled={disabled()}
          value={line.stockOutDuration}
          onChange={v => update(line.id, 'stockOutDuration', v ?? 0)}
        />
      );
    },
  },
  {
    // Derived; the error marker when the balance identity lands negative
    // (OMS-REG-REPL-07.46).
    c: { key: 'finalBalance' },
    header: headerWithInfo(
      'label.rnr-final-balance',
      'description.rnr-final-balance'
    ),
    ...getNumberCell(),
    size: remToPx(8),
    cell: info => {
      const line = info.row.original;
      return derivedNumber(
        line.finalBalance,
        lineHasError(line)
          ? { severity: 'error', label: t('error.rnr-has-errors') }
          : undefined
      );
    },
  },
  {
    c: { key: 'averageMonthlyConsumption' },
    header: headerWithInfo('label.amc', 'description.rnr-amc'),
    ...getNumberCell(),
    size: remToPx(6),
    cell: info => derivedNumber(info.row.original.averageMonthlyConsumption),
  },
  {
    c: { key: 'minimumQuantity' },
    header: headerWithInfo(
      'label.rnr-minimum-quantity',
      'description.rnr-minimum-quantity'
    ),
    ...getNumberCell(),
    size: remToPx(7),
    cell: info => derivedNumber(info.row.original.minimumQuantity),
  },
  {
    c: { key: 'maximumQuantity' },
    header: headerWithInfo(
      'label.rnr-maximum-quantity',
      'description.rnr-maximum-quantity'
    ),
    ...getNumberCell(),
    size: remToPx(7),
    cell: info => derivedNumber(info.row.original.maximumQuantity),
  },
  {
    c: { key: 'expiryDate' },
    header: headerWithInfo('label.expiry', 'description.expiry'),
    ...getDateCell(),
    size: remToPx(10),
    cell: info => {
      const line = info.row.original;
      return (
        <DateField
          label={t('label.expiry')}
          hideLabel
          size="small"
          disabled={disabled()}
          value={line.expiryDate}
          onChange={v => update(line.id, 'expiryDate', v || null)}
        />
      );
    },
  },
  {
    // Shows the entered value over the calculated one (ui-surface S3; the
    // generated order takes the same fallback — rules § finalise effects).
    c: {
      accessor: line =>
        line.enteredRequestedQuantity ?? line.calculatedRequestedQuantity,
      id: 'requested',
    },
    header: headerWithInfo(
      'label.requested',
      'description.rnr-requested-quantity'
    ),
    ...getNumberCell(),
    size: remToPx(8),
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          label={t('label.requested')}
          hideLabel
          size="small"
          disabled={disabled()}
          value={
            line.enteredRequestedQuantity ?? line.calculatedRequestedQuantity
          }
          onChange={v => update(line.id, 'enteredRequestedQuantity', v ?? null)}
        />
      );
    },
  },
  {
    // Severe below a quarter of maximum, mild below half (rules § line
    // generation); the marker carries its meaning, never colour alone.
    c: { key: 'lowStock' },
    header: headerWithInfo('label.low-stock', 'description.rnr-low-stock'),
    size: remToPx(5),
    meta: { align: 'center' },
    cell: info => (
      <Show when={info.row.original.lowStock !== 'OK'}>
        <StatusMarker
          severity={
            info.row.original.lowStock === 'BELOW_QUARTER' ? 'error' : 'warning'
          }
          label={t('label.low-stock')}
        />
      </Show>
    ),
  },
  {
    c: { key: 'comment' },
    header: () => t('label.comment'),
    size: remToPx(10),
    cell: info => {
      const line = info.row.original;
      return (
        <TextField
          label={t('label.comment')}
          hideLabel
          size="small"
          disabled={disabled()}
          value={line.comment ?? ''}
          onInput={e => update(line.id, 'comment', e.currentTarget.value)}
        />
      );
    },
  },
  {
    // From the generated order's approval flow — blank until finalised
    // (contract § finalise effects).
    c: { accessor: line => line.approvedQuantity ?? undefined, id: 'approved' },
    header: headerWithInfo(
      'label.approved-quantity',
      'description.rnr-approved-quantity'
    ),
    ...getNumberCell(),
    size: remToPx(7),
  },
];
