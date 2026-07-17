// Derived, structured distribution warnings
// (spec/stock-allocation/rules.md § reporting): allocation never silently
// narrows — every deviation from the request is reported. Warnings are pure
// derivations of the distribution result; the consumer maps each variant to
// its own i18n strings and feedback surface (inline banners per
// ui-standards/controls.md § action feedback — never a toast).

import type { Distribution } from './distributeIssue';

export type IssueWarning =
  /** Whole-pack rounding issued more than requested (AC-AL3). */
  | { kind: 'over-allocated'; units: number }
  /** Requested units not covered by usable stock (AC-AL4). */
  | { kind: 'shortfall'; units: number }
  /** Barred stock with availability was passed over (AC-AL2). */
  | { kind: 'skipped-barred' };

export const deriveIssueWarnings = (
  distribution: Distribution,
  options: {
    /**
     * Whether the consumer surfaces the shortfall as a warning here — e.g.
     * outbound only warns while the shipment is NEW (its placeholder window);
     * the shortfall itself is always in the Distribution regardless.
     */
    reportShortfall: boolean;
  }
): IssueWarning[] => {
  const warnings: IssueWarning[] = [];
  if (distribution.overAllocatedUnits > 0)
    warnings.push({
      kind: 'over-allocated',
      units: distribution.overAllocatedUnits,
    });
  if (distribution.shortfallUnits > 0 && options.reportShortfall)
    warnings.push({ kind: 'shortfall', units: distribution.shortfallUnits });
  if (distribution.skippedBarred) warnings.push({ kind: 'skipped-barred' });
  return warnings;
};
