import {
  autoAllocateBarReasons,
  barReasons,
  distributeIssue,
  fefoCompare,
  type AllocationPreferences,
  type BarReason,
} from '../../../../domain/allocation';
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
 * Seed the editor's rows: FEFO-ordered (display order IS fill order,
 * stock-allocation § ordering) with each row's bar verdicts resolved once.
 * `availablePacks` already includes this prescription's own draft allocation
 * (the server hands back re-issuable capacity).
 */
export const seedDraftLines = (
  lines: readonly ServerDraftLine[],
  prefs: AllocationPreferences,
  today?: Date
): DraftLine[] =>
  [...lines].sort(fefoCompare).map(line => ({
    ...line,
    barred: barReasons(line, prefs, today),
    autoBarred: autoAllocateBarReasons(line, prefs, today),
  }));

/** Units currently issued across the draft rows. */
export const draftIssuedUnits = (lines: readonly DraftLine[]): number =>
  lines.reduce((sum, line) => sum + line.numberOfPacks * line.packSize, 0);

/** Units available across usable (non-barred) rows. */
export const draftAvailableUnits = (lines: readonly DraftLine[]): number =>
  lines.reduce(
    (sum, line) =>
      line.barred.length > 0 ? sum : sum + line.availablePacks * line.packSize,
    0
  );

/**
 * Distribute a requested unit quantity across the draft rows — the
 * prescriptions variant of the shared policy (partial packs: exact units,
 * never over-allocated; a shortfall only narrows and is reported — AC-A1).
 * Returns the new per-row packs plus the shortfall for the warning banner.
 */
export const allocateUnits = (
  lines: readonly DraftLine[],
  requestedUnits: number
): { packsById: Map<string, number>; shortfallUnits: number } => {
  // Distribution filters on the AUTO bar — expired/unusable-VVM stock is
  // never auto-dispensed even with the issue prefs off (AC-AL10).
  const distribution = distributeIssue(
    lines.map(line => ({ ...line, barred: line.autoBarred })),
    requestedUnits,
    { partialPacks: true }
  );
  return {
    packsById: distribution.packsById,
    shortfallUnits: distribution.shortfallUnits,
  };
};

/**
 * A manual per-row entry is bounded 0…available (stock-allocation §
 * whole-pack arithmetic — the client is the only guard while NEW, and worse
 * here: auto-pick bakes a negative straight into on-hand; AC-I5).
 */
export const clampPacks = (
  value: number | undefined,
  availablePacks: number
): number => {
  if (value == null || !Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, availablePacks);
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
