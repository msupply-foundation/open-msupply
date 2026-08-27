import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import { formatNumber, t } from '@/intl';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { TextField } from '@/ui/elements/inputs/TextField';
import { DateField } from '@/ui/elements/inputs/DateField';
import { type Column } from '@/ui/elements/table/DataTable';
import {
  getCellDefinition,
  getNumberCell,
} from '@/ui/elements/table/tableHelpers';
import { remToPx } from '@/ui/utils/rem';
import { HStack } from '@/ui/layout/Stack/HStack';
import { StatusMarker } from '@/ui/elements/feedback/StatusMarker';
import { InfoTooltip } from '@/ui/elements/feedback/InfoTooltip';
import type { LocaleKey } from '@/intl';
import { type DraftRnrLine, type EditableRnrField } from './rnrFormEdit';

// The R&R form line table's columns (spec/rnr-forms/ui-surface.md S3 § line
// table): one row per program item, editable cells over a draft store, derived
// cells recomputed live by the host. The host owns the store and the
// recompute; the columns only call back — one field of one row
// (kdd/solid-reactivity-pitfalls § editable collections).

/** Edit ONE field of ONE draft line (a fine-grained store write) —
 * restricted to the columns the user can type into. */
export type UpdateRnrLine = <F extends EditableRnrField>(
  id: string,
  field: F,
  value: DraftRnrLine[F]
) => void;

// Client-side sort (the bounded in-memory working set — the line set arrives
// whole): the host holds the SortState and orders rows via sortValue.
export type RnrLineSortKey =
  | 'code'
  | 'name'
  | 'initialBalance'
  | 'quantityReceived'
  | 'quantityConsumed'
  | 'adjustedQuantityConsumed'
  | 'losses'
  | 'adjustments'
  | 'stockOutDuration'
  | 'finalBalance'
  | 'averageMonthlyConsumption'
  | 'minimumQuantity'
  | 'maximumQuantity'
  | 'expiryDate'
  | 'requested'
  | 'approved';

export const sortValue = (
  line: DraftRnrLine,
  key: RnrLineSortKey
): string | number => {
  switch (key) {
    case 'code':
      return line.item.code.toLowerCase();
    case 'name':
      return line.item.name.toLowerCase();
    case 'expiryDate':
      return line.expiryDate ?? '';
    case 'requested':
      return line.enteredRequestedQuantity ?? line.calculatedRequestedQuantity;
    case 'approved':
      return line.approvedQuantity ?? 0;
    default:
      return line[key];
  }
};

export type RnrLineColumnOptions = {
  /** FINALISED, or saving the finalise — every editable cell disables. */
  disabled: () => boolean;
  /** The period length in days — the stock-out duration input's cap. */
  periodLength: () => number;
  update: UpdateRnrLine;
};

// A column header with its info tooltip (ui-surface S3 — the description.rnr-*
// glosses ride the headers). justify follows the column's alignment (these
// headers sit on right-aligned numeric columns bar the centred lowStock).
const headerWithInfo =
  (
    labelKey: LocaleKey,
    infoKey: LocaleKey,
    justify: 'end' | 'center' = 'end'
  ) =>
  () => (
    <HStack gap="sm" justify={justify}>
      {t(labelKey)}
      <InfoTooltip text={t(infoKey)} label={t(labelKey)} />
    </HStack>
  );

// A derived numeric value, flagged with a marker when it is in error
// (OMS-REG-REPL-07.46 — never colour alone). The marker leads and the number
// keeps the cell's inline-end edge, matching the numeric preset's alignment.
const derivedNumber = (
  value: number,
  marker?: { severity: 'error' | 'warning'; label: string }
): JSX.Element => (
  <HStack gap="sm" justify="end">
    <Show when={marker}>
      {m => <StatusMarker severity={m().severity} label={m().label} />}
    </Show>
    {formatNumber(value)}
  </HStack>
);

export const rnrFormLineColumns = ({
  disabled,
  periodLength,
  update,
}: RnrLineColumnOptions): Column<DraftRnrLine, RnrLineSortKey, 'more'>[] => [
  {
    c: { accessor: line => line.item.code, id: 'code' },
    sortKey: 'code',
    header: () => t('label.code'),
    ...getCellDefinition('itemCode'),
  },
  {
    // The card-primary column: the item name titles the sub-600px card.
    c: { accessor: line => line.item.name, id: 'name' },
    sortKey: 'name',
    header: () => t('label.name'),
    ...getCellDefinition('itemName', {
      headerPosition: 'primary',
      wrapLines: 2,
    }),
  },
  {
    c: { accessor: line => line.item.unitName ?? '', id: 'unit' },
    header: () => t('label.unit'),
    cardGroup: 'more',
    ...getCellDefinition('unitName'),
  },
  {
    // Blank when unassigned (ui-surface S3).
    c: {
      accessor: line =>
        line.item.venCategory === 'NOT_ASSIGNED' ? '' : line.item.venCategory,
      id: 'ven',
    },
    header: () => t('label.ven'),
    cardGroup: 'more',
    size: remToPx(4),
  },
  {
    c: { key: 'initialBalance' },
    sortKey: 'initialBalance',
    header: headerWithInfo(
      'label.rnr-initial-balance',
      'description.rnr-initial-balance'
    ),
    ...getNumberCell(),
    size: remToPx(8),
    cardGroup: 'more',
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          label={t('label.rnr-initial-balance')}
          hideLabel
          size="small"
          disabled={disabled()}
          value={line.initialBalance}
          // A negative generated balance is an error state on THIS cell
          // (ui-surface S3/S4 — the line is withheld from save until fixed).
          error={
            line.initialBalance < 0
              ? t('error.rnr-negative-balance')
              : undefined
          }
          onChange={v => update(line.id, 'initialBalance', v ?? 0)}
        />
      );
    },
  },
  {
    c: { key: 'quantityReceived' },
    sortKey: 'quantityReceived',
    header: headerWithInfo('label.rnr-received', 'description.rnr-received'),
    ...getNumberCell(),
    size: remToPx(8),
    cardGroup: 'more',
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
    sortKey: 'quantityConsumed',
    header: headerWithInfo('label.rnr-consumed', 'description.rnr-consumed'),
    ...getNumberCell(),
    size: remToPx(8),
    cardGroup: 'more',
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
    sortKey: 'adjustedQuantityConsumed',
    header: headerWithInfo(
      'label.adjusted',
      'description.rnr-consumed-adjusted'
    ),
    ...getNumberCell(),
    size: remToPx(7),
    cardGroup: 'more',
    cell: info => derivedNumber(info.row.original.adjustedQuantityConsumed),
  },
  {
    c: { key: 'losses' },
    sortKey: 'losses',
    header: headerWithInfo('label.losses', 'description.rnr-losses'),
    ...getNumberCell(),
    size: remToPx(7),
    cardGroup: 'more',
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
    sortKey: 'adjustments',
    header: headerWithInfo(
      'label.rnr-adjustments',
      'description.rnr-adjustments'
    ),
    ...getNumberCell(),
    size: remToPx(8),
    cardGroup: 'more',
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
    sortKey: 'stockOutDuration',
    header: () => t('label.rnr-stock-out-duration'),
    ...getNumberCell(),
    size: remToPx(7),
    cardGroup: 'more',
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
    sortKey: 'finalBalance',
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
        line.finalBalance < 0
          ? { severity: 'error', label: t('error.rnr-negative-balance') }
          : undefined
      );
    },
  },
  {
    c: { key: 'averageMonthlyConsumption' },
    sortKey: 'averageMonthlyConsumption',
    header: headerWithInfo('label.amc', 'description.rnr-amc'),
    ...getCellDefinition('amc'),
    cardGroup: 'more',
    cell: info => derivedNumber(info.row.original.averageMonthlyConsumption),
  },
  {
    c: { key: 'minimumQuantity' },
    sortKey: 'minimumQuantity',
    header: headerWithInfo(
      'label.rnr-minimum-quantity',
      'description.rnr-minimum-quantity'
    ),
    ...getNumberCell(),
    size: remToPx(7),
    cardGroup: 'more',
    cell: info => derivedNumber(info.row.original.minimumQuantity),
  },
  {
    c: { key: 'maximumQuantity' },
    sortKey: 'maximumQuantity',
    header: headerWithInfo(
      'label.rnr-maximum-quantity',
      'description.rnr-maximum-quantity'
    ),
    ...getNumberCell(),
    size: remToPx(7),
    cardGroup: 'more',
    cell: info => derivedNumber(info.row.original.maximumQuantity),
  },
  {
    c: { key: 'expiryDate' },
    sortKey: 'expiryDate',
    header: headerWithInfo('label.expiry', 'description.expiry'),
    ...getCellDefinition('expiryDate'),
    cardGroup: 'more',
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
    sortKey: 'requested',
    header: headerWithInfo(
      'label.requested',
      'description.rnr-requested-quantity'
    ),
    ...getCellDefinition('requested'),
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
    // generation); the marker's label is its MEANING — the two severities
    // must announce differently (StatusMarker contract; never colour alone).
    c: { key: 'lowStock' },
    header: headerWithInfo(
      'label.low-stock',
      'description.rnr-low-stock',
      'center'
    ),
    size: remToPx(5),
    meta: { align: 'center' },
    cell: info => (
      <Show when={info.row.original.lowStock !== 'OK'}>
        <StatusMarker
          severity={
            info.row.original.lowStock === 'BELOW_QUARTER' ? 'error' : 'warning'
          }
          label={
            info.row.original.lowStock === 'BELOW_QUARTER'
              ? t('messages.rnr-low-stock-severe')
              : t('messages.rnr-low-stock-mild')
          }
        />
      </Show>
    ),
  },
  {
    c: { key: 'comment' },
    header: () => t('label.comment'),
    ...getCellDefinition('comment'),
    cardGroup: 'more',
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
    sortKey: 'approved',
    header: headerWithInfo(
      'label.approved-quantity',
      'description.rnr-approved-quantity'
    ),
    ...getCellDefinition('approvedQuantity'),
    cardGroup: 'more',
  },
];
