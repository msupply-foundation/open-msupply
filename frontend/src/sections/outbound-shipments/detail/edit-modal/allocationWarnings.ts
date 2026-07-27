import type { BarReason, IssueWarning } from '../../../../domain/allocation';

// The line editor's inline warning banners, as message descriptors the editor
// resolves via t()/formatNumber (spec/stock-allocation § reporting, AC-AL2/AL3).
// Derived from the shared deriveIssueWarnings output: over-allocation surfaces
// (AC-AL3), and every skipped category is reported (AC-AL2) — reusing the same
// ported vocabulary the bulk "Allocate placeholder lines" report uses
// (`messages.allocated-lines-skipped-line-reasons` + the `label.*` reason
// tokens), so the two surfaces read identically. The shortfall is surfaced
// separately (the placeholder notice), so it produces no banner here.

/** The ported label key each barred category is reported under. */
export type SkipReasonLabel =
  'label.on-hold' | 'label.expired' | 'label.unusable-vvm-status';

export type IssueWarningMessage =
  | { key: 'messages.over-allocated'; quantity: number; issueQuantity: number }
  | {
      key: 'messages.allocated-lines-skipped-line-reasons';
      reasons: SkipReasonLabel[];
    };

const skipReasonLabel = (reason: BarReason): SkipReasonLabel => {
  switch (reason) {
    case 'on-hold':
      return 'label.on-hold';
    case 'expired':
      return 'label.expired';
    case 'unusable-vvm':
      return 'label.unusable-vvm-status';
  }
};

export const issueWarningMessages = (
  derived: readonly IssueWarning[],
  requestedUnits: number
): IssueWarningMessage[] =>
  derived.flatMap((warning): IssueWarningMessage[] => {
    switch (warning.kind) {
      case 'over-allocated':
        return [
          {
            key: 'messages.over-allocated',
            quantity: requestedUnits + warning.units,
            issueQuantity: requestedUnits,
          },
        ];
      case 'skipped-barred':
        return [
          {
            key: 'messages.allocated-lines-skipped-line-reasons',
            reasons: warning.reasons.map(skipReasonLabel),
          },
        ];
      case 'shortfall':
        return [];
      // Outbound distributes whole packs only — the partial-packs warning is
      // the prescriptions (partial-pack dispensing) consumer's (AC-AL12).
      case 'partial-packs':
        return [];
    }
  });
