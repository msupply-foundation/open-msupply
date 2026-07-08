import { QuantityUtils } from '@openmsupply-client/common';
import { DailyTallyConfig } from '../../types';
import { BatchEntry, countKey } from '../draft';
import {
  BatchInfo,
  ItemWithBatches,
  VaccineCourseSummary,
} from './useVaccineBatchData';

// Doses contained in one unit (a vial, for vaccines) of the item. Treat 0 as 1
// so a non-vaccine / single-dose item still yields sensible totals. This is the
// per-vial figure the open-vial wastage math works in — it is NOT scaled
// by pack size (use batchStockOnHand for a pack-aware doses total).
export const dosesPerUnit = (item: { doses: number }): number =>
  Math.max(1, item.doses);

// The unit a quantity is counted in: doses for ALL vaccines (every vaccine
// dispenses in doses, including single-dose-per-vial ones — #113), otherwise the
// item's own stock unit. Keyed on `isVaccine`, not the dose count, so a vaccine
// with 1 dose/vial still reads "doses" rather than its vial unit.
export const itemUnitLabel = (item: {
  isVaccine: boolean;
  unitName: string | null;
}): string => (item.isVaccine ? 'doses' : (item.unitName ?? 'unit'));

// Doses left in the last vial opened to cover `issuedDoses`, assuming every
// vial started full. Offered as the default when the operator turns the open-
// vial wastage toggle on. Zero for a whole number of vials (or nothing issued)
// and for non-vaccine / single-dose items.
export const openVialWastage = (
  issuedDoses: number,
  dosesPerVial: number
): number => {
  if (dosesPerVial <= 1 || issuedDoses <= 0) return 0;
  const remainder = issuedDoses % dosesPerVial;
  return remainder === 0 ? 0 : dosesPerVial - remainder;
};

// Combined wastage for a batch entry, in doses (units for non-vaccines).
// Reads the buckets that apply to the item's type rather than summing all
// three: legacy submitted payloads predate the open/closed/general split and
// are rehydrated with their single figure copied into both the open and
// general buckets (the item type isn't known at rehydration time), so a
// blind sum would double-count them.
export const entryWastedDoses = (
  entry: {
    openVialWastageDoses: number;
    wasted: number;
  },
  isVaccine: boolean
): number =>
  isVaccine
    ? entry.openVialWastageDoses
    : entry.wasted;

export interface CourseAllocation {
  course: VaccineCourseSummary;
  // Sum of coverage counts across all configured doses in this course.
  expectedIssued: number;
  // Sum of `issued` from every batch whose stock-line belongs to one of the
  // course's items.
  batchTotal: number;
  // Combined wastage (open-vial + general) across the same
  // batches, in doses.
  totalWasted: number;
  // Sum of stock-on-hand (in doses) across the same batches, after deducting
  // this session's issued + wasted.
  totalStockOnHand: number;
  // expectedIssued - batchTotal. Positive = under-allocated, negative = over.
  remainingToAllocate: number;
}

// Stock on hand for one batch, in doses. Matches the core stock view's
// packs × pack_size × doses_per_unit (QuantityUtils.packsToDoses). Pack size
// lives on the stock line, so each batch converts with its own.
export const batchStockOnHand = (
  item: ItemWithBatches,
  batchId: string
): number => {
  const b = item.batches.find(x => x.id === batchId);
  if (!b) return 0;
  return QuantityUtils.packsToDoses(b.availableNumberOfPacks, {
    packSize: b.packSize,
    dosesPerUnit: dosesPerUnit(item),
  });
};

export const itemStockOnHandTotal = (item: ItemWithBatches): number =>
  item.batches.reduce(
    (sum, b) =>
      sum +
      QuantityUtils.packsToDoses(b.availableNumberOfPacks, {
        packSize: b.packSize,
        dosesPerUnit: dosesPerUnit(item),
      }),
    0
  );

// Stock left for an item after this session's entries: total on hand minus
// issued and wasted across all its batches (in doses; units for non-vaccines).
// Negative ⇒ the operator entered more than is available — the Step-2 gate
// blocks Continue on this, and the card shows it in red.
export const itemRemainingStock = (
  item: ItemWithBatches,
  batches: Record<string, BatchEntry>
): number => {
  let issued = 0;
  let wasted = 0;
  item.batches.forEach(b => {
    const entry = batches[b.id];
    if (!entry) return;
    issued += entry.issued;
    wasted += entryWastedDoses(entry, item.isVaccine);
  });
  return itemStockOnHandTotal(item) - issued - wasted;
};

// Sums coverage counts grouped by vaccine_course_dose_id. Only doses that are
// explicitly linked to a course dose (vaccine_course_dose_id set) contribute —
// unlinked doses are intentionally excluded so they don't bleed into other
// courses sharing the same demographic group.
const buildDoseTotals = (
  config: DailyTallyConfig,
  counts: Record<string, number>
): Record<string, number> => {
  const totals: Record<string, number> = {};
  config.demographic_groups.forEach(group =>
    group.doses.forEach(dose =>
      group.counters.forEach(counter => {
        const count = counts[countKey(dose.id, counter.id)] ?? 0;
        if (count === 0) return;
        totals[dose.vaccine_course_dose_id] =
          (totals[dose.vaccine_course_dose_id] ?? 0) + count;
      })
    )
  );
  return totals;
};

// Per-course allocation snapshot used by both the card UI and the Continue-
// button gate.
export const computeAllocations = (
  config: DailyTallyConfig,
  counts: Record<string, number>,
  batches: Record<string, BatchEntry>,
  courses: VaccineCourseSummary[]
): CourseAllocation[] => {
  const doseTotals = buildDoseTotals(config, counts);

  return courses.map(course => {
    const expectedIssued = course.configuredDoseIds.reduce(
      (sum, doseId) => sum + (doseTotals[doseId] ?? 0),
      0
    );

    let batchTotal = 0;
    let totalWasted = 0;
    let totalStockOnHand = 0;
    course.items.forEach(item => {
      let itemRemaining = itemStockOnHandTotal(item);
      item.batches.forEach(b => {
        const entry = batches[b.id];
        if (!entry) return;
        const wasted = entryWastedDoses(entry, item.isVaccine);
        batchTotal += entry.issued;
        totalWasted += wasted;
        // Reduce stock-on-hand by the amount allocated/wasted so the
        // "Remaining" header reflects what's left after this session.
        itemRemaining -= entry.issued + wasted;
      });
      totalStockOnHand += itemRemaining;
    });

    return {
      course,
      expectedIssued,
      batchTotal,
      totalWasted,
      totalStockOnHand,
      remainingToAllocate: expectedIssued - batchTotal,
    };
  });
};

// Strict gating policy chosen for M3: any over- or under-allocation across
// any course blocks Continue. See requirements.md / IMPLEMENTATION_PLAN.md.
export const isAllocationOk = (allocations: CourseAllocation[]): boolean =>
  allocations.every(a => a.remainingToAllocate === 0);

export interface AutoIssueAssignment {
  stockLineId: string;
  issued: number;
}

// When a course is a single "logical batch" — all its in-stock stock lines share
// item + batch number + expiry — there's no allocation decision, so the Step-1
// expected total is auto-issued to it (distributed greedily across the lines:
// each filled to its doses on hand, any remainder on the last line, which the
// submit-time shortfall guard surfaces).
//
// It re-runs to keep auto values in sync with Step-1 coverage: lines that are
// untouched, or were themselves auto-issued (entry.autoIssued), are (re)filled
// to the new total — including back to 0 if coverage was cleared — while a line
// the operator hand-edited is left alone (the whole group is skipped). Courses
// with 0 in-stock lines or more than one logical batch (different batch/expiry,
// or multiple items) are skipped.
//
// LOOP SAFETY (this effect re-runs whenever `batches` changes, including its own
// writes, so it MUST converge):
//   - emit a line ONLY when its amount actually changes, so applying the output
//     makes the next run a no-op;
//   - coerce a non-finite assign to 0 (NaN never equals itself, so it would
//     emit forever otherwise);
//   - a stock line claimed by an earlier course is not reassigned by a later
//     one (dedupe), so two courses sharing a line can't oscillate.
export const singleBatchAutoIssue = (
  allocations: CourseAllocation[],
  batches: Record<string, BatchEntry>
): AutoIssueAssignment[] => {
  const out: AutoIssueAssignment[] = [];
  const assigned = new Set<string>();
  allocations.forEach(a => {
    const lines = a.course.items.flatMap(item =>
      item.batches
        .filter(b => b.availableNumberOfPacks > 0)
        .map(b => ({ item, b }))
    );
    if (lines.length === 0) return;

    const key = (l: { item: ItemWithBatches; b: BatchInfo }) =>
      `${l.item.id}|${l.b.batch ?? ''}|${l.b.expiryDate ?? ''}`;
    const [head, ...rest] = lines;
    if (!head) return;
    if (rest.some(l => key(l) !== key(head))) return; // > 1 logical batch

    // A line already claimed by an earlier course → skip this course entirely.
    if (lines.some(l => assigned.has(l.b.id))) return;
    // Operator hand-edited a line (autoIssued explicitly false) → leave it.
    // autoIssued=undefined means the entry was created by e.g. the wastage
    // toggle before auto-fill ran — treat as "not yet manually edited" so
    // auto-fill still fires.
    if (
      lines.some(l => {
        const entry = batches[l.b.id];
        return entry !== undefined && entry.autoIssued !== true;
      })
    )
      return;

    let remaining = a.expectedIssued;
    lines.forEach(({ item, b }, idx) => {
      const isLast = idx === lines.length - 1;
      const raw = isLast
        ? remaining
        : Math.min(remaining, batchStockOnHand(item, b.id));
      const assign = Number.isFinite(raw) ? raw : 0;
      remaining -= assign;
      assigned.add(b.id);
      const current = batches[b.id]?.issued ?? 0;
      if (assign !== current) out.push({ stockLineId: b.id, issued: assign });
    });
  });
  return out;
};

// Why a course did (or didn't) get auto-issued — mirrors singleBatchAutoIssue's
// in-stock-line analysis so the card can explain itself:
//  - single-batch       → one logical batch in stock; auto-fill applies.
//  - multiple-products  → in-stock lines span 2+ items; operator picks which.
//  - multiple-batches   → one item but 2+ batch/expiry in stock; operator picks.
//  - no-stock           → nothing in stock to issue.
export type AutoIssueStatus =
  | 'single-batch'
  | 'multiple-products'
  | 'multiple-batches'
  | 'no-stock';

export const autoIssueStatus = (
  course: VaccineCourseSummary
): AutoIssueStatus => {
  const lines = course.items.flatMap(item =>
    item.batches
      .filter(b => b.availableNumberOfPacks > 0)
      .map(b => ({ itemId: item.id, key: `${b.id}|${b.batch ?? ''}|${b.expiryDate ?? ''}` }))
  );
  const [head] = lines;
  if (!head) return 'no-stock';
  if (new Set(lines.map(l => l.itemId)).size > 1) return 'multiple-products';
  if (lines.some(l => l.key !== head.key)) return 'multiple-batches';
  return 'single-batch';
};
