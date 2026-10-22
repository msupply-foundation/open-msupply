import type { BarReason, IssueWarning } from '../../../../domain/allocation';

// The line editor's inline banners, as message descriptors the editor
// resolves via t()/formatNumber (spec/stock-allocation § reporting,
// OMS-REG-SMV-11.7/.11). Derived from the shared deriveIssueWarnings output:
// over-allocation surfaces (OMS-REG-SMV-11.11), and each skipped category is
// its own whole sentence naming the consequence (OMS-REG-SMV-11.7, #1168) —
// the dispensing editor's sentences, the expired one by outcome (SMV-11.44).
// On-hold stock is not reported: its row already carries the On hold badge.
// The shortfall is surfaced separately (the placeholder notice), so it
// produces no banner here.

/** The sentence each reported skip category reads. */
const SKIP_MESSAGE = {
  expired: 'messages.stock-expired',
  'unusable-vvm': 'messages.stock-unusable-vvm',
  'other-campaign': 'messages.stock-other-campaign',
} as const;
type ReportedSkip = keyof typeof SKIP_MESSAGE;

/** What the expired sentence turns on (stock-allocation § reporting). */
export interface DistributionOutcome {
  /** The request was covered in full. */
  met: boolean;
  /** Expired stock stays manually issuable (its guard preference is off). */
  expiredIssuable: boolean;
}

const skipMessage = (reason: ReportedSkip, outcome: DistributionOutcome) => {
  if (reason !== 'expired') return SKIP_MESSAGE[reason];
  if (outcome.met) return 'messages.stock-expired-skipped';
  return outcome.expiredIssuable
    ? 'messages.stock-expired'
    : 'messages.stock-expired-cannot-issue';
};

export type IssueWarningMessage =
  | { key: 'messages.over-allocated'; quantity: number; issueQuantity: number }
  | { key: ReturnType<typeof skipMessage>; reason: ReportedSkip };

export const issueWarningMessages = (
  derived: readonly IssueWarning[],
  requestedUnits: number,
  outcome: DistributionOutcome
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
        return warning.reasons.flatMap((reason: BarReason) =>
          reason === 'on-hold'
            ? []
            : [{ key: skipMessage(reason, outcome), reason }]
        );
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
