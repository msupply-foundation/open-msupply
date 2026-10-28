import {
  expiredSkipReport,
  unitsToLens,
  type AllocateUnit,
  type BarReason,
  type DistributionOutcome,
  type ExpiredSkipReport,
  type IssueWarning,
} from '../../../../domain/allocation';

// The line editor's inline banners, as message descriptors the editor
// resolves via t()/formatNumber (spec/stock-allocation § reporting,
// OMS-REG-SMV-11.7/.11). Derived from the shared deriveIssueWarnings output:
// over-allocation surfaces (OMS-REG-SMV-11.11), and each skipped category is
// its own whole sentence naming the consequence (OMS-REG-SMV-11.7, #1168) —
// the dispensing editor's sentences, the expired one by outcome (the shared
// expiredSkipReport, SMV-11.44).
// On-hold stock is not reported: its row already carries the On hold badge.
// A shortfall while NEW becomes the placeholder and is surfaced as the
// placeholder notice, so the editor only derives it past NEW, where no
// placeholder can be created (OMS-REG-DIST-03.23). There it is reported as the
// prescriptions editor reports its own (`warning.cannot-create-placeholder-*`):
// the total that WAS allocated, in the entry lens — the figure the Issue field
// drops to (OMS-REG-SMV-11.13 — never silently narrow).

/** The sentence each reported skip category reads. */
const SKIP_MESSAGE = {
  expired: 'messages.stock-expired',
  'unusable-vvm': 'messages.stock-unusable-vvm',
  'other-campaign': 'messages.stock-other-campaign',
} as const;
type ReportedSkip = keyof typeof SKIP_MESSAGE;

/** The expired sentence for each outcome. */
const EXPIRED_SKIP_MESSAGE = {
  skipped: 'messages.stock-expired-skipped',
  'not-auto-allocated': 'messages.stock-expired',
  'cannot-issue': 'messages.stock-expired-cannot-issue',
} as const satisfies Record<ExpiredSkipReport, string>;

const skipMessage = (reason: ReportedSkip, outcome: DistributionOutcome) =>
  reason === 'expired'
    ? EXPIRED_SKIP_MESSAGE[expiredSkipReport(outcome)]
    : SKIP_MESSAGE[reason];

export type ShortfallKey =
  | 'warning.cannot-create-placeholder-units'
  | 'warning.cannot-create-placeholder-packs'
  | 'warning.cannot-create-placeholder-doses';

export type IssueWarningMessage =
  | { key: 'messages.over-allocated'; quantity: number; issueQuantity: number }
  | { key: ShortfallKey; allocatedQuantity: number }
  | { key: ReturnType<typeof skipMessage>; reason: ReportedSkip };

const shortfallKey = (lens: AllocateUnit): ShortfallKey => {
  switch (lens.kind) {
    case 'units':
      return 'warning.cannot-create-placeholder-units';
    case 'packs':
      return 'warning.cannot-create-placeholder-packs';
    case 'doses':
      return 'warning.cannot-create-placeholder-doses';
  }
};

export const issueWarningMessages = (
  derived: readonly IssueWarning[],
  requestedUnits: number,
  lens: AllocateUnit,
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
        return [
          {
            key: shortfallKey(lens),
            allocatedQuantity: unitsToLens(
              requestedUnits - warning.units,
              lens
            ),
          },
        ];
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
