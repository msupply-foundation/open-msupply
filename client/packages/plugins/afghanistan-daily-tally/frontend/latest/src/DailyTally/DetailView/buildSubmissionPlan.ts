import { GenderTypeNode } from '@openmsupply-client/common';
import { DailyTallyConfig, WastageType } from '../types';
import { countKey, TallyDraft } from './draft';
import {
  ItemWithBatches,
  UseVaccineBatchDataResult,
} from './BatchAndWastage/useVaccineBatchData';
import { buildPatientCode } from '../api/submission';

// Pure synchronous derivation of the submission plan from in-memory state.
//
// Inputs:
//   - the user's TallyDraft (counts + per-stock-line BatchEntry rows)
//   - the `configuration` plugin_data row
//   - the resolved vaccine batch data (courses, items, batches, ancillaries)
//   - the current store code (for patient code generation)
//
// Outputs:
//   - CohortPlan[] (one per non-zero (demographic_group.label, counter.label)
//     cohort) with prescription line tuples already apportioned via FEFO
//   - WastageLinePlan[] (one per (stock line, wastage type) with a non-zero
//     figure — a vaccine batch with open-vial wastage produces one line,
//     each becoming its own inventory adjustment)
//
// Nothing here touches the network — pure computation, easy to inspect /
// test in isolation. The orchestration hook (useTallySubmission) feeds the
// result into the patient/prescription/inventory-adjustment mutations.

export interface PrescriptionLinePlan {
  stockLineId: string;
  itemId: string;
  itemName: string;
  batchLabel: string | null;
  numberOfPacks: number;
  numberOfDoses: number; // for display in the confirmation modal
  // Item units (vials) for display only. numberOfPacks is in *packs*, which
  // differs from vials when packSize > 1; vials = packs × packSize =
  // doses / dosesPerUnit.
  numberOfVials: number;
  vaccineCourseDoseId: string | null;
  isAncillary: boolean;
}

export interface CohortPlan {
  // `{group.label}|{counter.label}` — stable across sessions.
  key: string;
  demographicGroupLabel: string;
  counterLabel: string;
  patientCode: string;
  gender: GenderTypeNode;
  lines: PrescriptionLinePlan[];
}

export interface WastageLinePlan {
  stockLineId: string;
  itemId: string;
  itemName: string;
  batchLabel: string | null;
  // Which wastage bucket this line records — drives the reason option, the
  // payload's WastageEntry.type, and the confirmation modal's chip.
  type: WastageType;
  wastedDoses: number;
  // `createInventoryAdjustment` takes the reduction in packs:
  // wastedDoses / (pack_size × doses per unit). Closed-vial lines reduce by
  // whole vials, which is a fractional pack count when pack_size > 1.
  wastedPacks: number;
  reasonOptionId: string;
}

export interface SubmissionPlan {
  cohorts: CohortPlan[];
  wastageLines: WastageLinePlan[];
  // Totals shown in the confirmation modal header.
  totalCoverage: number;
  totalWastedDoses: number;
}

// FEFO comparator for batches. Null/undefined expiries sort last (treat as
// "expires in the far future" — same convention as the rest of the dispensing
// flows).
const compareFefo = (
  a: { expiryDate: string | null },
  b: { expiryDate: string | null }
): number => {
  if (!a.expiryDate && !b.expiryDate) return 0;
  if (!a.expiryDate) return 1;
  if (!b.expiryDate) return -1;
  return a.expiryDate.localeCompare(b.expiryDate);
};

interface BatchLedgerEntry {
  stockLineId: string;
  batchLabel: string | null;
  expiryDate: string | null;
  packSize: number;
  dosesPerPack: number; // = packSize × max(1, item.doses) — doses in one pack
  dosesRemaining: number; // running, decremented as cohorts draw
}

// Build a per-item ledger of allocated stock lines (only those the user
// entered issued > 0 on), in FEFO order, in doses. Cohort allocation walks
// this ledger and decrements `dosesRemaining`.
const ledgerForItem = (
  item: ItemWithBatches,
  draft: TallyDraft
): BatchLedgerEntry[] => {
  const perUnit = Math.max(1, item.doses);
  return item.batches
    .filter(b => (draft.batches[b.id]?.issued ?? 0) > 0)
    .sort(compareFefo)
    .map(b => ({
      stockLineId: b.id,
      batchLabel: b.batch,
      expiryDate: b.expiryDate,
      packSize: b.packSize,
      // Doses per pack is per stock line (pack size can differ between an
      // item's batches): pack_size units × doses per unit.
      dosesPerPack: b.packSize * perUnit,
      dosesRemaining: draft.batches[b.id]!.issued,
    }));
};

// Largest-remainder rounding: given totals and proportional float shares,
// produce integer pack counts that sum exactly to the entered total.
const largestRemainderRound = (
  fractionalShares: number[],
  total: number
): number[] => {
  const floors = fractionalShares.map(Math.floor);
  const remainders = fractionalShares.map((v, i) => ({
    i,
    r: v - floors[i]!,
  }));
  let assigned = floors.reduce((a, b) => a + b, 0);
  remainders.sort((a, b) => b.r - a.r);
  let idx = 0;
  while (assigned < total && idx < remainders.length) {
    const target = remainders[idx]!.i;
    floors[target] = (floors[target] ?? 0) + 1;
    assigned += 1;
    idx += 1;
  }
  return floors;
};

export const buildSubmissionPlan = (args: {
  draft: TallyDraft;
  config: DailyTallyConfig;
  vaccineData: UseVaccineBatchDataResult;
  storeCode: string;
}): SubmissionPlan => {
  const { draft, config, vaccineData, storeCode } = args;

  // Group cohorts by (demographic_group.label, counter.label). A demographic
  // group's counters are shared across all its doses, so every non-zero
  // (dose, counter) cell in the group feeds the matching counter's cohort.
  interface CohortAccumulator {
    demographicGroupLabel: string;
    counterLabel: string;
    gender: GenderTypeNode;
    // doseId (config DoseEntry.id) → contributing count
    doseContributions: Record<string, number>;
  }
  const cohortsAcc = new Map<string, CohortAccumulator>();
  let totalCoverage = 0;

  for (const group of config.demographic_groups) {
    for (const dose of group.doses) {
      for (const counter of group.counters) {
        const count = Math.floor(
          draft.counts[countKey(dose.id, counter.id)] ?? 0
        );
        if (!count || count <= 0) continue;
        totalCoverage += count;
        const key = `${group.label}|${counter.label}`;
        let cohort = cohortsAcc.get(key);
        if (!cohort) {
          cohort = {
            demographicGroupLabel: group.label,
            counterLabel: counter.label,
            gender: counter.gender ?? GenderTypeNode.Unknown,
            doseContributions: {},
          };
          cohortsAcc.set(key, cohort);
        }
        cohort.doseContributions[dose.id] =
          (cohort.doseContributions[dose.id] ?? 0) + count;
      }
    }
  }

  // config dose.id → vaccine_course_dose_id, and config dose.id → the
  // VaccineCourseSummary that contains it. Cohort doseContributions are
  // keyed by config-level dose.id (e.g. "d-bcg"); `vaccineData.courses` are
  // indexed by `vaccine_course_dose_id` (UUID). Resolving via the mapping
  // table avoids confusing the two key spaces.
  const courseDoseIdByDoseId: Record<string, string> = {};
  const courseByConfigDoseId: Record<
    string,
    (typeof vaccineData.courses)[number]
  > = {};
  for (const group of config.demographic_groups) {
    for (const dose of group.doses) {
      courseDoseIdByDoseId[dose.id] = dose.vaccine_course_dose_id;
      const course = vaccineData.courses.find(c =>
        c.configuredDoseIds.includes(dose.vaccine_course_dose_id)
      );
      if (course) courseByConfigDoseId[dose.id] = course;
    }
  }

  // Build per-cohort line lists, allocating vaccine items FEFO.
  // Ledgers are shared across cohorts so the allocation is conserved (total
  // doses drawn matches the user's per-batch entries).
  const itemLedgers: Record<string, BatchLedgerEntry[]> = {};
  const ledgerForItemMemoised = (item: ItemWithBatches) => {
    if (!itemLedgers[item.id]) {
      itemLedgers[item.id] = ledgerForItem(item, draft);
    }
    return itemLedgers[item.id]!;
  };

  const cohortLines = new Map<string, PrescriptionLinePlan[]>();
  for (const key of cohortsAcc.keys()) cohortLines.set(key, []);

  // Iterate cohorts in insertion order (which mirrors the order counts were
  // first observed in `draft.counts`; for deterministic behaviour the caller
  // can rely on Map's insertion ordering).
  for (const [cohortKey, cohort] of cohortsAcc.entries()) {
    const lines = cohortLines.get(cohortKey)!;
    for (const [doseId, doseCount] of Object.entries(
      cohort.doseContributions
    )) {
      const course = courseByConfigDoseId[doseId];
      if (!course) continue; // course no longer maps to this dose; skip
      const courseDoseId = courseDoseIdByDoseId[doseId];
      for (const item of course.items) {
        const ledger = ledgerForItemMemoised(item);
        let need = doseCount;
        for (const entry of ledger) {
          if (need <= 0) break;
          if (entry.dosesRemaining <= 0) continue;
          const takeDoses = Math.min(need, entry.dosesRemaining);
          const takePacks = takeDoses / entry.dosesPerPack;
          lines.push({
            stockLineId: entry.stockLineId,
            itemId: item.id,
            itemName: item.name,
            batchLabel: entry.batchLabel,
            numberOfPacks: takePacks,
            numberOfDoses: takeDoses,
            numberOfVials: takePacks * entry.packSize,
            vaccineCourseDoseId: courseDoseId ?? null,
            isAncillary: false,
          });
          entry.dosesRemaining -= takeDoses;
          need -= takeDoses;
        }
        // If `need > 0` here, allocation didn't cover the cohort — Step 2's
        // gate should have prevented this. We don't loudly fail; the unmet
        // doses are silently dropped (the operator sees the prescription
        // come up short and can investigate).
      }
    }
  }

  // Non-vaccine item apportionment to cohorts (ancillary links + items listed
  // explicitly in config.non_vaccine_items, pooled by useVaccineBatchData).
  // Step 2 captures total units per non-vaccine stock line; we back-fit by
  // splitting the entered total across cohorts proportional to their coverage
  // totals. The pool loses per-course linkage, so we treat every non-vaccine
  // item as universally applicable across the configured doses — the typical
  // case for syringes / safety boxes / supplies shared across the session. If
  // finer granularity becomes necessary the data layer should surface the link
  // directly.
  const allCohortKeys = Array.from(cohortsAcc.keys());
  for (const nonVaccineItem of vaccineData.nonVaccineItems) {
    const ancillaryLedger = ledgerForItem(nonVaccineItem, draft);
    if (ancillaryLedger.length === 0) continue;
    // Per-cohort demand = total cohort coverage (sum across the cohort's
    // contributions). When all ancillaries are treated as universally
    // applicable, this is equivalent to splitting by cohort total.
    const cohortDemands: Record<string, number> = {};
    let totalDemand = 0;
    for (const cohortKey of allCohortKeys) {
      const cohort = cohortsAcc.get(cohortKey)!;
      const cohortTotal = Object.values(cohort.doseContributions).reduce(
        (a, b) => a + b,
        0
      );
      cohortDemands[cohortKey] = cohortTotal;
      totalDemand += cohortTotal;
    }
    if (totalDemand <= 0) continue;
    // Allocate ancillary's total entered issuance (in doses, which == units
    // for non-vaccines) across cohorts proportional to their demand.
    const totalEntered = ancillaryLedger.reduce(
      (a, e) => a + e.dosesRemaining,
      0
    );
    if (totalEntered <= 0) continue;
    const fractionalShares = allCohortKeys.map(
      k => (cohortDemands[k]! / totalDemand) * totalEntered
    );
    const shares = largestRemainderRound(fractionalShares, totalEntered);
    for (let i = 0; i < allCohortKeys.length; i += 1) {
      const cohortKey = allCohortKeys[i]!;
      let need = shares[i]!;
      if (need <= 0) continue;
      const lines = cohortLines.get(cohortKey)!;
      for (const entry of ancillaryLedger) {
        if (need <= 0) break;
        if (entry.dosesRemaining <= 0) continue;
        const takeUnits = Math.min(need, entry.dosesRemaining);
        const takePacks = takeUnits / entry.dosesPerPack;
        lines.push({
          stockLineId: entry.stockLineId,
          itemId: nonVaccineItem.id,
          itemName: nonVaccineItem.name,
          batchLabel: entry.batchLabel,
          numberOfPacks: takePacks,
          numberOfDoses: takeUnits,
          numberOfVials: takePacks * entry.packSize,
          vaccineCourseDoseId: null,
          isAncillary: true,
        });
        entry.dosesRemaining -= takeUnits;
        need -= takeUnits;
      }
    }
  }

  // Finalise cohort plans, merging lines that share a stockLineId within the
  // same cohort. mSupply enforces unique `(invoice_id, stock_line_id)` on
  // prescription lines, so two doses sharing a vaccine_course (e.g. OPV-0 +
  // OPV-1 both on bOPV) would otherwise produce duplicate lines and the
  // batchPrescription mutation rejects with "Stock line is already reference
  // by an invoice line of this invoice". The merged line keeps the first
  // vaccine_course_dose_id seen — issuance audit detail at the cohort
  // boundary is sacrificed in favour of matching what's actually invoiced.
  const mergeLinesByStockLine = (
    raw: PrescriptionLinePlan[]
  ): PrescriptionLinePlan[] => {
    const merged = new Map<string, PrescriptionLinePlan>();
    for (const line of raw) {
      const existing = merged.get(line.stockLineId);
      if (existing) {
        existing.numberOfPacks += line.numberOfPacks;
        existing.numberOfDoses += line.numberOfDoses;
        existing.numberOfVials += line.numberOfVials;
      } else {
        merged.set(line.stockLineId, { ...line });
      }
    }
    return Array.from(merged.values());
  };

  const cohorts: CohortPlan[] = Array.from(cohortsAcc.entries()).map(
    ([key, acc]) => ({
      key,
      demographicGroupLabel: acc.demographicGroupLabel,
      counterLabel: acc.counterLabel,
      patientCode: buildPatientCode(
        storeCode,
        acc.demographicGroupLabel,
        acc.counterLabel
      ),
      gender: acc.gender,
      lines: mergeLinesByStockLine(cohortLines.get(key) ?? []),
    })
  );

  // Wastage lines: one per (stock line, wastage type) with a non-zero figure.
  // We process both buckets for every entry and skip the zeros — this avoids
  // any dependency on item.isVaccine. In practice the buckets are mutually
  // exclusive: vaccine items have wasted=0 and the UI writes to
  // openVialWastageDoses; non-vaccine items have that field = 0 and write to
  // wasted.
  const wastageLines: WastageLinePlan[] = [];
  let totalWastedDoses = 0;
  for (const [stockLineId, entry] of Object.entries(draft.batches)) {
    const item = vaccineData.itemByStockLineId[stockLineId];
    if (!item) continue;
    const batch = item.batches.find(b => b.id === stockLineId);
    const dosesPerPack = (batch?.packSize ?? 1) * Math.max(1, item.doses);
    const buckets: Array<{
      type: WastageType;
      wastedDoses: number;
      reasonOptionId: string;
    }> = [
      {
        type: WastageType.OpenVial,
        wastedDoses: entry.openVialWastageDoses,
        reasonOptionId: config.wastage_reasons.open_vial,
      },
      {
        type: WastageType.General,
        wastedDoses: entry.wasted,
        reasonOptionId: config.wastage_reasons.negative_adjustment,
      },
    ];
    for (const bucket of buckets) {
      if (!bucket.wastedDoses || bucket.wastedDoses <= 0) continue;
      wastageLines.push({
        stockLineId,
        itemId: item.id,
        itemName: item.name,
        batchLabel: batch?.batch ?? null,
        type: bucket.type,
        wastedDoses: bucket.wastedDoses,
        wastedPacks: bucket.wastedDoses / dosesPerPack,
        reasonOptionId: bucket.reasonOptionId,
      });
      totalWastedDoses += bucket.wastedDoses;
    }
  }

  return {
    cohorts,
    wastageLines,
    totalCoverage,
    totalWastedDoses,
  };
};
