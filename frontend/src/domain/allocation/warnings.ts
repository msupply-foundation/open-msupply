// Derived, structured distribution warnings
// (spec/stock-allocation/rules.md § reporting): allocation never silently
// narrows — every deviation from the request is reported. Warnings are pure
// derivations of the distribution result; the consumer maps each variant to
// its own i18n strings and feedback surface (inline banners per
// ui-standards/controls.md § action feedback — never a toast).

import type { Distribution } from './distributeIssue';
import type { BarReason } from './policy';

export type IssueWarning =
  /** Whole-pack rounding issued more than requested (OMS-REG-SMV-11.11). */
  | { kind: 'over-allocated'; units: number }
  /** Requested units not covered by usable stock (OMS-REG-SMV-11.13). */
  | { kind: 'shortfall'; units: number }
  /**
   * Barred stock with availability was passed over, with each category that
   * applied (OMS-REG-SMV-11.7 — the shared skip vocabulary).
   */
  | { kind: 'skipped-barred'; reasons: readonly BarReason[] }
  /**
   * The allocation split a pack (partial-packs consumers, OMS-REG-SMV-11.32) — the
   * user should confirm packs can actually be broken. `nearestAboveUnits` is
   * the allocation with every fractional take rounded up to a whole pack —
   * the old app's "nearest above" figure.
   */
  | { kind: 'partial-packs'; nearestAboveUnits: number };

export const deriveIssueWarnings = (
  distribution: Distribution,
  options: {
    /**
     * Whether the consumer surfaces the shortfall as a warning here — e.g.
     * outbound only warns while the shipment is NEW (its placeholder window);
     * the shortfall itself is always in the Distribution regardless.
     */
    reportShortfall: boolean;
    /**
     * The allocated units, for the partial-packs warning's nearest-above
     * figure (OMS-REG-SMV-11.32). Omitted (or a whole-pack distribution) never raises
     * the warning.
     */
    allocatedUnits?: number;
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
  if (distribution.skippedReasons.size > 0)
    warnings.push({
      kind: 'skipped-barred',
      reasons: [...distribution.skippedReasons],
    });
  if (distribution.wholePackGapUnits > 0 && options.allocatedUnits != null)
    warnings.push({
      kind: 'partial-packs',
      nearestAboveUnits:
        options.allocatedUnits + distribution.wholePackGapUnits,
    });
  return warnings;
};
