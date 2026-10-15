import {
  unitsToLens,
  type AllocateUnit,
  type BarReason,
  type IssueWarning,
} from '../../../../domain/allocation';

// The line editor's inline warning banners, as message descriptors the editor
// resolves via t()/formatNumber (spec/stock-allocation § reporting,
// OMS-REG-SMV-11.7/.11). Derived from the shared deriveIssueWarnings output:
// over-allocation surfaces (OMS-REG-SMV-11.11), and every skipped category is reported
// (OMS-REG-SMV-11.7) — reusing the same ported vocabulary the bulk "Allocate placeholder
// lines" report uses (`messages.allocated-lines-skipped-line-reasons` + the
// `label.*` reason tokens), so the two surfaces read identically. A shortfall
// while NEW becomes the placeholder and is surfaced as the placeholder notice,
// so the editor only derives it past NEW, where no placeholder can be created
// (OMS-REG-DIST-03.23). There it is reported as the prescriptions editor reports
// its own (`warning.cannot-create-placeholder-*`): the total that WAS
// allocated, in the entry lens — the figure the Issue field drops to
// (OMS-REG-SMV-11.13 — never silently narrow).

/** The ported label key each barred category is reported under. */
export type SkipReasonLabel =
  'label.on-hold' | 'label.expired' | 'label.unusable-vvm-status';

export type ShortfallKey =
  | 'warning.cannot-create-placeholder-units'
  | 'warning.cannot-create-placeholder-packs'
  | 'warning.cannot-create-placeholder-doses';

export type IssueWarningMessage =
  | { key: 'messages.over-allocated'; quantity: number; issueQuantity: number }
  | { key: ShortfallKey; allocatedQuantity: number }
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
  lens: AllocateUnit
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
