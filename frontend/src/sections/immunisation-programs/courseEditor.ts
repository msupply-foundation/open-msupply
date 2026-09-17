import type { GraphqlResult } from '@/api/graphql';
import { isForbidden, missingPermissions } from '@/api/graphql';
import type { LocaleKey } from '@/intl';
import type {
  InsertVaccineCourseResult,
  InsertVaccineCourseVariables,
  UpdateVaccineCourseResult,
  UpdateVaccineCourseVariables,
  VaccineCourseForEditResult,
} from './immunisationPrograms.generated';

// The course editor's logic (spec/immunisation-programs rules.md § the course,
// § vaccine items, § doses, § per-store rates, § the editor, § input bounds;
// ui-surface S3/S3a). Pure: the draft and its defaults, the completeness
// checks, draft → input, and the mapping from each write's rejection SHAPES
// onto what the dialog shows. No reactivity, so every rule is pinned by tests
// instead of by driving the dialog.

/** The course as the editor reads it — the generated node (kdd/type-safety). */
export type CourseNode =
  VaccineCourseForEditResult['vaccineCourses']['nodes'][number];
export type DoseNode = NonNullable<CourseNode['vaccineCourseDoses']>[number];
export type ItemNode = NonNullable<CourseNode['vaccineCourseItems']>[number];
export type StoreConfigNode = NonNullable<CourseNode['storeConfigs']>[number];

/**
 * The editor's draft IS the generated node, widened in exactly two ways: the
 * two rates may be `undefined` (a cleared field, which the save refuses as
 * required — rules § input bounds), and the three lists are never null (the
 * server answers `null` for none). Everything else keeps the node's own
 * shape, so what the editor holds converts to the write input without a
 * parallel model.
 */
export type CourseDraft = Omit<
  CourseNode,
  | '__typename'
  | 'coverageRate'
  | 'wastageRate'
  | 'vaccineCourseItems'
  | 'vaccineCourseDoses'
  | 'storeConfigs'
> & {
  coverageRate: number | undefined;
  wastageRate: number | undefined;
  vaccineCourseItems: ItemNode[];
  vaccineCourseDoses: DoseNode[];
  storeConfigs: StoreConfigNode[];
};

/**
 * A blank editor for a new course of `programId` (rules § the course;
 * OMS-REG-IMM-01.31): coverage 100, wastage 0, Include in GAPS calculations
 * on, Can skip dose off, no demographic, no item, no dose, no store override.
 * The id is client-supplied — a fresh uuid, minted by the caller.
 */
export const newCourseDraft = (id: string, programId: string): CourseDraft => ({
  id,
  programId,
  name: '',
  demographicId: null,
  demographic: null,
  coverageRate: 100,
  wastageRate: 0,
  useInGapsCalculations: true,
  canSkipDose: false,
  vaccineCourseItems: [],
  vaccineCourseDoses: [],
  storeConfigs: [],
});

/** An edit opens the chosen course whole (OMS-REG-IMM-01.16). */
export const draftFromCourse = (course: CourseNode): CourseDraft => ({
  id: course.id,
  programId: course.programId,
  name: course.name,
  demographicId: course.demographicId ?? null,
  demographic: course.demographic ?? null,
  coverageRate: course.coverageRate,
  wastageRate: course.wastageRate,
  useInGapsCalculations: course.useInGapsCalculations,
  canSkipDose: course.canSkipDose,
  vaccineCourseItems: [...(course.vaccineCourseItems ?? [])],
  vaccineCourseDoses: [...(course.vaccineCourseDoses ?? [])],
  storeConfigs: [...(course.storeConfigs ?? [])],
});

// ─── Doses ────────────────────────────────────────────────────────────────

/** Age in months → the years + months the two age fields show. */
export const splitMonths = (
  totalMonths: number
): { years: number; months: number } => {
  const years = Math.floor(totalMonths / 12);
  return { years, months: totalMonths - years * 12 };
};

/** The two age fields → the single months figure the wire carries. */
export const joinMonths = (years: number, months: number): number =>
  years * 12 + months;

/**
 * The two age fields AS TYPED — the pair is the source of truth while it is
 * being edited, and the stored figure is their sum (OMS-REG-IMM-01.64,
 * OMS-REG-IMM-01.56). Deriving each half from the stored total on every
 * keystroke fed a half-typed year back into the months field and those
 * months back into the year: typing 1.75 years over 0 months went 12 → 20.4
 * (months now 8.4) → 29.4, and settled at 15 years 8.4 months
 * (IMM-20260917-F2). With the pair as truth the same keystrokes store 12 →
 * 20.4 → 21, and settling re-derives 1 year 9 months.
 */
export interface AgeEntry {
  years: number;
  months: number;
}

/** The pair a stored figure opens as — whole years and the remaining months. */
export const ageEntryFromTotal = (totalMonths: number): AgeEntry =>
  splitMonths(totalMonths);

/** What the pair stores: the sum of its two halves as typed. */
export const ageEntryTotal = (entry: AgeEntry): number =>
  joinMonths(entry.years, entry.months);

/**
 * On leaving the pair, the typed halves re-derive into whole years and the
 * remaining months — 1.75 y 0 m reads back as 1 y 9 m, 2.5 y 7 m as 3 y 1 m;
 * a fraction of a month stays in the months half (0 y 6.5 m).
 */
export const settleAgeEntry = (entry: AgeEntry): AgeEntry =>
  splitMonths(ageEntryTotal(entry));

/**
 * A new dose is born from the last one (rules § doses; OMS-REG-IMM-01.50,
 * OMS-REG-IMM-01.51): its label is the course name followed by its number; its
 * from age is the
 * previous dose's to age (0 for the first); its to age is that plus the
 * previous dose's span (one month when there is no previous dose or its span
 * is zero); its minimum interval is the previous dose's (30 days for the
 * first); its custom age label is blank.
 */
export const nextDose = (draft: CourseDraft, id: string): DoseNode => {
  const previous = draft.vaccineCourseDoses.at(-1);
  const previousMax = previous?.maxAgeMonths ?? 0;
  const previousSpan = previous
    ? previous.maxAgeMonths - previous.minAgeMonths
    : 0;
  return {
    id,
    label: `${draft.name} ${draft.vaccineCourseDoses.length + 1}`,
    minAgeMonths: previousMax,
    maxAgeMonths: previousMax + (previousSpan || 1),
    minIntervalDays: previous?.minIntervalDays ?? 30,
    customAgeLabel: null,
  };
};

// ─── Store rate overrides ─────────────────────────────────────────────────

export type RateField = 'wastageRate' | 'coverageRate';

/**
 * Set one store's override rate in a list of override rows (rules § per-store
 * rates). A store with no row gets one the first time a rate is entered for
 * it (the caller mints its id); clearing a rate on a store with no row is a
 * no-op, since there is nothing to record. A row, once made, stays — clearing
 * both rates leaves a row with no override, which behaves exactly as no row.
 */
export const setStoreRate = (
  configs: readonly StoreConfigNode[],
  storeId: string,
  field: RateField,
  value: number | undefined,
  newId: () => string
): StoreConfigNode[] => {
  const existing = configs.find(config => config.storeId === storeId);
  if (!existing) {
    if (value === undefined) return [...configs];
    return [
      ...configs,
      {
        id: newId(),
        storeId,
        wastageRate: field === 'wastageRate' ? value : null,
        coverageRate: field === 'coverageRate' ? value : null,
      },
    ];
  }
  return configs.map(config =>
    config.storeId === storeId ? { ...config, [field]: value ?? null } : config
  );
};

/** The override a store carries, `undefined` where the row has none. */
export const storeRate = (
  configs: readonly StoreConfigNode[],
  storeId: string,
  field: RateField
): number | undefined => {
  const value = configs.find(config => config.storeId === storeId)?.[field];
  return value ?? undefined;
};

// ─── Completeness checks (rules § the editor) ─────────────────────────────

/** The wastage rate's upper bound — a percentage (rules § input bounds). */
export const MAX_WASTAGE_RATE = 100;

/**
 * One failing check, as the summary lists it (ui-surface S3 § validation
 * summary): a field with its message, or a dose with every message it earned,
 * grouped per dose. Keys, not text — the dialog translates.
 */
export type ValidationItem =
  | {
      kind: 'field';
      field: 'name' | 'coverageRate' | 'wastageRate' | 'vaccineItems' | 'doses';
      labelKey: LocaleKey;
      messageKey: LocaleKey;
    }
  | { kind: 'dose'; doseId: string; number: number; messageKeys: LocaleKey[] };

/** A draft every check passed — its rates are known numbers. */
export type ValidCourseDraft = CourseDraft & {
  coverageRate: number;
  wastageRate: number;
};

export type Validation =
  | { ok: true; draft: ValidCourseDraft }
  | { ok: false; items: ValidationItem[] };

/**
 * The editor's completeness checks, run on Save (rules § the editor;
 * OMS-REG-IMM-01.34, OMS-REG-IMM-01.35, OMS-REG-IMM-01.52, OMS-REG-IMM-01.53,
 * OMS-REG-IMM-01.54, OMS-REG-IMM-01.64): the name, coverage rate and wastage
 * rate are required; the wastage rate is at most 100; at least one vaccine
 * item; at least one dose; each dose's label; each dose's from age strictly
 * greater than the previous dose's; each dose's to age at least its from age.
 * Nothing is sent while any fails. The server enforces only the from-age
 * order among these (rules § doses); the rest are UI-only guards.
 */
export const validateDraft = (draft: CourseDraft): Validation => {
  const items: ValidationItem[] = [];
  if (draft.name.trim().length === 0)
    items.push({
      kind: 'field',
      field: 'name',
      labelKey: 'label.immunisation-name',
      messageKey: 'messages.required-field',
    });
  if (draft.coverageRate === undefined)
    items.push({
      kind: 'field',
      field: 'coverageRate',
      labelKey: 'label.coverage-rate',
      messageKey: 'messages.required-field',
    });
  if (draft.wastageRate === undefined)
    items.push({
      kind: 'field',
      field: 'wastageRate',
      labelKey: 'label.wastage-rate',
      messageKey: 'messages.required-field',
    });
  else if (draft.wastageRate > MAX_WASTAGE_RATE)
    items.push({
      kind: 'field',
      field: 'wastageRate',
      labelKey: 'label.wastage-rate',
      messageKey: 'error.numeric-input-error-too-big',
    });
  if (draft.vaccineCourseItems.length === 0)
    items.push({
      kind: 'field',
      field: 'vaccineItems',
      labelKey: 'label.vaccine-items',
      messageKey: 'messages.at-least-one-vaccine-item-required',
    });
  if (draft.vaccineCourseDoses.length === 0)
    items.push({
      kind: 'field',
      field: 'doses',
      labelKey: 'label.doses',
      messageKey: 'messages.at-least-one-dose-required',
    });
  draft.vaccineCourseDoses.forEach((dose, index) => {
    const messageKeys: LocaleKey[] = [];
    if (dose.label.trim().length === 0)
      messageKeys.push('messages.required-field');
    const previous = draft.vaccineCourseDoses[index - 1];
    if (previous && dose.minAgeMonths <= previous.minAgeMonths)
      messageKeys.push('error.dose-min-out-of-order');
    if (dose.maxAgeMonths < dose.minAgeMonths)
      messageKeys.push('error.dose-max-less-than-min');
    if (messageKeys.length > 0)
      items.push({
        kind: 'dose',
        doseId: dose.id,
        number: index + 1,
        messageKeys,
      });
  });
  if (items.length > 0) return { ok: false, items };
  return {
    ok: true,
    draft: {
      ...draft,
      // Both were checked present above; the narrowing is what the input
      // builders need.
      coverageRate: draft.coverageRate ?? 0,
      wastageRate: draft.wastageRate ?? 0,
    },
  };
};

/**
 * Whether the draft differs from the course it opened on — what offers Save
 * on an edit (rules § the editor; OMS-REG-IMM-01.42). A structural compare of
 * the fields the save would send, so an edit undone by hand reads as clean
 * again.
 */
export const isDirty = (draft: CourseDraft, original: CourseDraft): boolean =>
  JSON.stringify(comparable(draft)) !== JSON.stringify(comparable(original));

const comparable = (draft: CourseDraft) => ({
  name: draft.name,
  demographicId: draft.demographicId ?? null,
  coverageRate: draft.coverageRate ?? null,
  wastageRate: draft.wastageRate ?? null,
  useInGapsCalculations: draft.useInGapsCalculations,
  canSkipDose: draft.canSkipDose,
  items: draft.vaccineCourseItems.map(item => item.itemId),
  doses: draft.vaccineCourseDoses.map(dose => ({
    id: dose.id,
    label: dose.label,
    min: dose.minAgeMonths,
    max: dose.maxAgeMonths,
    custom: dose.customAgeLabel ?? '',
    interval: dose.minIntervalDays,
  })),
  configs: draft.storeConfigs.map(config => ({
    storeId: config.storeId,
    wastage: config.wastageRate ?? null,
    coverage: config.coverageRate ?? null,
  })),
});

// ─── Draft → input (contract § the editor) ────────────────────────────────

type InsertInput = InsertVaccineCourseVariables['input'];
type UpdateInput = UpdateVaccineCourseVariables['input'];

// Doses travel in months as decimals and whole days; a blank custom label
// travels as null. Items travel as their membership id + item id — a stored
// membership keeps its id (so it is left alone), a new one carries its minted
// id (so it is inserted).
const doseInputs = (draft: ValidCourseDraft): InsertInput['doses'] =>
  draft.vaccineCourseDoses.map(dose => ({
    id: dose.id,
    label: dose.label,
    minAge: dose.minAgeMonths,
    maxAge: dose.maxAgeMonths,
    minIntervalDays: dose.minIntervalDays,
    customAgeLabel: dose.customAgeLabel?.trim() ? dose.customAgeLabel : null,
  }));

const itemInputs = (draft: ValidCourseDraft): InsertInput['vaccineItems'] =>
  draft.vaccineCourseItems.map(item => ({ id: item.id, itemId: item.itemId }));

// Every rate travels wrapped — `{ value: null }` clears one; the wrapper is
// how the wire tells "clear" from "unchanged" (contract § per-store rates).
const storeConfigInputs = (
  draft: ValidCourseDraft
): NonNullable<InsertInput['storeConfigs']> =>
  draft.storeConfigs.map(config => ({
    id: config.id,
    storeId: config.storeId,
    wastageRate: { value: config.wastageRate ?? null },
    coverageRate: { value: config.coverageRate ?? null },
  }));

/** The create write — the whole course (rules § the editor). */
export const insertInput = (draft: ValidCourseDraft): InsertInput => ({
  id: draft.id,
  programId: draft.programId,
  name: draft.name.trim(),
  demographicId: draft.demographicId ?? null,
  coverageRate: draft.coverageRate,
  wastageRate: draft.wastageRate,
  useInGapsCalculations: draft.useInGapsCalculations,
  canSkipDose: draft.canSkipDose,
  vaccineItems: itemInputs(draft),
  doses: doseInputs(draft),
  storeConfigs: storeConfigInputs(draft),
});

/**
 * The edit write — the whole course, every field every time: the update is
 * destructive for an omitted `demographicId` and requires the rates and both
 * lists (contract wire trap), so nothing is left to the server's defaults. No
 * `programId`: the program is fixed for life (rules § the course).
 */
export const updateInput = (draft: ValidCourseDraft): UpdateInput => ({
  id: draft.id,
  name: draft.name.trim(),
  demographicId: draft.demographicId ?? null,
  coverageRate: draft.coverageRate,
  wastageRate: draft.wastageRate,
  useInGapsCalculations: draft.useInGapsCalculations,
  canSkipDose: draft.canSkipDose,
  vaccineItems: itemInputs(draft),
  doses: doseInputs(draft),
  storeConfigs: storeConfigInputs(draft),
});

// ─── What a save came back as (ui-surface S3 § states, S5) ────────────────

/**
 *  - `saved`          — the dialog closes; closure + the refreshed list is the
 *                       confirmation.
 *  - `duplicate-name` — refused as _name already exists on this program_
 *                       (its own message).
 *  - `doses-in-use`   — refused as _doses in use_; nothing persisted (its own
 *                       message).
 *  - `rejected`       — any other refusal: the generic message with the
 *                       server's own text disclosed. `serverError` is the
 *                       untyped variant (`DoseMinAgesAreNotInOrder`,
 *                       `Not a central server`) or a typed member's
 *                       description.
 *  - `forbidden`      — the server's own no-permission refusal (a client that
 *                       did not mirror it); the permission-denied modal is
 *                       owed, nothing else.
 *  - `failed`         — a transport/unexpected failure, already surfaced
 *                       globally; the dialog only releases its busy state.
 */
export type CourseSaveOutcome =
  | { kind: 'saved' }
  | { kind: 'duplicate-name' }
  | { kind: 'doses-in-use' }
  | { kind: 'rejected'; serverError: string }
  | { kind: 'forbidden'; permissions: string[] }
  | { kind: 'failed' };

// A top-level GraphQL error, read because the caller opted into
// returnGraphqlErrors: Forbidden is the permission refusal; anything else is
// an untyped rejection whose reason is `extensions.details` — the service
// variant name, or the plain "Not a central server".
const untypedOutcome = (
  result: Extract<GraphqlResult<unknown>, { kind: 'graphqlError' }>
): CourseSaveOutcome => {
  if (isForbidden(result.errors))
    return {
      kind: 'forbidden',
      permissions: missingPermissions(result.errors),
    };
  const details = result.errors[0]?.extensions?.details;
  return {
    kind: 'rejected',
    serverError:
      typeof details === 'string' && details.length > 0
        ? details
        : (result.errors[0]?.message ?? 'UnknownError'),
  };
};

/** Map a create's result onto the outcome. */
export const insertOutcome = (
  result: GraphqlResult<InsertVaccineCourseResult>
): CourseSaveOutcome => {
  if (result.kind === 'graphqlError') return untypedOutcome(result);
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.centralServer.vaccineCourse.insertVaccineCourse;
  if (response.__typename === 'VaccineCourseNode') return { kind: 'saved' };
  if (response.error.__typename === 'RecordProgramCombinationAlreadyExists')
    return { kind: 'duplicate-name' };
  return { kind: 'rejected', serverError: response.error.description };
};

/** Map an edit's result onto the outcome. */
export const updateOutcome = (
  result: GraphqlResult<UpdateVaccineCourseResult>
): CourseSaveOutcome => {
  if (result.kind === 'graphqlError') return untypedOutcome(result);
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.centralServer.vaccineCourse.updateVaccineCourse;
  if (response.__typename === 'VaccineCourseNode') return { kind: 'saved' };
  if (response.error.__typename === 'RecordProgramCombinationAlreadyExists')
    return { kind: 'duplicate-name' };
  if (response.error.__typename === 'VaccineDosesInUse')
    return { kind: 'doses-in-use' };
  return { kind: 'rejected', serverError: response.error.description };
};
