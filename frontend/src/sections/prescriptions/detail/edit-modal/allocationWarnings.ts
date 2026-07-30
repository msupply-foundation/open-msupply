import { round9, type BarReason, type IssueWarning } from '@/domain/allocation';

// The prescription line editor's inline warning banners, as message
// descriptors the editor resolves via t()/formatNumber — the prescriptions
// face of the shared reporting vocabulary (spec/stock-allocation § reporting;
// OMS-REG-DIS-03.58/.59). Dispensing distributes partial packs, so
// over-allocation never arises (.31) and the split-pack warning does
// (AC-AL12); the shortfall keeps its own dedicated banner. The skip
// categories reuse the same ported `label.*` tokens as outbound's mapping
// (contract § warning vocabulary) — repeated per vertical because
// domain/allocation is i18n-free and each consumer owns its message choice.

/** The ported label key each barred category is reported under. */
export type SkipReasonLabel =
  'label.on-hold' | 'label.expired' | 'label.unusable-vvm-status';

export type PrescriptionWarningMessage =
  | {
      key: 'messages.allocated-lines-skipped-line-reasons';
      reasons: SkipReasonLabel[];
    }
  | {
      key:
        | 'messages.partial-pack-warning-units'
        | 'messages.partial-pack-warning-doses';
      nearestAbove: number;
    }
  | {
      key: 'messages.over-allocated-line';
      quantity: number;
      issueQuantity: number;
    };

const skipReasonLabel = (reason: BarReason): SkipReasonLabel => {
  switch (reason) {
    // The on-hold arm completes the shared vocabulary, but prescriptions
    // never reports it — held stock is hidden from the grid and its
    // pass-over filtered before mapping (lineEditLogic, rules § allocation).
    case 'on-hold':
      return 'label.on-hold';
    case 'expired':
      return 'label.expired';
    case 'unusable-vvm':
      return 'label.unusable-vvm-status';
  }
};

/**
 * Map a distribution's derived warnings to banner messages: every skipped
 * category reported (AC-AL2 — .59), and the split-pack warning naming the
 * nearest whole-pack quantity above, in doses under the doses lens
 * (AC-AL12 — .58).
 */
export const issueWarningMessages = (
  derived: readonly IssueWarning[],
  lens: { doses: boolean; dosesPerUnit: number }
): PrescriptionWarningMessage[] =>
  derived.flatMap((warning): PrescriptionWarningMessage[] => {
    switch (warning.kind) {
      case 'skipped-barred':
        return [
          {
            key: 'messages.allocated-lines-skipped-line-reasons',
            reasons: warning.reasons.map(skipReasonLabel),
          },
        ];
      case 'partial-packs':
        return [
          {
            key: lens.doses
              ? 'messages.partial-pack-warning-doses'
              : 'messages.partial-pack-warning-units',
            nearestAbove: round9(
              lens.doses
                ? warning.nearestAboveUnits * lens.dosesPerUnit
                : warning.nearestAboveUnits
            ),
          },
        ];
      // Partial-pack distribution fills exact units — never over (.31) — and
      // the shortfall is the modal's dedicated banner, not one of these.
      case 'over-allocated':
      case 'shortfall':
        return [];
    }
  });

/**
 * A manual per-batch entry's reports, REPLACING any distribution reports —
 * they describe an allocation the edit just changed (AC-AL13): the applied
 * quantity when the entry was adjusted (bounded to availability — .19), and
 * the split-pack warning when the applied packs are fractional (.58). The
 * batch rows are entered in units, so the units message applies whatever the
 * issue field's lens.
 */
export const manualEntryMessages = (
  appliedPacks: number,
  packSize: number,
  enteredUnits?: number
): PrescriptionWarningMessage[] => {
  const messages: PrescriptionWarningMessage[] = [];
  const appliedUnits = round9(appliedPacks * packSize);
  if (enteredUnits != null && enteredUnits !== appliedUnits)
    messages.push({
      key: 'messages.over-allocated-line',
      quantity: appliedUnits,
      issueQuantity: enteredUnits,
    });
  if (Math.ceil(appliedPacks) > appliedPacks)
    messages.push({
      key: 'messages.partial-pack-warning-units',
      nearestAbove: round9(Math.ceil(appliedPacks) * packSize),
    });
  return messages;
};
