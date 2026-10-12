import type { LocaleKey } from '@/intl';
import type {
  DoseEditorVaccinationFragment,
  InsertVaccinationVariables,
  UpdateVaccinationVariables,
} from './doseEditor.generated';

/*
 * The dose editor's draft and the rules it applies before a save
 * (spec/vaccination-card rules § recording a dose, § the stock-transaction
 * switch, § before saving, § editing a recorded dose). Pure, so the
 * behaviours it carries are tested in node; the dialog only binds it.
 */

export type DoseVaccination = DoseEditorVaccinationFragment;

/** The facility choice for "another facility, named in free text". */
export const OTHER_FACILITY = 'other';

export interface DoseDraft {
  /** Undefined until the user chooses (a new dose starts with neither). */
  given: boolean | undefined;
  /** ISO calendar date. */
  date: string;
  /**
   * This store's name id, the name id a record was entered at, or
   * OTHER_FACILITY.
   */
  facility: string;
  facilityFreeText: string;
  clinicianId: string | null;
  itemId: string | null;
  stockLineId: string | null;
  notGivenReason: string | null;
  comment: string;
  /** The stock-transaction switch: on for a new dose, off for an edit. */
  createTransactions: boolean;
}

export interface DraftContext {
  /** The dose's recorded vaccination, or null for a new dose. */
  vaccination: DoseVaccination | null;
  /** The logged-in store's id and its name id (this store as a facility). */
  storeId: string;
  storeNameId: string;
  /** The encounter's clinician — a new dose's default. */
  encounterClinicianId: string | null;
  /** The course's vaccine item ids, in the course's order. */
  courseItemIds: string[];
  today: string;
}

/**
 * The draft a dose opens with. A recorded dose opens exactly as recorded —
 * its batch included — so an unchanged dose differs from nothing and offers
 * no Save (OMS-REG-DIS-06.55). A new dose: this store, the encounter's
 * clinician, today, the course's only item when it has one.
 */
export const initialDraft = (ctx: DraftContext): DoseDraft => {
  const v = ctx.vaccination;
  if (v) {
    return {
      given: v.given,
      date: v.vaccinationDate,
      facility: v.facilityNameId ?? OTHER_FACILITY,
      facilityFreeText: v.facilityFreeText ?? '',
      clinicianId: v.clinicianId,
      itemId: v.item?.id ?? null,
      stockLineId: v.stockLine?.id ?? null,
      notGivenReason: v.notGivenReason,
      comment: v.comment ?? '',
      createTransactions: false,
    };
  }
  return {
    given: undefined,
    date: ctx.today,
    facility: ctx.storeNameId,
    facilityFreeText: '',
    clinicianId: ctx.encounterClinicianId,
    itemId: ctx.courseItemIds.length === 1 ? ctx.courseItemIds[0] : null,
    stockLineId: null,
    notGivenReason: null,
    comment: '',
    createTransactions: true,
  };
};

const FIELDS: (keyof DoseDraft)[] = [
  'given',
  'date',
  'facility',
  'facilityFreeText',
  'clinicianId',
  'itemId',
  'stockLineId',
  'notGivenReason',
  'comment',
  'createTransactions',
];

/** Whether the draft differs from what the dose opened with. */
export const draftDiffers = (draft: DoseDraft, initial: DoseDraft): boolean =>
  FIELDS.some(f => draft[f] !== initial[f]);

/** Another facility — free text, or a facility a record was entered at. */
export const isOtherFacility = (draft: DoseDraft, ctx: DraftContext): boolean =>
  draft.facility !== ctx.storeNameId;

/**
 * A dose given at another store: only its comment is open (OMS-REG-DIS-06.52).
 */
export const givenAtOtherStore = (ctx: DraftContext): boolean =>
  !!ctx.vaccination?.given && ctx.vaccination.givenStoreId !== ctx.storeId;

const isPastDated = (draft: DoseDraft, ctx: DraftContext): boolean =>
  draft.date !== ctx.today;

/**
 * Whether the batch picker shows: given at this store with an item chosen,
 * and — for a date before today — while the switch is on or the record
 * already has a batch (rules § the stock-transaction switch).
 */
export const showsBatch = (draft: DoseDraft, ctx: DraftContext): boolean =>
  draft.given === true &&
  draft.itemId !== null &&
  !givenAtOtherStore(ctx) &&
  !isOtherFacility(draft, ctx) &&
  (!isPastDated(draft, ctx) ||
    draft.createTransactions ||
    !!ctx.vaccination?.stockLine);

/**
 * The stock-transaction switch's label for this draft, or null when the
 * switch does not apply — first match wins (rules § the stock-transaction
 * switch; OMS-REG-DIS-06.15, .18, .20).
 */
export const switchLabel = (
  draft: DoseDraft,
  ctx: DraftContext
): LocaleKey | null => {
  if (givenAtOtherStore(ctx)) return null;
  const v = ctx.vaccination;
  const free = draft.facility === OTHER_FACILITY;
  if (
    isPastDated(draft, ctx) &&
    !v?.stockLine &&
    draft.given === true &&
    !free &&
    draft.itemId !== null
  )
    return 'label.record-stock-transaction';
  if (v?.invoice && (free || draft.given === false || !draft.stockLineId))
    return 'label.revert-existing-transaction';
  if (
    v &&
    draft.itemId !== null &&
    !free &&
    draft.given === true &&
    draft.stockLineId !== (v.stockLine?.id ?? null)
  )
    return 'label.update-transactions';
  return null;
};

/** The fields a save checks, each missing one marked in place. */
export type DraftCheck = 'given' | 'notGivenReason' | 'facilityFreeText';

/**
 * What a save finds missing: given or not given unchosen, no reason for not
 * given, no name for another facility (rules § recording a dose). A missing
 * batch never blocks.
 */
export const missingFields = (draft: DoseDraft): DraftCheck[] => {
  const missing: DraftCheck[] = [];
  if (draft.given === undefined) missing.push('given');
  if (draft.given === false && !draft.notGivenReason)
    missing.push('notGivenReason');
  if (draft.facility === OTHER_FACILITY && draft.facilityFreeText.trim() === '')
    missing.push('facilityFreeText');
  return missing;
};

export type Confirmation = 'skip' | 'early' | 'noBatch';

/**
 * The questions a save asks, in order, each only when it applies (rules §
 * before saving): a skip over an unrecorded dose with no status; a given dose
 * dated before its suggested date; a dose given here on a course with items,
 * with no batch, dated today or with the switch on.
 */
export const confirmations = (
  draft: DoseDraft,
  ctx: DraftContext,
  dose: { confirmsSkip: boolean; suggestedDate: string | null }
): Confirmation[] => {
  const asks: Confirmation[] = [];
  if (dose.confirmsSkip) asks.push('skip');
  if (
    draft.given === true &&
    dose.suggestedDate !== null &&
    dose.suggestedDate > draft.date
  )
    asks.push('early');
  if (
    ctx.courseItemIds.length > 0 &&
    draft.given === true &&
    !isOtherFacility(draft, ctx) &&
    draft.stockLineId === null &&
    (!isPastDated(draft, ctx) || draft.createTransactions)
  )
    asks.push('noBatch');
  return asks;
};

/**
 * The insert for a new dose (contract § recording a dose). The item and batch
 * go only with a given dose, the batch only at this store with the switch on;
 * the reason only with a dose not given.
 */
export const insertInput = (
  draft: DoseDraft,
  ids: { id: string; encounterId: string; vaccineCourseDoseId: string }
): InsertVaccinationVariables['input'] => {
  const free = draft.facility === OTHER_FACILITY;
  const given = draft.given === true;
  return {
    ...ids,
    given,
    vaccinationDate: draft.date,
    facilityNameId: free ? null : draft.facility,
    facilityFreeText: free ? draft.facilityFreeText.trim() : null,
    clinicianId: free ? null : draft.clinicianId,
    comment: draft.comment,
    notGivenReason: given ? null : draft.notGivenReason,
    itemId: given ? draft.itemId : null,
    stockLineId:
      given && !free && draft.createTransactions ? draft.stockLineId : null,
  };
};

/**
 * The update for a recorded dose (contract § editing a recorded dose). A dose
 * given at another store sends its comment alone; any other sends every field,
 * clearing what no longer applies, with the switch as `updateTransactions`.
 */
export const updateInput = (
  draft: DoseDraft,
  ctx: DraftContext
): UpdateVaccinationVariables['input'] => {
  const id = ctx.vaccination?.id ?? '';
  if (givenAtOtherStore(ctx)) return { id, comment: draft.comment };
  const free = draft.facility === OTHER_FACILITY;
  const given = draft.given === true;
  return {
    id,
    given,
    vaccinationDate: draft.date,
    comment: draft.comment,
    notGivenReason: given ? null : draft.notGivenReason,
    clinicianId: { value: free ? null : draft.clinicianId },
    itemId: { value: given ? draft.itemId : null },
    stockLineId: { value: given && !free ? draft.stockLineId : null },
    facilityNameId: { value: free ? null : draft.facility },
    facilityFreeText: { value: free ? draft.facilityFreeText.trim() : null },
    updateTransactions: draft.createTransactions,
  };
};

/** A batch's whole doses: doses per unit × available packs × pack size. */
export const batchDoses = (
  dosesPerUnit: number,
  batch: { availableNumberOfPacks: number; packSize: number }
): number => dosesPerUnit * batch.availableNumberOfPacks * batch.packSize;

/** A batch holding less than one dose cannot be chosen. */
export const batchChoosable = (
  dosesPerUnit: number,
  batch: { availableNumberOfPacks: number; packSize: number }
): boolean => batchDoses(dosesPerUnit, batch) >= 1;

/**
 * The batch a newly given dose gets for free: the only batch holding a dose,
 * when exactly one does (OMS-REG-DIS-06.46).
 */
export const presetBatch = (
  dosesPerUnit: number,
  batches: { id: string; availableNumberOfPacks: number; packSize: number }[]
): string | null => {
  const choosable = batches.filter(b => batchChoosable(dosesPerUnit, b));
  return choosable.length === 1 ? choosable[0].id : null;
};
