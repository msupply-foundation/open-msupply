import { useCallback, useMemo, useState } from 'react';
import {
  AdjustmentTypeInput,
  FnUtils,
  useAuthContext,
  useFormatDateTime,
  useGql,
  UserPermission,
} from '@openmsupply-client/common';
import { useDailyTallyPluginData } from '../api/usePluginData';
import {
  buildVerifyPrescriptionsInput,
  batchPrescription,
  createInventoryAdjustment,
  findPatientByCode,
  insertPatient,
  insertPrescription,
} from '../api/submission';
import { DataIdentifier } from '../constants';
import {
  CoverageEntry,
  DailyTallyConfig,
  IssuanceEntry,
  sessionTypeLabel,
  tallyPrescriptionReference,
  TallyPayload,
  TallyStatus,
  WastageEntry,
  WastageType,
} from '../types';
import {
  clearLocalDraft,
  countKey,
  tallyDatetime,
  TallyDraft,
  toTallyDate,
} from './draft';
import {
  ItemWithBatches,
  useVaccineBatchData,
  resolveVaccineBatchData,
  UseVaccineBatchDataResult,
} from './BatchAndWastage/useVaccineBatchData';
import { buildDisplaySnapshot } from './BatchAndWastage/displaySnapshot';
import {
  batchStockOnHand,
  itemStockOnHandTotal,
} from './BatchAndWastage/coverageMath';
import {
  buildSubmissionPlan,
  CohortPlan,
  PrescriptionLinePlan,
  SubmissionPlan,
  WastageLinePlan,
} from './buildSubmissionPlan';
import { GenderTypeNode } from '@openmsupply-client/common';
import { usePluginTranslation } from '../../locales';

// Aggregated, user-facing error shown in the submit button area.
export type SubmissionError =
  | { kind: 'config'; description: string }
  | { kind: 'permission'; description: string }
  | { kind: 'no-data'; description: string }
  | { kind: 'stock'; description: string }
  | { kind: 'patient'; description: string }
  | { kind: 'prescription'; description: string }
  | { kind: 'adjustment'; description: string }
  | { kind: 'verify-partial'; description: string; invoiceIds: string[] }
  | { kind: 'unknown'; description: string };

export interface UseTallySubmissionArgs {
  draft: TallyDraft;
  config: DailyTallyConfig | undefined;
  draftId: string;
  // When false, the (pure but non-trivial) `plan` and `preflightError`
  // computations short-circuit to null. The submit surfaces (button + confirm
  // modal) only render on the Summary step, so the plan isn't needed before
  // then — gating it off the earlier steps stops buildSubmissionPlan from
  // walking every group/dose/count on each Step-1 +/- click.
  enabled: boolean;
  // Called after submission completes successfully (e.g. navigates back to
  // the list view, clears local state).
  onSuccess: () => void;
}

export interface UseTallySubmissionResult {
  plan: SubmissionPlan | null;
  // Pre-flight gate result, computed synchronously. If non-null the submit
  // flow is blocked.
  preflightError: SubmissionError | null;
  // True once submit() has been called and is mid-flight. Disables the
  // button to prevent double-clicks.
  isSubmitting: boolean;
  // Error from the most recent submit attempt (null until first attempt or
  // on retry).
  error: SubmissionError | null;
  submit: () => Promise<void>;
}

const collectConfiguredDoseIds = (config: DailyTallyConfig): string[] => {
  const ids = new Set<string>();
  for (const group of config.demographic_groups) {
    for (const dose of group.doses) {
      ids.add(dose.vaccine_course_dose_id);
    }
  }
  return [...ids];
};

export interface StockShortfall {
  itemLabel: string;
  issuedDoses: number;
  wastedDoses: number;
  availableDoses: number;
}

// Per-stock-line shortfall of (issued + wasted) against available stock. Shared
// by the synchronous pre-flight (cached stock → immediate banner) and the fresh
// pre-mutation guard in submit() (freshly-fetched stock → authoritative gate).
// Works in doses — a stock line has a single pack size, so doses aggregate
// cleanly across its lines. Covers issuance AND wastage lines. Exported for
// unit testing.
export const computeStockShortfalls = (
  plan: SubmissionPlan,
  vaccineData: UseVaccineBatchDataResult
): StockShortfall[] => {
  const issuedByLine: Record<string, number> = {};
  for (const cohort of plan.cohorts) {
    for (const line of cohort.lines) {
      issuedByLine[line.stockLineId] =
        (issuedByLine[line.stockLineId] ?? 0) + line.numberOfDoses;
    }
  }
  const wastedByLine: Record<string, number> = {};
  for (const w of plan.wastageLines) {
    wastedByLine[w.stockLineId] =
      (wastedByLine[w.stockLineId] ?? 0) + w.wastedDoses;
  }

  const stockLineIds = new Set([
    ...Object.keys(issuedByLine),
    ...Object.keys(wastedByLine),
  ]);

  // Group the touched stock lines by their item. Operators enter and reason in
  // item totals — the Step-2 "Remaining" header is item-level — so a shortfall
  // is reported against the item's TOTAL available stock across all its batches,
  // not a single batch's (issue #83: 5 issued on a 2-stock batch of a 4-on-hand
  // item should read "4 available", not "2"). A stock line whose item can't be
  // resolved (batch dispensed to zero since drafting) has no item to aggregate
  // into and is reported on its own as 0 available.
  interface ItemAgg {
    item: ItemWithBatches;
    issued: number;
    wasted: number;
    lines: Array<{ stockLineId: string; issued: number; wasted: number }>;
  }
  const byItem = new Map<string, ItemAgg>();
  const shortfalls: StockShortfall[] = [];
  for (const stockLineId of stockLineIds) {
    const issued = issuedByLine[stockLineId] ?? 0;
    const wasted = wastedByLine[stockLineId] ?? 0;
    if (issued + wasted <= 0) continue;
    const item = vaccineData.itemByStockLineId[stockLineId];
    if (!item) {
      shortfalls.push({
        itemLabel: stockLineId,
        issuedDoses: issued,
        wastedDoses: wasted,
        availableDoses: 0,
      });
      continue;
    }
    let agg = byItem.get(item.id);
    if (!agg) {
      agg = { item, issued: 0, wasted: 0, lines: [] };
      byItem.set(item.id, agg);
    }
    agg.issued += issued;
    agg.wasted += wasted;
    agg.lines.push({ stockLineId, issued, wasted });
  }

  for (const { item, issued, wasted, lines } of byItem.values()) {
    // Convert available packs → doses (packs × pack_size × doses_per_unit, via
    // the shared helpers) so the guard matches the displayed opening stock and
    // respects pack sizes > 1. Epsilon guards float noise in that product.
    const itemAvailable = itemStockOnHandTotal(item);
    if (issued + wasted > itemAvailable + 1e-6) {
      // Item-level over-issue — the figure the operator sees and reasons about.
      shortfalls.push({
        itemLabel: item.name,
        issuedDoses: issued,
        wastedDoses: wasted,
        availableDoses: Math.round(itemAvailable),
      });
      continue;
    }
    // Item total is within stock, but a single batch can still be over-issued —
    // each prescription line draws from one stock line and the server validates
    // per line (and wastage adjustments post irreversibly before prescriptions
    // verify), so we still front-stop it, pointing at the offending batch.
    for (const line of lines) {
      const batchAvailable = batchStockOnHand(item, line.stockLineId);
      if (line.issued + line.wasted > batchAvailable + 1e-6) {
        const batch = item.batches.find(b => b.id === line.stockLineId);
        const batchLabel = batch?.batch ? ` (${batch.batch})` : '';
        shortfalls.push({
          itemLabel: `${item.name}${batchLabel}`,
          issuedDoses: line.issued,
          wastedDoses: line.wasted,
          availableDoses: Math.round(batchAvailable),
        });
      }
    }
  }
  return shortfalls;
};

const stockShortfallError = (
  shortfalls: StockShortfall[],
  t: ReturnType<typeof usePluginTranslation>
): SubmissionError => ({
  kind: 'stock',
  description: `${t('submit.preflight.stock-exceeded')}\n${shortfalls
    .map(s =>
      t('submit.preflight.stock-exceeded-line', {
        item: s.itemLabel,
        issued: s.issuedDoses,
        wasted: s.wastedDoses,
        available: s.availableDoses,
      })
    )
    .join('\n')}`,
});

// Convert the in-memory TallyDraft + the computed SubmissionPlan into the
// canonical TallyPayload.
const buildTallyPayload = (args: {
  draft: TallyDraft;
  config: DailyTallyConfig;
  plan: SubmissionPlan;
  // The freshly-resolved vaccine data, frozen into the payload's
  // `display_snapshot` so the submitted tally renders from itself.
  displayData: UseVaccineBatchDataResult;
  prescriptionInvoiceIds: string[];
  inventoryAdjustmentIds: string[];
  inventoryAdjustmentNumbers: number[];
  userId: string;
}): TallyPayload => {
  const {
    draft,
    config,
    plan,
    displayData,
    prescriptionInvoiceIds,
    inventoryAdjustmentIds,
    inventoryAdjustmentNumbers,
    userId,
  } = args;

  // Flat coverage entries: walk the config, emit a CoverageEntry per non-zero
  // (group, dose, counter) cell. Skipping zeros keeps the payload tight.
  const coverage: CoverageEntry[] = [];
  for (const group of config.demographic_groups) {
    for (const dose of group.doses) {
      for (const counter of group.counters) {
        const count = draft.counts[countKey(dose.id, counter.id)];
        if (!count || count <= 0) continue;
        coverage.push({
          demographic_group_id: group.id,
          dose_id: dose.id,
          vaccine_course_dose_id: dose.vaccine_course_dose_id,
          counter_id: counter.id,
          count,
          // Stable identity so this entry stays readable after the config's
          // ids are regenerated by a later edit/re-upload (issue #77).
          demographic_group_label: group.label,
          counter_label: counter.label,
        });
      }
    }
  }

  // Issuance: one entry per prescription line across all cohorts.
  const issuance: IssuanceEntry[] = [];
  for (const cohort of plan.cohorts) {
    for (const line of cohort.lines) {
      issuance.push({
        item_id: line.itemId,
        stock_line_id: line.stockLineId,
        packs_issued: line.numberOfPacks,
        doses_issued: line.numberOfDoses,
        vaccine_course_dose_id: line.vaccineCourseDoseId,
      });
    }
  }

  // Wastage: one entry per wastage line.
  const wastage: WastageEntry[] = plan.wastageLines.map(w => ({
    stock_line_id: w.stockLineId,
    type: w.type,
    doses_wasted: w.wastedDoses,
    reason_option_id: w.reasonOptionId,
  }));

  return {
    status: TallyStatus.Submitted,
    created_datetime: draft.created_datetime,
    tally_date: draft.date ? toTallyDate(draft.date) : '',
    header: {
      type: draft.sessionType!, // pre-flight ensures non-null
    },
    coverage,
    issuance,
    wastage,
    prescription_invoice_ids: prescriptionInvoiceIds,
    inventory_adjustment_ids: inventoryAdjustmentIds,
    inventory_adjustment_numbers: inventoryAdjustmentNumbers,
    submitted_datetime: new Date().toISOString(),
    submitted_by_user_id: userId,
    display_snapshot: buildDisplaySnapshot(displayData),
    // Freeze the coverage-relevant config so the read-only review renders the
    // structure/labels this tally was entered with, regardless of later config
    // edits (issue #77). Pairs with display_snapshot (DB data) above.
    config_snapshot: {
      demographic_groups: config.demographic_groups,
      summary_tables: config.summary_tables ?? [],
    },
  };
};

const ensureFromError = (
  e: unknown,
  kind: SubmissionError['kind']
): SubmissionError => {
  const description = e instanceof Error ? e.message : String(e);
  if (kind === 'verify-partial') {
    return { kind: 'unknown', description };
  }
  return { kind, description };
};

// Owns the submit() side of the wizard.
//
// Pre-flight is computed synchronously and exposed as `preflightError`. The
// DetailView wires it to the Submit button so the user sees a blocking
// banner before they click. The async sequence (phases D–H) runs only after
// the user confirms in the modal.
export const useTallySubmission = ({
  draft,
  config,
  draftId,
  enabled,
  onSuccess,
}: UseTallySubmissionArgs): UseTallySubmissionResult => {
  const t = usePluginTranslation();
  const { client } = useGql();
  const { storeId, store, user, userHasPermission } = useAuthContext();
  const { customDate } = useFormatDateTime();

  // Vaccine batch data — same shape the Step 2 surface uses. React-query
  // will dedupe the underlying request since the queryKey matches.
  const configuredDoseIds = useMemo(
    () => (config ? collectConfiguredDoseIds(config) : []),
    [config]
  );
  const nonVaccineItemIds = useMemo(
    () => config?.non_vaccine_items.map(n => n.item_id) ?? [],
    [config]
  );
  const vaccineData = useVaccineBatchData(configuredDoseIds, nonVaccineItemIds);

  // Submission flips the tally's existing row from DRAFT to SUBMITTED in place
  // (same id, immutable from creation) rather than creating a new row.
  const submittedTallyApi = useDailyTallyPluginData<TallyPayload>(
    DataIdentifier.Tally
  );

  const plan = useMemo<SubmissionPlan | null>(() => {
    if (!enabled) return null;
    if (!config) return null;
    if (vaccineData.isLoading || vaccineData.isError) return null;
    return buildSubmissionPlan({
      draft,
      config,
      vaccineData,
      storeCode: store?.code ?? storeId,
    });
  }, [enabled, config, draft, vaccineData, store?.code, storeId]);

  // Pre-flight gate. Wastage reasons + permissions + non-empty header.
  const preflightError = useMemo<SubmissionError | null>(() => {
    if (!enabled) return null;
    if (!config) return null;
    // A wastage reason id is only required for the wastage types this tally
    // actually records — each type's lines post with their own reason.
    const wastageTypes = new Set(
      (plan?.wastageLines ?? []).map(w => w.type)
    );
    const reasonByType: Array<{
      type: WastageType;
      configKey: keyof DailyTallyConfig['wastage_reasons'];
    }> = [
      { type: WastageType.OpenVial, configKey: 'open_vial' },
      { type: WastageType.General, configKey: 'negative_adjustment' },
    ];
    const missingReasons = reasonByType
      .filter(
        ({ type, configKey }) =>
          wastageTypes.has(type) && !config.wastage_reasons[configKey]
      )
      .map(({ configKey }) => `\`${configKey}\``);
    if (missingReasons.length > 0) {
      return {
        kind: 'config',
        description: t('submit.preflight.wastage-config', {
          reasons: missingReasons.join(' and '),
        }),
      };
    }
    if (!userHasPermission(UserPermission.PrescriptionMutate)) {
      return {
        kind: 'permission',
        description: t('submit.preflight.no-prescription-permission'),
      };
    }
    if (
      wastageTypes.size > 0 &&
      !userHasPermission(UserPermission.InventoryAdjustmentMutate)
    ) {
      return {
        kind: 'permission',
        description: t('submit.preflight.no-stocktake-permission'),
      };
    }
    if (!userHasPermission(UserPermission.PatientMutate)) {
      return {
        kind: 'permission',
        description: t('submit.preflight.no-patient-permission'),
      };
    }
    if (!draft.sessionType) {
      return {
        kind: 'no-data',
        description: t('submit.preflight.session-type-required'),
      };
    }
    if (!draft.date) {
      return {
        kind: 'no-data',
        description: t('submit.preflight.session-date-required'),
      };
    }
    if (plan && plan.cohorts.length === 0 && plan.wastageLines.length === 0) {
      return {
        kind: 'no-data',
        description: t('submit.preflight.no-counts'),
      };
    }
    // Stock sufficiency (immediate banner): every wastage adjustment posts
    // irreversibly (a VERIFIED invoice) before prescriptions are verified, so a
    // line failing the server's available-stock validation mid-sequence would
    // leave earlier lines posted with no way to roll them back. Front-stop it
    // here across both issuance and wastage lines. This reads the cached stock;
    // submit() re-checks against freshly-fetched stock as the authoritative
    // gate (stock can change between drafting and submitting).
    if (plan) {
      const shortfalls = computeStockShortfalls(plan, vaccineData);
      if (shortfalls.length > 0) return stockShortfallError(shortfalls, t);
    }
    return null;
  }, [enabled, config, userHasPermission, draft, plan, vaccineData, t]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<SubmissionError | null>(null);

  const submit = useCallback(async (): Promise<void> => {
    if (!config || !plan || preflightError) return;
    if (!draft.date) return;
    setIsSubmitting(true);
    setError(null);

    const dateLabel = customDate(draft.date, 'dd MMM yyyy');
    const typeLabel = sessionTypeLabel(draft.sessionType);
    const tallyDatetimeValue = tallyDatetime(draft.date);

    // ----- Phase C: fresh stock check (before any mutation) ----------------
    // Re-resolve stock now: the cached vaccineData behind `plan` can be stale
    // if another user dispensed since this tally was drafted. Block any
    // shortfall here, before anything posts — the wastage adjustments (Phase F)
    // are irreversible and post before prescriptions verify (Phase G), so a
    // shortfall caught only by the server mid-sequence would leave a partial,
    // unrollbackable state. The fresh result also becomes the payload's display
    // snapshot, so the recorded opening stock is the stock at this moment.
    let freshVaccineData: UseVaccineBatchDataResult;
    try {
      freshVaccineData = await resolveVaccineBatchData(
        client,
        storeId,
        configuredDoseIds,
        nonVaccineItemIds
      );
    } catch (e) {
      setError(ensureFromError(e, 'stock'));
      setIsSubmitting(false);
      return;
    }
    const shortfalls = computeStockShortfalls(plan, freshVaccineData);
    if (shortfalls.length > 0) {
      setError(stockShortfallError(shortfalls, t));
      setIsSubmitting(false);
      return;
    }

    // ----- Phase D: resolve patients ---------------------------------------
    const cohortPatientIds: Record<string, string> = {};
    try {
      for (const cohort of plan.cohorts) {
        const existing = await findPatientByCode(
          client,
          storeId,
          cohort.patientCode
        );
        if (existing) {
          cohortPatientIds[cohort.key] = existing.id;
          continue;
        }
        const created = await insertPatient(client, storeId, {
          id: FnUtils.generateUUID(),
          code: cohort.patientCode,
          firstName: 'Daily Tally',
          lastName: `${cohort.demographicGroupLabel} ${cohort.counterLabel}`,
          gender:
            cohort.gender === GenderTypeNode.Unknown
              ? undefined
              : cohort.gender,
        });
        cohortPatientIds[cohort.key] = created.id;
      }
    } catch (e) {
      setError(ensureFromError(e, 'patient'));
      setIsSubmitting(false);
      return;
    }

    // ----- Phase E: create prescriptions in NEW + insert lines -------------
    // Track every invoice we create so rollback can delete them all.
    const createdInvoiceIds: string[] = [];
    const cohortsWithLines = plan.cohorts.filter(c => c.lines.length > 0);
    try {
      for (const cohort of cohortsWithLines) {
        const patientId = cohortPatientIds[cohort.key]!;
        const invoiceId = FnUtils.generateUUID();
        // Deliberately NOT backdated to the session date. Passing a past
        // `prescriptionDate` flips the server into historical-stock validation
        // (stock as it stood at that instant), which fails whenever stock was
        // received after the session date — e.g. a draft saved for an earlier
        // day, or stock introduced to cover the tally. The whole workflow
        // validates against *current* stock (Step 2, the Phase-C fresh check,
        // the server's `available_number_of_packs` guard), so the prescription
        // must post at `now` for that to hold. The session date is preserved
        // for display/identity/matching via `tally_date`, the `theirReference`
        // prefix, and the `plugin_data.datetime` column — not the invoice date.
        await insertPrescription(client, storeId, {
          id: invoiceId,
          patientId,
          theirReference: tallyPrescriptionReference(
            dateLabel,
            typeLabel,
            cohort.demographicGroupLabel,
            cohort.counterLabel
          ),
        });
        createdInvoiceIds.push(invoiceId);
        await batchPrescription(client, storeId, {
          insertPrescriptionLines: cohort.lines.map(line => ({
            id: FnUtils.generateUUID(),
            invoiceId,
            stockLineId: line.stockLineId,
            numberOfPacks: line.numberOfPacks,
          })),
        });
      }
    } catch (e) {
      // Rollback: delete every NEW prescription we created.
      try {
        if (createdInvoiceIds.length > 0) {
          await batchPrescription(client, storeId, {
            deletePrescriptions: createdInvoiceIds,
          });
        }
      } catch (rollbackErr) {
        // eslint-disable-next-line no-console
        console.error('useTallySubmission: rollback failed', rollbackErr);
      }
      setError(ensureFromError(e, 'prescription'));
      setIsSubmitting(false);
      return;
    }

    // ----- Phase F: inventory adjustments (only if wastage > 0) -----------
    // One negative adjustment per wastage line — the host mutation adjusts a
    // single stock line per call and the resulting INVENTORY_REDUCTION
    // invoice is VERIFIED immediately, so each successful call is
    // irreversible.
    const inventoryAdjustmentIds: string[] = [];
    const inventoryAdjustmentNumbers: number[] = [];
    for (const w of plan.wastageLines) {
      try {
        const created = await createInventoryAdjustment(client, storeId, {
          stockLineId: w.stockLineId,
          adjustment: w.wastedPacks,
          adjustmentType: AdjustmentTypeInput.Reduction,
          reasonOptionId: w.reasonOptionId,
        });
        inventoryAdjustmentIds.push(created.id);
        inventoryAdjustmentNumbers.push(created.invoiceNumber);
      } catch (e) {
        // Roll back the NEW prescriptions (still deletable — stock hasn't
        // posted). Adjustments that already posted can't be reversed; tell
        // the operator which ones so they can zero the matching wastage
        // entries before resubmitting, rather than double-posting them.
        try {
          if (createdInvoiceIds.length > 0) {
            await batchPrescription(client, storeId, {
              deletePrescriptions: createdInvoiceIds,
            });
          }
        } catch (rollbackErr) {
          // eslint-disable-next-line no-console
          console.error(
            'useTallySubmission: prescription rollback failed',
            rollbackErr
          );
        }
        const base = ensureFromError(e, 'adjustment');
        const posted =
          inventoryAdjustmentNumbers.length > 0
            ? `\n${t('submit.error.adjustments-posted', {
                count: inventoryAdjustmentNumbers.length,
                numbers: inventoryAdjustmentNumbers.join(', '),
              })}`
            : '';
        setError({ ...base, description: `${base.description}${posted}` });
        setIsSubmitting(false);
        return;
      }
    }

    // ----- Phase G: verify prescriptions (stock posts) ---------------------
    if (createdInvoiceIds.length > 0) {
      try {
        await batchPrescription(
          client,
          storeId,
          buildVerifyPrescriptionsInput(createdInvoiceIds)
        );
      } catch (e) {
        // Stuck state: wastage adjustments have posted; prescriptions still
        // NEW. Surface the invoice IDs so the operator can ask an admin to
        // verify manually. The adjustments can't be reversed anyway.
        const description = e instanceof Error ? e.message : String(e);
        setError({
          kind: 'verify-partial',
          description,
          invoiceIds: createdInvoiceIds,
        });
        setIsSubmitting(false);
        return;
      }
    }

    // ----- Phase H: persist DAILY_TALLY row + cleanup ---------------------
    try {
      const payload = buildTallyPayload({
        draft,
        config,
        plan,
        displayData: freshVaccineData,
        prescriptionInvoiceIds: createdInvoiceIds,
        inventoryAdjustmentIds,
        inventoryAdjustmentNumbers,
        userId: user?.id ?? '',
      });
      // Flip the existing draft row to SUBMITTED in place — the id is immutable
      // from creation. `related_record_id` can't change on update (and isn't
      // needed: the prescription ids live in the payload's
      // `prescription_invoice_ids`), so it's left as-is.
      await submittedTallyApi.update.update({
        id: draftId,
        data: payload,
        datetime: tallyDatetimeValue,
      });
    } catch (e) {
      // Stock has moved already; this only affects the audit trail. The draft
      // row stays as DRAFT — surface a non-fatal warning.
      // eslint-disable-next-line no-console
      console.error(
        'useTallySubmission: DAILY_TALLY persist failed (stock movements succeeded)',
        e
      );
    }
    clearLocalDraft(draftId);

    setIsSubmitting(false);
    onSuccess();
  }, [
    client,
    config,
    configuredDoseIds,
    customDate,
    draft,
    draftId,
    nonVaccineItemIds,
    onSuccess,
    plan,
    preflightError,
    storeId,
    submittedTallyApi,
    t,
    user?.id,
  ]);

  return {
    plan,
    preflightError,
    isSubmitting,
    error,
    submit,
  };
};

// Re-exports for the confirmation modal.
export type {
  CohortPlan,
  PrescriptionLinePlan,
  WastageLinePlan,
  SubmissionPlan,
};
