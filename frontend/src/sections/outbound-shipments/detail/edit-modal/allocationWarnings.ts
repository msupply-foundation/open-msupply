import type { BarReason, IssueWarning } from '../../../../domain/allocation';

// The line editor's inline warning banners, as message descriptors the editor
// resolves via t()/formatNumber (spec/stock-allocation § reporting,
// OMS-REG-SMV-11.7/.11). Derived from the shared deriveIssueWarnings output:
// over-allocation surfaces (OMS-REG-SMV-11.11), and every skipped category is reported
// (OMS-REG-SMV-11.7) — reusing the same ported vocabulary the bulk "Allocate placeholder
// lines" report uses (`messages.allocated-lines-skipped-line-reasons` + the
// `label.*` reason tokens), so the two surfaces read identically. The shortfall
// is surfaced separately (the placeholder notice), so it produces no banner
// here.

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
      // the prescriptions (partial-pack dispensing) consumer's (OMS-REG-SMV-11.32).
      case 'partial-packs':
        return [];
    }
  });

/**
 * The batches issued that are NOT held for the Activity the requisition asked
 * for (issue 595).
 *
 * Stock held for nothing in particular counts as a mismatch too: the customer
 * asked for campaign stock, and routine stock is not that. Only ALLOCATED rows
 * are judged — an untouched batch on the grid is not being issued, so it says
 * nothing about what is. Nothing is returned when the requisition asked for no
 * activity, which is the ordinary case and must stay silent.
 *
 * This reports; it never gates. The editor renders it as an advisory banner.
 */
export const activityMismatch = <
  T extends { numberOfPacks: number; campaign?: { id: string } | null },
>(
  lines: readonly T[],
  requestedActivity: { id: string; name: string } | undefined
): { activity: string; batches: number } | undefined => {
  if (!requestedActivity) return undefined;
  const batches = lines.filter(
    line => line.numberOfPacks > 0 && line.campaign?.id !== requestedActivity.id
  ).length;
  return batches > 0
    ? { activity: requestedActivity.name, batches }
    : undefined;
};
