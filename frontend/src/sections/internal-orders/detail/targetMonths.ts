import { t, tPlural } from '../../../intl';
import { formatNumber } from '../../../intl/formatNumber';
import type { SelectOption } from '../../../ui/elements/selectors/Select';
import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';

// The header's months-of-stock decisions (spec/internal-orders rules › target
// months of stock; ui-surface S3 § toolbar): which months the two selects
// offer, when the store fixes the target to its supply interval + safety
// buffer, and whether the order's target is that sum (so the forecast caption
// can name it).

type SupplyIntervalAndBuffer = NonNullable<
  InternalOrderInfoFragment['supplyIntervalAndBuffer']
>;

// The standard choices, 1…6 months (label.number-months).
export const MONTH_VALUES = [1, 2, 3, 4, 5, 6];

// Months as a select label: "1 month" / "3.5 months", the count in the active
// locale's number format (a store's supply interval + safety buffer may be
// fractional).
const monthsLabel = (months: number): string =>
  tPlural('label.number-months', months, {
    count: formatNumber(months, { maximumFractionDigits: 2 }),
  });

/**
 * The target select's options: 1…6 months, plus the order's own target where
 * it is none of those — a store's supply interval + safety buffer such as 3.5
 * or 7 months (OMS-REG-REPL-17.16) — in numeric order. A target below the
 * reorder threshold can't be chosen (a UI-only guard; the server accepts any
 * values).
 */
export const targetMonthOptions = (
  target: number,
  threshold: number
): SelectOption[] => {
  const values =
    target > 0 && !MONTH_VALUES.includes(target)
      ? [...MONTH_VALUES, target].sort((a, b) => a - b)
      : MONTH_VALUES;
  return values.map(n => ({
    value: String(n),
    label: monthsLabel(n),
    disabled: threshold > 0 && n < threshold,
  }));
};

/**
 * The reorder threshold's options: Not set (stored as 0), then 1…6 months; a
 * threshold above the target can't be chosen.
 */
export const thresholdMonthOptions = (target: number): SelectOption[] => [
  { value: '', label: t('label.not-set') },
  ...MONTH_VALUES.map(n => ({
    value: String(n),
    label: monthsLabel(n),
    disabled: target > 0 && n > target,
  })),
];

/**
 * The store's supply interval and safety buffer when they FIX this order's
 * target (OMS-REG-REPL-17.18): the changing-target-months preference is off
 * (it is on unless set — pass the raw read, undefined while unresolved) on a
 * store with a supply interval, and the order is a general one (a program
 * order's thresholds are its order type's, locked anyway). Undefined → the
 * target is changeable as usual.
 */
export const storeFixedIntervalAndBuffer = (args: {
  canChangeTargetMonths: boolean | undefined;
  supplyIntervalAndBuffer: InternalOrderInfoFragment['supplyIntervalAndBuffer'];
  isProgram: boolean;
}): SupplyIntervalAndBuffer | undefined =>
  args.canChangeTargetMonths === false && !args.isProgram
    ? (args.supplyIntervalAndBuffer ?? undefined)
    : undefined;

// Months compared to a hundredth: interval + buffer is a float sum, the stored
// target a float, and neither carries more precision than the store's setup.
const sameMonths = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * The store's supply interval and safety buffer the order's target came from,
 * if it did (OMS-REG-REPL-17.17): a general order on a store with a supply
 * interval whose target is exactly that interval + safety buffer. Undefined
 * otherwise — a program order, a store with no interval, or a target since
 * changed.
 */
export const intervalAndBufferBehindTarget = (
  node: Pick<
    InternalOrderInfoFragment,
    'maxMonthsOfStock' | 'supplyIntervalAndBuffer' | 'program'
  >
): SupplyIntervalAndBuffer | undefined => {
  const intervalAndBuffer = node.supplyIntervalAndBuffer;
  if (!intervalAndBuffer || node.program) return undefined;
  return sameMonths(
    node.maxMonthsOfStock,
    intervalAndBuffer.supplyIntervalMonths +
      intervalAndBuffer.safetyBufferMonths
  )
    ? intervalAndBuffer
    : undefined;
};

/** The locked target's tooltip, naming the interval and buffer that set it. */
export const targetSetByStoreMessage = (
  intervalAndBuffer: SupplyIntervalAndBuffer
): string =>
  t('messages.target-mos-set-by-store', {
    supplyInterval: formatNumber(intervalAndBuffer.supplyIntervalMonths, {
      maximumFractionDigits: 2,
    }),
    safetyBuffer: formatNumber(intervalAndBuffer.safetyBufferMonths, {
      maximumFractionDigits: 2,
    }),
  });
