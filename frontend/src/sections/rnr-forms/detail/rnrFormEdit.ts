import type { RnrFormLineFragment } from './rnrFormDetail.generated';

// The draft-line engine (spec/rnr-forms/rules.md § editing a draft / § line
// generation): the client recomputes every derived figure on each edit and the
// server persists what it is sent, validating only the balance identity,
// non-negative balances, the stock-out cap, and non-negative requests. The
// formulas here are the rules' — they must match what generation used, or a
// no-op edit would shift the derived columns.

// A draft line is the wire line plus edit tracking. Fields stay the generated
// shape (kdd/type-safety: no remapping) — edits fold into the same folded
// entered-over-snapshot figures the node serves.
export type DraftRnrLine = RnrFormLineFragment & {
  /** Edited since the last successful save. */
  dirty: boolean;
  /** Bumped on every edit — a save captures it and clears `dirty` only when
   * it is unchanged on return, so an edit made while the save was in flight
   * stays dirty for the next tick. */
  rev: number;
};

/** Seed the draft store from the wire lines (clean, rev 0). */
export const toDraftLines = (lines: RnrFormLineFragment[]): DraftRnrLine[] =>
  lines.map(line => ({ ...line, dirty: false, rev: 0 }));

/** The columns the user can type into (ui-surface S3 § line table). */
export type EditableRnrField =
  | 'initialBalance'
  | 'quantityReceived'
  | 'quantityConsumed'
  | 'losses'
  | 'adjustments'
  | 'stockOutDuration'
  | 'enteredRequestedQuantity'
  | 'expiryDate'
  | 'comment';

// A month is 30 days for the AMC maths (rules § line generation — the
// server's APPROX_NUMBER_OF_DAYS_IN_A_MONTH constant).
const DAYS_IN_MONTH = 30;

/** The stored previous-forms consumption history (a comma-joined string —
 * contract § line generation). Empty string ⇒ no history (the carry-forward
 * chain is broken or this is the first form). */
export const previousMonthlyConsumption = (line: {
  previousMonthlyConsumptionValues: string;
}): number[] =>
  line.previousMonthlyConsumptionValues
    .split(',')
    .filter(v => v.trim() !== '')
    .map(Number)
    .filter(v => Number.isFinite(v));

/** rules § line generation: consumption scaled up for stock-out days; with no
 * in-stock days it falls back to plain consumption. */
export const adjustedQuantityConsumed = (
  quantityConsumed: number,
  stockOutDuration: number,
  periodLength: number
): number => {
  const daysInStock = periodLength - stockOutDuration;
  return daysInStock <= 0
    ? quantityConsumed
    : (quantityConsumed * periodLength) / daysInStock;
};

/** rules § line generation: the mean of this period's monthly consumption and
 * the stored previous values. */
export const averageMonthlyConsumption = (
  adjustedConsumed: number,
  periodLength: number,
  previousValues: number[]
): number => {
  const periodMonths = periodLength / DAYS_IN_MONTH;
  const thisPeriod = periodMonths > 0 ? adjustedConsumed / periodMonths : 0;
  const total = previousValues.reduce((sum, v) => sum + v, 0) + thisPeriod;
  return total / (previousValues.length + 1);
};

/** rules § line generation: severe below a quarter of maximum, mild below
 * half, else none. */
export const lowStockStatus = (
  finalBalance: number,
  maximumQuantity: number
): DraftRnrLine['lowStock'] => {
  if (finalBalance < maximumQuantity / 4) return 'BELOW_QUARTER';
  if (finalBalance < maximumQuantity / 2) return 'BELOW_HALF';
  return 'OK';
};

export type RecomputeContext = {
  /** Days in the reporting period, inclusive (the node's periodLength). */
  periodLength: number;
  /** The store's min/max months-of-stock preferences (rules § line
   * generation); the reference client's fallbacks when unset are 0 / 2. */
  monthsUnderstock: number;
  monthsOverstock: number;
};

/**
 * One edit's full consequence (rules § editing a draft): the changed field
 * plus every derived figure, recomputed. Returns the PATCH of derived fields —
 * the caller writes it into its store field-by-field
 * (kdd/solid-reactivity-pitfalls § editable collections).
 */
export const recomputeLine = (
  line: DraftRnrLine,
  ctx: RecomputeContext
): Pick<
  DraftRnrLine,
  | 'adjustedQuantityConsumed'
  | 'finalBalance'
  | 'averageMonthlyConsumption'
  | 'minimumQuantity'
  | 'maximumQuantity'
  | 'calculatedRequestedQuantity'
  | 'lowStock'
> => {
  const adjusted = adjustedQuantityConsumed(
    line.quantityConsumed,
    line.stockOutDuration,
    ctx.periodLength
  );
  // The balance identity (rules § editing): initial + received − consumed +
  // adjustments − losses = final. The client keeps it true by construction —
  // final is derived, never typed.
  const finalBalance =
    line.initialBalance +
    line.quantityReceived -
    line.quantityConsumed +
    line.adjustments -
    line.losses;
  const amc = averageMonthlyConsumption(
    adjusted,
    ctx.periodLength,
    previousMonthlyConsumption(line)
  );
  const minimumQuantity = amc * ctx.monthsUnderstock;
  const maximumQuantity = amc * ctx.monthsOverstock;
  const calculatedRequestedQuantity = Math.max(
    0,
    maximumQuantity - finalBalance
  );
  return {
    adjustedQuantityConsumed: adjusted,
    finalBalance,
    averageMonthlyConsumption: amc,
    minimumQuantity,
    maximumQuantity,
    calculatedRequestedQuantity,
    lowStock: lowStockStatus(finalBalance, maximumQuantity),
  };
};

/** A line the auto-save must hold back and the table must flag (rules §
 * editing: no negative balances; ui-surface S3 — error tint, and the finalise
 * gate walks to the first such line). */
export const lineHasError = (line: {
  initialBalance: number;
  finalBalance: number;
}): boolean => line.initialBalance < 0 || line.finalBalance < 0;

/** The dirty, valid lines a save carries (rules § editing: error lines are
 * withheld from auto-save rather than bouncing off the server). */
export const linesToSave = (lines: DraftRnrLine[]): DraftRnrLine[] =>
  lines.filter(line => line.dirty && !lineHasError(line));

/** A draft line as the update input's line shape (contract § editing a draft:
 * the input sends the full line state; the server persists the derived
 * figures verbatim). */
export const toUpdateLineInput = (line: DraftRnrLine) => ({
  id: line.id,
  quantityReceived: line.quantityReceived,
  quantityConsumed: line.quantityConsumed,
  losses: line.losses,
  adjustments: line.adjustments,
  expiryDate: line.expiryDate,
  stockOutDuration: line.stockOutDuration,
  adjustedQuantityConsumed: line.adjustedQuantityConsumed,
  averageMonthlyConsumption: line.averageMonthlyConsumption,
  initialBalance: line.initialBalance,
  finalBalance: line.finalBalance,
  minimumQuantity: line.minimumQuantity,
  maximumQuantity: line.maximumQuantity,
  calculatedRequestedQuantity: line.calculatedRequestedQuantity,
  enteredRequestedQuantity: line.enteredRequestedQuantity,
  lowStock: line.lowStock,
  comment: line.comment,
  confirmed: line.confirmed,
});
