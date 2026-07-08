import { DateUtils } from '@openmsupply-client/common';
import {
  CoverageEntry,
  DailyTallyConfig,
  SessionType,
  TallyConfigSnapshot,
  TallyPayload,
  TallyStatus,
  WastageType,
} from '../types';

// In-memory draft state shared across the wizard steps. Keys are flat for
// cheap per-keystroke updates — the richer CoverageEntry / IssuanceEntry /
// WastageEntry shapes in `types.ts` are the persistence model and the
// converter at submit time bridges the two.

export interface BatchEntry {
  // Doses (or units, for non-vaccine items) issued from this batch.
  issued: number;
  // Doses left in vials opened to cover what was issued. Vaccines only,
  // gated by `hasOpenVialWastage` in the UI.
  openVialWastageDoses: number;
  // Units wasted, for non-vaccine items only — entered directly, no toggle.
  wasted: number;
  // UI-only flag: true when the per-batch open-vial wastage input is
  // revealed. Toggling off zeroes `openVialWastageDoses`. Tracked alongside
  // the value so a "yes, none wasted" state can be distinguished from "no
  // wastage to record".
  hasOpenVialWastage: boolean;
  // True when `issued` was set by the single-batch auto-fill, not the operator.
  // Drives the "Auto-allocated" marker; cleared the moment the operator edits
  // the Issued value (see ItemBatchTable). Optional/back-compat: absent on
  // legacy + manually-entered rows. See #105.
  autoIssued?: boolean;
}

// A pristine batch entry — nothing issued or wasted. Used as the base when a
// stock line is first touched (manual edit or the single-batch auto-fill).
export const emptyBatchEntry: BatchEntry = {
  issued: 0,
  openVialWastageDoses: 0,
  wasted: 0,
  hasOpenVialWastage: false,
};

// Fills the wastage fields on entries persisted before the open / closed /
// general split, when a single `wasted` held open-vial doses for vaccines
// (toggle on) and units for non-vaccines (toggle never set). That invariant
// makes the mapping exact without knowing the item type.
const normaliseBatchEntry = (entry: BatchEntry): BatchEntry => {
  if (entry.openVialWastageDoses !== undefined) return entry;
  return {
    ...entry,
    openVialWastageDoses: entry.hasOpenVialWastage ? entry.wasted : 0,
    wasted: entry.hasOpenVialWastage ? 0 : entry.wasted,
  };
};

const normaliseBatches = (
  batches: Record<string, BatchEntry>
): Record<string, BatchEntry> =>
  Object.fromEntries(
    Object.entries(batches).map(([id, entry]) => [
      id,
      normaliseBatchEntry(entry),
    ])
  );

// A counter belongs to a demographic group and is shared across all of the
// group's doses, so a coverage cell is identified by the (dose, counter) pair
// — not the counter alone. `countKey` builds the flat `counts` map key for a
// cell. Dose ids are unique per group, so the pair is unique config-wide.
export const countKey = (doseId: string, counterId: string): string =>
  `${doseId}::${counterId}`;

// Stable identity of a coverage cell: (demographic group label,
// vaccine_course_dose_id, counter label). Unlike the config-instance UUIDs
// (DoseEntry.id / Counter.id), these survive a config edit or re-upload — the
// human-meaningful content is preserved even when every id is regenerated — so
// they're what historical coverage is matched on. See issue #77 + data_model.md.
//
// NB: keep this byte-for-byte in lock-step with the report's port
// (open-msupply-reports .../convert_data_js/src/coverage.ts). A divergence
// silently re-breaks historical matching in the report only.
export const stableCellId = (
  groupLabel: string,
  vaccineCourseDoseId: string,
  counterLabel: string
): string => `${groupLabel}::${vaccineCourseDoseId}::${counterLabel}`;

// Build the flat in-memory `counts` map (keyed by the CURRENT config's
// countKey(dose.id, counter.id)) from stored coverage entries. Each entry is
// resolved to a current-config cell by its stable identity, falling back to the
// raw stored ids for legacy rows that predate the denormalised labels.
//
// Resolution priority per entry (each entry lands in exactly one bucket, so
// summing across entries never double-counts — and across many tallies it
// aggregates, which is what the report relies on):
//   1. stable — match (group_label, vaccine_course_dose_id, counter_label) to a
//      current-config cell. Survives id regeneration / re-upload.
//   2. legacy — fall back to countKey(entry.dose_id, entry.counter_id); resolves
//      correctly only while the config is unchanged since submission.
export const resolveCoverageCounts = (
  config: DailyTallyConfig | undefined,
  entries: CoverageEntry[]
): Record<string, number> => {
  // stable identity -> current config cell's countKey(dose.id, counter.id)
  const cellByStableId = new Map<string, string>();
  for (const group of config?.demographic_groups ?? []) {
    for (const dose of group.doses) {
      for (const counter of group.counters) {
        cellByStableId.set(
          stableCellId(group.label, dose.vaccine_course_dose_id, counter.label),
          countKey(dose.id, counter.id)
        );
      }
    }
  }

  const counts: Record<string, number> = {};
  for (const entry of entries) {
    let key: string | undefined;
    if (
      entry.demographic_group_label != null &&
      entry.counter_label != null
    ) {
      key = cellByStableId.get(
        stableCellId(
          entry.demographic_group_label,
          entry.vaccine_course_dose_id,
          entry.counter_label
        )
      );
    }
    // Legacy rows (no labels) or a stable identity no longer in the config.
    if (key == null) key = countKey(entry.dose_id, entry.counter_id);
    counts[key] = (counts[key] ?? 0) + entry.count;
  }
  return counts;
};

// The config the read-only review of a SUBMITTED tally should render against:
// the slice frozen at submission (`config_snapshot`) overlaid on the live
// config, so a finalised tally always shows the structure/labels it was entered
// with — immune to later config edits/re-uploads/deletion (issue #77). The live
// config still supplies the non-coverage fields (non_vaccine_items,
// wastage_reasons) where present. Falls back to the live config when there's no
// snapshot (legacy rows submitted before config_snapshot existed).
export const reviewCoverageConfig = (
  liveConfig: DailyTallyConfig | undefined,
  snapshot: TallyConfigSnapshot | undefined
): DailyTallyConfig | undefined => {
  if (!snapshot) return liveConfig;
  return {
    non_vaccine_items: [],
    wastage_reasons: { open_vial: '', negative_adjustment: '' },
    ...(liveConfig ?? {}),
    demographic_groups: snapshot.demographic_groups,
    summary_tables: snapshot.summary_tables,
  };
};

// The value written to the plugin_data `datetime` column: the tally's session
// date with its time normalised to the start of the day (00:00 local). Tracks
// the user's date selection; the day is what the list filters / sorts on.
export const tallyDatetime = (date: Date): string => {
  const start = DateUtils.startOfDay(date);
  return DateUtils.formatRFC3339(start) ?? start.toISOString();
};

// The naive calendar date (`YYYY-MM-DD`, no time/zone) stored in the payload
// and used for display / identifier. Built from the date's *local* components
// so it matches what the user picked, regardless of timezone. `getNaiveDate`
// is the inverse used when reading it back.
export const toTallyDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export interface TallyDraft {
  date: Date | null;
  sessionType: SessionType | null;
  // ISO timestamp set once when the draft is created; preserved on save and
  // through submission.
  created_datetime: string;
  // countKey(doseId, counterId) -> count
  counts: Record<string, number>;
  // stockLineId -> issued / wasted
  batches: Record<string, BatchEntry>;
}

export const emptyDraft = (): TallyDraft => ({
  date: DateUtils.startOfDay(new Date()),
  sessionType: null,
  created_datetime: new Date().toISOString(),
  counts: {},
  batches: {},
});

// The JSON written to the plugin_data `data` column for a draft, and the value
// localStorage mirrors. The session date is held as the naive `tally_date`
// (`YYYY-MM-DD`) here for display; the sortable/filterable `plugin_data.datetime`
// column carries the same date for the list. `status: DRAFT` marks the row as
// in-progress (a submitted tally carries the full TallyPayload with
// `status: SUBMITTED` under the same identifier). Lexically-sortable
// `_saved_at` lets the hydration logic pick the newer of the two stores
// without parsing dates. Header is nested under `header: { type }` to mirror
// the submitted-tally payload shape (types.ts → TallyPayload), so the list view
// reads `data.header?.type` without per-shape branching.
export interface PersistedDraft {
  status: typeof TallyStatus.Draft;
  created_datetime: string;
  tally_date: string;
  header: {
    type: SessionType | null;
  };
  counts: Record<string, number>;
  batches: Record<string, BatchEntry>;
  _saved_at: string;
}

export const serializeDraft = (draft: TallyDraft): PersistedDraft => ({
  status: TallyStatus.Draft,
  created_datetime: draft.created_datetime,
  tally_date: draft.date ? toTallyDate(draft.date) : '',
  header: {
    type: draft.sessionType,
  },
  counts: draft.counts,
  batches: draft.batches,
  _saved_at: new Date().toISOString(),
});

export const deserializeDraft = (p: PersistedDraft): TallyDraft => ({
  date: p.tally_date ? DateUtils.getNaiveDate(p.tally_date) : null,
  sessionType: p.header?.type ?? null,
  created_datetime: p.created_datetime ?? new Date().toISOString(),
  counts: p.counts ?? {},
  // Both localStorage and server DRAFT rows flow through here, so this is
  // the single migration point for pre-split batch entries.
  batches: normaliseBatches(p.batches ?? {}),
});

// Raw `window.localStorage` access — same precedent as the MRT table-state
// hooks at `client/packages/common/src/ui/layout/tables/tableState/utils.ts`,
// where dynamic per-instance keys bypass the static `LocalStorageRecord`
// enum. SSR-safe via the typeof check (the plugin loads in browsers only,
// but cheaper to guard than to debug an SSR crash later).
const KEY_PREFIX = '@openmsupply-client/daily-tally-draft/';

const localStorageKey = (draftId: string) => `${KEY_PREFIX}${draftId}`;

export const readLocalDraft = (draftId: string): PersistedDraft | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(localStorageKey(draftId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedDraft;
  } catch {
    return null;
  }
};

export const writeLocalDraft = (
  draftId: string,
  persisted: PersistedDraft
): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localStorageKey(draftId), JSON.stringify(persisted));
};

export const clearLocalDraft = (draftId: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(localStorageKey(draftId));
};

// Rehydrates the wizard state from a persisted DAILY_TALLY payload so submitted
// tallies open into a fully populated, read-only form. The session date comes
// from the payload's naive `tally_date`; the `datetime` column value is a
// fallback for any older row that predates `tally_date`.
export const tallyPayloadToDraft = (
  payload: TallyPayload,
  datetime: string | null,
  // The current config, used to resolve stored coverage by stable identity so
  // the summary survives config edits/re-uploads (issue #77). Optional: when
  // absent (config still loading) every entry falls back to its legacy id key.
  config?: DailyTallyConfig
): TallyDraft => {
  const counts = resolveCoverageCounts(config, payload.coverage ?? []);
  const batches: Record<string, BatchEntry> = {};
  const emptyEntry = (): BatchEntry => ({
    issued: 0,
    openVialWastageDoses: 0,
    wasted: 0,
    hasOpenVialWastage: false,
  });
  for (const entry of payload.issuance ?? []) {
    const prev = batches[entry.stock_line_id] ?? emptyEntry();
    batches[entry.stock_line_id] = {
      ...prev,
      // Multiple cohorts may have drawn from the same stock line during
      // submission — sum their doses back into a single per-batch entry so
      // Step 2 renders the original total.
      issued: prev.issued + entry.doses_issued,
    };
  }
  for (const entry of payload.wastage ?? []) {
    const prev = batches[entry.stock_line_id] ?? emptyEntry();
    const next = { ...prev };
    switch (entry.type) {
      case WastageType.General:
        next.wasted += entry.doses_wasted;
        break;
      case WastageType.OpenVial:
        next.openVialWastageDoses += entry.doses_wasted;
        next.hasOpenVialWastage = true;
        break;
      default:
        // Legacy entry (pre-split, no `type`): the item could be a vaccine
        // (open-vial) or not (general) and this function has no item data to
        // tell. Write the figure to BOTH buckets — every consumer reads the
        // field matching the item's type, so the inapplicable copy is never
        // used.
        next.openVialWastageDoses += entry.doses_wasted;
        next.hasOpenVialWastage = true;
        next.wasted += entry.doses_wasted;
        break;
    }
    batches[entry.stock_line_id] = next;
  }
  return {
    date: payload.tally_date
      ? DateUtils.getNaiveDate(payload.tally_date)
      : datetime
        ? new Date(datetime)
        : null,
    sessionType: payload.header?.type ?? null,
    created_datetime: payload.created_datetime ?? new Date().toISOString(),
    counts,
    batches,
  };
};
