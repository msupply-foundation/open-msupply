import { DailyTallyConfig, SummaryTable } from '../../types';
import { orderCourses } from '../../courseOrder';
import { BatchEntry, countKey } from '../draft';
import {
  entryWastedDoses,
  itemStockOnHandTotal,
} from '../BatchAndWastage/coverageMath';
import {
  ItemWithBatches,
  VaccineCourseSummary,
} from '../BatchAndWastage/useVaccineBatchData';

// Pure aggregation helpers for the Step 3 Summary surface. Mirrors the
// structure of BatchAndWastage/coverageMath.ts — everything in here is
// derived from the existing draft + config + GraphQL data; nothing here is
// persisted.

export interface StockMovementRow {
  itemId: string;
  itemLabel: string;
  itemSubtitle: string;       // e.g. "20 doses/vial"
  openingStock: number;
  issued: number;
  // Combined wastage in doses (open + closed for vaccines; units for
  // non-vaccines). The open-vial split feeds the Wasted cell in the summary.
  wasted: number;
  openVialWastageDoses: number;
  remaining: number;          // opening - issued - wasted
  wastagePct: number | null;  // null → render "—"
}

export interface CoverageCell {
  columnId: string;
  counterLabel: string;
  count: number;
}

export interface CoverageRow {
  doseId: string;
  doseLabel: string;          // vaccine_course_dose label (e.g. "BCG 1")
  cells: CoverageCell[];      // sparse — renderer fills zeros
  total: number;
}

export interface CoverageTableModel {
  table: SummaryTable;
  // Resolved columns in config order: one per demographic group listed in
  // `table.columns` that still exists. `id` is the group id; `label` is the
  // group's `summary_label` (falling back to its `label`). Renderer reads this
  // instead of touching the config.
  columns: { id: string; label: string }[];
  // Per column (keyed by group id): that group's counter labels in order.
  subColumns: Record<string, string[]>;
  rows: CoverageRow[];                                // non-zero only
  subtotalsByCell: Record<string, number>;            // key: `${columnId}:${counterLabel}`
  subtotal: number;
}

export const wastagePct = (issued: number, wasted: number): number | null => {
  const denom = issued + wasted;
  if (denom === 0) return null;
  return Math.round((100 * wasted) / denom);
};

export const totalRecipients = (counts: Record<string, number>): number =>
  Object.values(counts).reduce((sum, n) => sum + n, 0);

// "20 doses/vial" for vaccines (always, even single-dose-per-vial ones — #113,
// so "1 dose/vial" rather than the vial unit name); the item's unit name for
// non-vaccines (falls back to "unit" if absent). Marked TO CHECK — we may want
// to differentiate "vial" from "pack" once real catalogue data is in.
const buildItemSubtitle = (item: ItemWithBatches): string => {
  if (item.isVaccine) {
    const perVial = Math.max(1, item.doses);
    return `${perVial} ${perVial === 1 ? 'dose' : 'doses'}/vial`;
  }
  return item.unitName ?? 'unit';
};

const itemMovement = (
  item: ItemWithBatches,
  batches: Record<string, BatchEntry>
) => {
  let issued = 0;
  let openVialWastageDoses = 0;
  let wasted = 0;
  item.batches.forEach(b => {
    const e = batches[b.id];
    if (!e) return;
    issued += e.issued;
    openVialWastageDoses += e.openVialWastageDoses;
    wasted += entryWastedDoses(e, item.isVaccine);
  });
  return { issued, openVialWastageDoses, wasted };
};

const toStockRow = (
  item: ItemWithBatches,
  batches: Record<string, BatchEntry>
): StockMovementRow => {
  const { issued, wasted, openVialWastageDoses } =
    itemMovement(item, batches);
  const opening = itemStockOnHandTotal(item);
  return {
    itemId: item.id,
    itemLabel: item.name,
    itemSubtitle: buildItemSubtitle(item),
    openingStock: opening,
    issued,
    wasted,
    openVialWastageDoses,
    remaining: opening - issued - wasted,
    wastagePct: wastagePct(issued, wasted),
  };
};

export const computeStockMovementRows = (
  _config: DailyTallyConfig,
  batches: Record<string, BatchEntry>,
  courses: VaccineCourseSummary[],
  nonVaccineItems: ItemWithBatches[]
): StockMovementRow[] => {
  // Vaccine items are nested under courses, so we flatten then dedupe by item
  // id (the same item can appear in multiple courses).
  const seen = new Set<string>();
  const rows: StockMovementRow[] = [];

  courses.forEach(course => {
    course.items.forEach(item => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      rows.push(toStockRow(item, batches));
    });
  });

  nonVaccineItems.forEach(item => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    // Items in the non-vaccine section always store wastage in entry.wasted
    // (NonVaccineItemsSection passes isVaccine=false to ItemBatchTable), even
    // when item.isVaccine is true in the DB (e.g. diluents). Override to false
    // so entryWastedDoses reads the correct bucket.
    rows.push(toStockRow({ ...item, isVaccine: false }, batches));
  });

  return rows;
};

export const computeCoverageTables = (
  config: DailyTallyConfig,
  counts: Record<string, number>,
  courses: VaccineCourseSummary[]
): CoverageTableModel[] => {
  const tables = config.summary_tables ?? [];

  // Build a (vaccine_course_dose_id -> course) lookup for doseLabel resolution.
  const courseByDoseId: Record<string, VaccineCourseSummary> = {};
  courses.forEach(c =>
    c.configuredDoseIds.forEach(d => {
      courseByDoseId[d] = c;
    })
  );

  // Each column is a demographic group, referenced by id in `table.columns`.
  const groupById = new Map(config.demographic_groups.map(g => [g.id, g]));

  return tables.map(table => {
    // Resolve column group ids in config order, dropping any that no longer
    // exist (config drift). The column header is the group's summary_label,
    // falling back to its label.
    const columnGroups = table.columns
      .map(groupId => groupById.get(groupId))
      .filter((g): g is NonNullable<typeof g> => g != null);
    const columns = columnGroups.map(g => ({
      id: g.id,
      label: g.summary_label || g.label,
    }));

    // A column's sub-columns are its group's counter labels (first-seen order).
    const subColumns: Record<string, string[]> = {};
    columnGroups.forEach(group => {
      const list: string[] = [];
      group.counters.forEach(c => {
        if (!list.includes(c.label)) list.push(c.label);
      });
      subColumns[group.id] = list;
    });

    const subtotalsByCell: Record<string, number> = {};
    let subtotal = 0;
    // One row per vaccine_course_dose_id, merged across the columns that issue
    // it (the same dose can appear in more than one column group). Each column
    // contributes its counts under its own column id.
    const rowByDose = new Map<string, CoverageRow>();

    columnGroups.forEach(group => {
      group.doses.forEach(dose => {
        group.counters.forEach(counter => {
          const count = counts[countKey(dose.id, counter.id)] ?? 0;
          if (count === 0) return;

          let row = rowByDose.get(dose.vaccine_course_dose_id);
          if (!row) {
            const course = courseByDoseId[dose.vaccine_course_dose_id];
            row = {
              doseId: dose.vaccine_course_dose_id,
              doseLabel:
                course?.doseLabelById[dose.vaccine_course_dose_id] ??
                dose.display_name,
              cells: [],
              total: 0,
            };
            rowByDose.set(dose.vaccine_course_dose_id, row);
          }

          const existing = row.cells.find(
            c => c.columnId === group.id && c.counterLabel === counter.label
          );
          if (existing) existing.count += count;
          else
            row.cells.push({
              columnId: group.id,
              counterLabel: counter.label,
              count,
            });
          row.total += count;

          const key = `${group.id}:${counter.label}`;
          subtotalsByCell[key] = (subtotalsByCell[key] ?? 0) + count;
          subtotal += count;
        });
      });
    });

    return {
      table,
      columns,
      subColumns,
      // Honour the global dose order (DailyTallyConfig.dose_order) so Step-3
      // summary rows match the Step-1 order. orderCourses is the generic stable
      // sort-by-flat-id-list (keyed here by vaccine_course_dose_id = row.doseId);
      // when dose_order is absent/empty the rows keep their first-seen Map order
      // (legacy behaviour). NB: mirrored byte-for-byte in the reports repo's
      // buildTables — keep both in sync (see plugin CLAUDE.md). See #112.
      rows: orderCourses(
        [...rowByDose.values()],
        config.dose_order,
        r => r.doseId
      ),
      subtotalsByCell,
      subtotal,
    };
  });
};
