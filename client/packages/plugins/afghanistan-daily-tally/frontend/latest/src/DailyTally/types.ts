// Shapes for the Daily Tally plugin. See data_model.md for the canonical
// technical reference. IDs are server UUIDs as strings unless stated otherwise.

import { GenderTypeNode } from '@openmsupply-client/common';
import type { PluginLocaleKey } from '../locales';

// --- Configuration (`configuration` plugin_data row) ----------------------

export interface Counter {
  id: string;
  label: string;
  // Optional short form used in the collapsed-dose summary badges
  // (e.g. "M"/"F" for Male/Female, "NP" for Non-pregnant). Defaults to the
  // first character of `label` if omitted.
  abbreviation?: string;
  // Optional gender used when creating the synthetic cohort patient at
  // submission time. Absent → patient is created with gender = UNKNOWN.
  gender?: GenderTypeNode;
}

export interface DoseEntry {
  id: string;
  vaccine_course_dose_id: string;
  // Denormalised from the referenced `vaccine_course_dose` so the workflow
  // can render dose rows without a separate fetch. The canonical name lives
  // in the vaccine course tables; this is a config-time snapshot.
  display_name: string;
}

// Top-level orange section (e.g. "0-11 months", "Women 15-49"). Holds the
// counters its doses are broken down by, and the doses available to the group.
export interface DemographicGroup {
  id: string;
  label: string;
  // The breakdown every dose in this group is counted by. The same counters
  // apply to all of the group's doses (e.g. Male/Female, or
  // Pregnant/Non-pregnant for "Women 15-49").
  counters: Counter[];
  // The vaccine course doses available to give to this group.
  doses: DoseEntry[];
  // Unit used in the per-dose summary count ("0 doses", "0 women", …).
  // Defaults to "doses" when omitted.
  unit?: string;
  // Optional header for this group's column in the Step 3 coverage summary.
  // Falls back to `label` when omitted. A group appears in the summary by being
  // listed in a `SummaryTable.columns`; if it isn't, it's omitted from the
  // summary (still rendered in Step 1).
  summary_label?: string;
}

export interface NonVaccineItem {
  id: string;
  // An item offered in the Non-vaccine items section that is not linked to a
  // vaccine via ancillary_item — e.g. notebooks, non-medical supplies.
  // Ancillary-linked items are derived automatically at runtime from the
  // group's vaccine course items; this list is for the unlinked extras.
  item_id: string;
}

export interface WastageReasons {
  open_vial: string;
  negative_adjustment: string;
}

export interface SummaryTable {
  id: string;
  // Banner header for the section (e.g. "Children's Vaccination Summary").
  label: string;
  // Trailing row label (e.g. "Children Subtotal").
  subtotal_label: string;
  // Ordered list of `DemographicGroup.id`s, one per column. The column header
  // is the group's `summary_label` (falling back to its `label`); the
  // sub-column headers come from the group's counter labels. Ids that don't
  // resolve to a group are skipped (config drift is tolerated).
  columns: string[];
}

export interface DailyTallyConfig {
  demographic_groups: DemographicGroup[];
  non_vaccine_items: NonVaccineItem[];
  wastage_reasons: WastageReasons;
  // Step 3 grouping for the coverage summary tables. Optional; absent means
  // the Step 3 coverage summary renders nothing.
  summary_tables?: SummaryTable[];
  // Admin-controlled display order of vaccine courses, as `vaccine_course` ids.
  // Honoured by the config dose matrix columns and the Step-2 course cards.
  // Optional/back-compat: absent → source order. Courses missing from the list
  // are appended (original order); ids no longer present are ignored. See #105.
  vaccine_course_order?: string[];
  // Admin-controlled global display order of individual doses *across* vaccine
  // courses, as `vaccine_course_dose` ids. Every demographic group renders its
  // assigned doses in this single shared order, skipping any it doesn't have —
  // so it applies to both Step 1 (coverage rows) and Step 3 (summary rows).
  // Optional/back-compat: absent/empty → fall back to the course-based order
  // (vaccine_course_order). Doses missing from the list keep their original
  // relative order and follow; ids no longer present are ignored. See #112.
  dose_order?: string[];
}

// --- Tally payload (DAILY_TALLY plugin_data row) --------------------------

export const SessionType = {
  FixedSession: 'FIXED_SESSION',
  Outreach: 'OUTREACH',
  Mobile: 'MOBILE',
} as const;

export type SessionType = (typeof SessionType)[keyof typeof SessionType];

// Stable English label for a session type. Used to build the tally's
// `reference` / breadcrumb identifier and the persisted `theirReference` on
// prescriptions — these are data/match keys, so this MUST stay language-neutral
// (translating it would break prescription linkage and cross-language matching).
// For *display* of a session type, translate `sessionTypeDisplayKey` instead.
export const sessionTypeLabel = (
  type: SessionType | null | undefined
): string => {
  switch (type) {
    case SessionType.FixedSession:
      return 'Fixed';
    case SessionType.Outreach:
      return 'Outreach';
    case SessionType.Mobile:
      return 'Mobile';
    default:
      return '';
  }
};

// Translation key for displaying a session type as a short label
// ("Fixed"/"Outreach"/"Mobile"). Pass the result to `usePluginTranslation`.
// Returns null for an unset type so callers can omit the label.
export const sessionTypeDisplayKey = (
  type: SessionType | null | undefined
): PluginLocaleKey | null => {
  switch (type) {
    case SessionType.FixedSession:
      return 'session-type.fixed';
    case SessionType.Outreach:
      return 'session-type.outreach';
    case SessionType.Mobile:
      return 'session-type.mobile';
    default:
      return null;
  }
};

// Human identifier for a session: `Daily tally - {dd MMM yyyy} (Type)` (the
// `(Type)` is dropped when the type is unknown). Shown in the list + breadcrumb,
// and forms the prefix of every cohort prescription's theirReference.
export const tallySessionIdentifier = (
  dateLabel: string,
  typeLabel: string
): string => `Daily tally - ${dateLabel}${typeLabel ? ` (${typeLabel})` : ''}`;

// `theirReference` written to each cohort's prescription at submission. Every
// cohort in a session shares the `{session identifier} - ` prefix, so the list
// view can filter the Prescriptions list on that prefix to surface all of a
// session's cohort prescriptions at once — and the session type in the prefix
// keeps two same-date sessions of different types apart. Keep these the single
// source of truth: the filter only works while it matches what submission writes.
export const tallyPrescriptionReferencePrefix = (
  dateLabel: string,
  typeLabel: string
): string => `${tallySessionIdentifier(dateLabel, typeLabel)} - `;

export const tallyPrescriptionReference = (
  dateLabel: string,
  typeLabel: string,
  demographicGroupLabel: string,
  counterLabel: string
): string =>
  `${tallyPrescriptionReferencePrefix(dateLabel, typeLabel)}${demographicGroupLabel} ${counterLabel}`;

// Draft vs submitted is a field on the payload; both share the single
// DAILY_TALLY data_identifier.
export const TallyStatus = {
  Draft: 'DRAFT',
  Submitted: 'SUBMITTED',
} as const;

export type TallyStatus = (typeof TallyStatus)[keyof typeof TallyStatus];

export interface TallyHeader {
  type: SessionType;
}

export interface CoverageEntry {
  demographic_group_id: string;
  // DoseEntry.id within the group.
  dose_id: string;
  vaccine_course_dose_id: string;
  counter_id: string;
  count: number;
  // Stable identity of the cell, denormalised at submission so historical
  // coverage survives config edits/re-uploads (which regenerate the
  // group/dose/counter UUIDs above). The summary + report resolve counts by
  // (demographic_group_label, vaccine_course_dose_id, counter_label) instead
  // of the volatile ids — see resolveCoverageCounts + issue #77. Optional:
  // absent on rows submitted before this field existed (those fall back to the
  // legacy id match, which only resolves while the config is unchanged).
  demographic_group_label?: string;
  counter_label?: string;
}

export interface IssuanceEntry {
  item_id: string;
  stock_line_id: string;
  packs_issued: number;
  doses_issued: number;
  vaccine_course_dose_id: string | null;
}

// Which wastage bucket a WastageEntry records. Vaccines have OPEN_VIAL
// (doses left in opened vials) and CLOSED_VIAL (whole sealed vials wasted —
// broken, frozen, expired); non-vaccine items have GENERAL.
export const WastageType = {
  OpenVial: 'OPEN_VIAL',
  General: 'GENERAL',
} as const;

export type WastageType = (typeof WastageType)[keyof typeof WastageType];

export interface WastageEntry {
  stock_line_id: string;
  type?: WastageType;
  // Canonical quantity in doses (units for GENERAL). CLOSED_VIAL entries are
  // always a whole-vial multiple — the input is captured in vials.
  doses_wasted: number;
  reason_option_id: string;
}

// --- Display snapshot (set only when SUBMITTED) ---------------------------
// A point-in-time snapshot of the vaccine/item data the read-only views need,
// captured at submission so a finalised tally renders from itself and is immune
// to later edits or deletion of the vaccine courses / items it referenced. The
// shapes mirror the resolved `UseVaccineBatchDataResult` (see
// DetailView/BatchAndWastage/useVaccineBatchData.ts) — `buildDisplaySnapshot`
// serialises that result into this, `reconstructVaccineData` rebuilds it.
// Absent on drafts and on tallies submitted before this field existed; those
// fall back to the live join.

export interface SnapshotBatch {
  // stock_line_id — matches the `stock_line_id` on issuance / wastage entries.
  id: string;
  batch: string | null;
  expiry_date: string | null;
  // Opening stock, as of submission (pre-deduction). Drives the "Opening
  // stock" / "Remaining" figures so they stay a true point-in-time record.
  available_number_of_packs: number;
  pack_size: number;
}

export interface SnapshotItem {
  id: string;
  name: string;
  code: string;
  unit_name: string | null;
  // Doses per unit (vial) for vaccines; 1 for non-vaccine / single-dose items.
  doses: number;
  is_vaccine: boolean;
  batches: SnapshotBatch[];
}

export interface SnapshotCourse {
  id: string;
  name: string;
  demographic_id: string | null;
  // Ids into `TallyDisplaySnapshot.items`.
  item_ids: string[];
  // The course's vaccine_course_dose_ids that this tally's config uses.
  configured_dose_ids: string[];
  // vaccine_course_dose_id -> dose label (e.g. "BCG 1").
  dose_labels: Record<string, string>;
}

export interface TallyDisplaySnapshot {
  courses: SnapshotCourse[];
  // Ids into `items` for the pooled non-vaccine items.
  non_vaccine_item_ids: string[];
  // Deduped item pool referenced by id from `courses[].item_ids` and
  // `non_vaccine_item_ids` (an item shared across courses is stored once).
  items: SnapshotItem[];
}

// The slice of config frozen into a submitted tally (config_snapshot below).
// Exactly the fields the coverage views + the Vaccination Coverage report read
// (the report types its `ReportConfig` as this same Pick), so a finalised tally
// renders its coverage from the structure/labels it was entered with — immune to
// later config edits/re-uploads/deletion. See issue #77.
export type TallyConfigSnapshot = Pick<
  DailyTallyConfig,
  'demographic_groups' | 'summary_tables'
>;

export interface TallyPayload {
  // DRAFT while in progress, SUBMITTED once finalised.
  status: TallyStatus;
  // ISO timestamp of when the tally was first created (as a draft). Set once
  // at creation and preserved through submission.
  created_datetime: string;
  // The session date as a naive calendar date (`YYYY-MM-DD`, no time/zone).
  // This is the value used for display and the row identifier. The sortable /
  // filterable `plugin_data.datetime` column carries the same date for the list.
  tally_date: string;
  header: TallyHeader;
  coverage: CoverageEntry[];
  issuance: IssuanceEntry[];
  wastage: WastageEntry[];

  // --- Set only when status = SUBMITTED ---------------------------------
  // One prescription per demographic cohort — (demographic_group.label,
  // counter.label) — with non-zero coverage. `plugin_data.related_record_id`
  // points at the first id for sortability; the rest live here.
  prescription_invoice_ids?: string[];
  // One inventory-adjustment invoice per wastage line (the host's
  // createInventoryAdjustment adjusts a single stock line per call). Empty /
  // absent when the tally had zero wastage. `inventory_adjustment_numbers`
  // carries the matching human-readable invoice numbers for display — there
  // is no host UI page for an adjustment invoice to link to.
  inventory_adjustment_ids?: string[];
  inventory_adjustment_numbers?: number[];
  // Legacy: tallies submitted before wastage moved to inventory adjustments
  // recorded their wastage via a single stocktake. Kept so old rows still
  // render their stocktake link in the list.
  stocktake_id?: string | null;
  submitted_datetime?: string;
  submitted_by_user_id?: string;
  // Snapshot of the vaccine/item data the read-only views render from, frozen
  // at submission. Absent on legacy submitted rows (they fall back to the live
  // vaccine-course join). See the SnapshotItem / SnapshotCourse block above.
  display_snapshot?: TallyDisplaySnapshot;
  // Snapshot of the coverage-relevant config (demographic_groups +
  // summary_tables) frozen at submission, so the read-only review renders the
  // structure/labels the tally was entered with even after the live config is
  // edited/re-uploaded/deleted (issue #77). Complements display_snapshot, which
  // freezes the DB-derived vaccine/item data (different source). Absent on
  // legacy rows submitted before this field existed (they fall back to the live
  // config). NB: the cross-tally coverage *report* still aggregates into the
  // current config — see the stable-identity matching on CoverageEntry.
  config_snapshot?: TallyConfigSnapshot;
}

// --- Draft payload --------------------------------------------------------
// An in-progress tally (status = DRAFT). Shares the DAILY_TALLY identifier and
// row shape with a submitted tally; the value of `status` and the absence of
// the submission fields distinguish them. Content may be incomplete at any
// step, so every field is optional.
export type TallyDraftPayload = Partial<TallyPayload>;
