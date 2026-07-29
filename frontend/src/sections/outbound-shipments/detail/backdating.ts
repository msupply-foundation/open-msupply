// Pure backdating gate, bounds, and warning logic (spec/outbound-shipments
// rules.md § backdating; OMS-REG-DIST-04.23/B2/B4). Extracted from PickedDateField so the
// branching + date math are testable in isolation (the component resolves the
// returned message KEYS via t() and owns the stocktake-conflict query).

import {
  addDays,
  dateToIsoDate,
  localDayToUtc,
} from '../../../ui/elements/inputs/dateTimeConvert';

export type BackdatingReasonKey =
  | 'messages.received-date-backdating-not-enabled'
  | 'messages.picked-date-not-new';

export interface BackdatingGate {
  enabled: boolean;
  /** The disabled reason (a locale key) — only when disabled by a backdating
   *  gate (pref off / past NEW), not by the panel-wide read-only gate. */
  reasonKey?: BackdatingReasonKey;
}

// OMS-REG-DIST-04.23: the picked-date control is editable ONLY while NEW with the backdating
// preference on; otherwise disabled with the reason. The panel-wide read-only
// gate (SHIPPED onward) disables it too, but without a specific reason — the
// whole panel already reads disabled.
export const backdatingGate = (opts: {
  status: string;
  shipmentsEnabled: boolean;
  panelDisabled: boolean;
}): BackdatingGate => {
  const isNew = opts.status === 'NEW';
  const enabled = !opts.panelDisabled && opts.shipmentsEnabled && isNew;
  if (enabled || opts.panelDisabled) return { enabled };
  if (!opts.shipmentsEnabled)
    return {
      enabled,
      reasonKey: 'messages.received-date-backdating-not-enabled',
    };
  if (!isNew) return { enabled, reasonKey: 'messages.picked-date-not-new' };
  return { enabled };
};

// OMS-REG-DIST-04.23: the picker window is [now − (maxDays − 1), now] — a future date or
// one beyond the maximum can't be chosen. A maximum of zero (or unset) means
// NO lower bound — unlimited backdating, the old app's semantics (a deployed
// pref of {shipmentsEnabled: true, maxDays: 0} must not collapse the window
// to "today only"). The +1 on the lower bound is the old app's deliberate
// buffer: the server's UTC boundary check would reject the exact
// now−maxDays day for stores ahead of UTC. Bounds are LOCAL days (the store
// clock's) via the shared conversion.
export const backdateBounds = (
  now: Date,
  maxDays: number
): { min?: string; max: string } => {
  const max = dateToIsoDate(now);
  if (maxDays <= 0) return { max };
  return { min: dateToIsoDate(addDays(now, -(maxDays - 1))), max };
};

// OMS-REG-DIST-04.23 rejection on the SAVE path: the native min/max only constrain the
// picker UI — a typed-in out-of-range day still fires change — so the chosen
// day is re-checked against the window before anything saves. YYYY-MM-DD
// compares lexicographically, so plain string comparison is exact.
export const withinBackdateBounds = (
  bounds: { min?: string; max: string },
  day: string
): boolean => (bounds.min == null || day >= bounds.min) && day <= bounds.max;

// A chosen day → the instant to record the shipment "as of" (matching the
// current app): today keeps the actual current moment; a backdated day is
// stamped at its LOCAL end-of-day via the shared conversion (#456), so the
// entry sorts after same-day activity. Input is a `DateTime<Utc>`.
export const backdatedDatetimeFor = (now: Date, day: string): string =>
  day === dateToIsoDate(now)
    ? now.toISOString()
    : localDayToUtc(day, { endOfDay: true });

export type BackdateWarningKey =
  | 'messages.confirm-backdate-picked-date'
  | 'messages.stocktake-after-backdate-warning';

// OMS-REG-DIST-04.24/B4: which warnings the confirmation shows — the line-removal warning
// when the shipment has lines, and the stocktake-conflict warning when a
// stocktake was counted on/after the chosen day (both when both apply). An
// empty result means there is nothing to warn about, so the backdate applies
// directly with no confirmation.
export const backdateWarnings = (opts: {
  hasLines: boolean;
  stocktakeConflict: boolean;
}): BackdateWarningKey[] => {
  const keys: BackdateWarningKey[] = [];
  if (opts.hasLines) keys.push('messages.confirm-backdate-picked-date');
  if (opts.stocktakeConflict)
    keys.push('messages.stocktake-after-backdate-warning');
  return keys;
};
