import {
  autoAllocateBarReasons,
  barReasons,
  deriveIssueWarnings,
  distributeIssue,
  fillOrderCompare,
  type AllocationPreferences,
  type BarReason,
  type IssueWarning,
} from '@/domain/allocation';
import type {
  PrescriptionEditLinesResult,
  SavePrescriptionItemLinesVariables,
} from './prescriptionLineEdit.generated';

// The line editor's pure logic (spec/prescriptions/ui-surface.md S4): the
// draft batch rows, the fractional-pack distribution (AC-A1 — dispensing
// splits packs, no over-allocation, no placeholder), the save-input builder
// (the item set-save, AC-I7), and the footer's enablement rule. The modal
// owns signals; this owns arithmetic so the ACs are testable in isolation.

type ServerDraftLine = NonNullable<
  PrescriptionEditLinesResult['draftStockOutLines']
>['draftLines'][number];

export interface DraftLine extends ServerDraftLine {
  /** The pref-gated ISSUE bar (manual entry / row display — AC-AL8/AL9). */
  barred: readonly BarReason[];
  /**
   * The stricter AUTO bar (stock-allocation § barred batches › never
   * auto-allocated): expired / unusable-VVM stock is never distributed to,
   * preference or not (AC-AL2/AL10).
   */
  autoBarred: readonly BarReason[];
}

/**
 * Prescriptions hide on-hold stock outright — a delta from the shared
 * surface's visible-but-disabled rule (spec/prescriptions/rules.md §
 * allocation, .60): a held batch, or one in a held location, is absent from
 * the grid — UNLESS it already carries an allocation on this prescription
 * and still has stock. That row stays (judged as seeded, AC-AL14) and
 * barReasons' matching exception keeps it manually editable.
 */
const showLine = (line: ServerDraftLine): boolean =>
  !(line.stockLineOnHold || (line.location?.onHold ?? false)) ||
  (line.numberOfPacks > 0 && line.availablePacks > 0);

/**
 * Seed the editor's rows: on-hold stock dropped (above), fill-ordered —
 * FEFO, or VVM-priority-then-expiry under its preference (display order IS
 * fill order, stock-allocation § ordering; rules § allocation) — with each
 * row's bar verdicts resolved once. `availablePacks` already includes this
 * prescription's own draft allocation (the server hands back re-issuable
 * capacity).
 */
export const seedDraftLines = (
  lines: readonly ServerDraftLine[],
  prefs: AllocationPreferences,
  today?: Date
): DraftLine[] =>
  lines
    .filter(showLine)
    .sort((a, b) => fillOrderCompare(a, b, prefs))
    .map(line => ({
      ...line,
      barred: barReasons(line, prefs, today),
      autoBarred: autoAllocateBarReasons(line, prefs, today),
    }));

/**
 * Units available across usable rows. Held stock never counts — the editable
 * held-with-allocation exception row (AC-AL14) only adjusts what it already
 * holds, so its availability is excluded alongside the barred rows'.
 */
export const draftAvailableUnits = (lines: readonly DraftLine[]): number =>
  lines.reduce(
    (sum, line) =>
      line.barred.length > 0 ||
      line.stockLineOnHold ||
      (line.location?.onHold ?? false)
        ? sum
        : sum + line.availablePacks * line.packSize,
    0
  );

/**
 * Distribute a requested unit quantity across the draft rows — the
 * prescriptions variant of the shared policy (partial packs: exact units,
 * never over-allocated; a shortfall only narrows and is reported — AC-A1).
 * Returns the new per-row packs, the shortfall for its dedicated banner, and
 * the other distribution reports (stock-allocation § reporting): barred stock
 * passed over (AC-AL2 — .59) and the split-pack warning (AC-AL12 — .58).
 */
export const allocateUnits = (
  lines: readonly DraftLine[],
  requestedUnits: number
): {
  packsById: Map<string, number>;
  shortfallUnits: number;
  warnings: IssueWarning[];
} => {
  // Distribution filters on the AUTO bar — expired/unusable-VVM stock is
  // never auto-dispensed even with the issue prefs off (AC-AL10).
  const distribution = distributeIssue(
    lines.map(line => ({ ...line, barred: line.autoBarred })),
    requestedUnits,
    { partialPacks: true }
  );
  const allocatedUnits = lines.reduce(
    (sum, line) =>
      sum + (distribution.packsById.get(line.id) ?? 0) * line.packSize,
    0
  );
  return {
    packsById: distribution.packsById,
    shortfallUnits: distribution.shortfallUnits,
    // The shortfall is surfaced as the modal's own banner, so not re-reported
    // here (reportShortfall: false). On-hold pass-overs are never reported
    // (rules § allocation — held stock is hidden, .60): only the editable
    // held-with-allocation exception row (AC-AL14) can produce one, and its
    // hold is already visible on the row itself.
    warnings: deriveIssueWarnings(distribution, {
      reportShortfall: false,
      allocatedUnits,
    }).flatMap((warning): IssueWarning[] => {
      if (warning.kind !== 'skipped-barred') return [warning];
      const reasons = warning.reasons.filter(reason => reason !== 'on-hold');
      return reasons.length > 0 ? [{ ...warning, reasons }] : [];
    }),
  };
};

/**
 * The item set-save input (contract § the item set-save): EVERY draft row is
 * sent — zeroed rows are how the server deletes lines; the prescribed
 * quantity rides along when entered (>0; it is not clearable on the wire);
 * the directions note is written to every line of the item.
 */
export const buildSaveInput = (
  invoiceId: string,
  itemId: string,
  lines: readonly DraftLine[],
  prescribedQuantity: number | undefined,
  note: string
): SavePrescriptionItemLinesVariables['input'] => ({
  invoiceId,
  itemId,
  lines: lines.map(line => ({
    id: line.id,
    stockLineId: line.stockLineId,
    numberOfPacks: line.numberOfPacks,
  })),
  ...(prescribedQuantity != null && prescribedQuantity > 0
    ? { prescribedQuantity }
    : {}),
  ...(note.trim() ? { note: note.trim() } : {}),
});

/**
 * The footer's OK enablement (ui-surface S4): an item chosen, a change made,
 * and a non-zero outcome — allocated units or a prescribed quantity.
 */
export const canSave = (args: {
  itemChosen: boolean;
  dirty: boolean;
  allocatedUnits: number;
  prescribedQuantity: number | undefined;
}): boolean =>
  args.itemChosen &&
  args.dirty &&
  (args.allocatedUnits > 0 || (args.prescribedQuantity ?? 0) > 0);
