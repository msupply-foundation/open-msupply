import { describe, expect, it } from 'vitest';
import type { GraphqlResult } from '@/api/graphql';
import type {
  InsertVaccineCourseResult,
  UpdateVaccineCourseResult,
} from './immunisationPrograms.generated';
import {
  draftFromCourse,
  insertInput,
  insertOutcome,
  isDirty,
  ageEntryFromTotal,
  ageEntryTotal,
  doseProblem,
  fieldProblem,
  joinMonths,
  settleAgeEntry,
  newCourseDraft,
  nextDose,
  setStoreRate,
  splitMonths,
  storeRate,
  updateInput,
  updateOutcome,
  validateDraft,
  visibleProblems,
  type CourseDraft,
  type CourseNode,
  type ValidCourseDraft,
  type ValidationItem,
} from './courseEditor';

// Anchors: spec/immunisation-programs/acceptance.md — the editor.
//   OMS-REG-IMM-01.31  a new course opens blank with its defaults
// OMS-REG-IMM-01.34  a blank Save lists name / item / dose as required, sends
// nothing OMS-REG-IMM-01.36  a duplicate name is refused as such, the draft
// kept OMS-REG-IMM-01.9  a demographic can be chosen and cleared
// OMS-REG-IMM-01.39  store overrides travel and come back per store
// OMS-REG-IMM-01.35 cleared rates are required OMS-REG-IMM-01.16  an edit opens
// the course whole OMS-REG-IMM-01.42  Save is not offered until the draft
// differs OMS-REG-IMM-01.45  clearing the demographic sends none
// OMS-REG-IMM-01.46  clearing a store override sends a null rate on the kept
// row OMS-REG-IMM-01.47  a rename to a sibling's name is refused
// OMS-REG-IMM-01.50  the first dose's defaults OMS-REG-IMM-01.51  the second
// dose's defaults OMS-REG-IMM-01.52  a blank dose label is required
// OMS-REG-IMM-01.53  a from age not greater than the previous dose's is refused
// OMS-REG-IMM-01.54  a to age below the from age is refused OMS-REG-IMM-01.56
// ages are months on the wire, years + months on screen OMS-REG-IMM-01.58
// removing an in-use dose is refused as such OMS-REG-IMM-01.64  a wastage rate
// above 100 is too large The editor's rules live in pure functions, so each is
// pinned at the cheapest layer: the draft, its defaults and checks, the draft →
// input mapping (what the whole-course write actually sends) and the mapping of
// the writes' rejection SHAPES onto what the dialog shows.

const course: CourseNode = {
  id: 'course-1',
  name: 'Measles',
  programId: 'prog-1',
  demographicId: 'grp-1',
  coverageRate: 95,
  wastageRate: 10,
  useInGapsCalculations: true,
  canSkipDose: false,
  demographic: { id: 'grp-1', name: 'Children' },
  vaccineCourseItems: [{ id: 'm-1', itemId: 'item-1', name: 'MMR vial' }],
  vaccineCourseDoses: [
    {
      id: 'd-1',
      label: 'Measles 1',
      minAgeMonths: 9,
      maxAgeMonths: 12,
      customAgeLabel: 'nine months',
      minIntervalDays: 0,
    },
    {
      id: 'd-2',
      label: 'Measles 2',
      minAgeMonths: 15,
      maxAgeMonths: 18,
      customAgeLabel: null,
      minIntervalDays: 28,
    },
  ],
  storeConfigs: [
    { id: 'sc-1', storeId: 'store-a', wastageRate: 5, coverageRate: 80 },
    { id: 'sc-2', storeId: 'store-b', wastageRate: 7, coverageRate: null },
  ],
};

const valid = (draft: CourseDraft): ValidCourseDraft => {
  const v = validateDraft(draft);
  if (!v.ok)
    throw new Error(`draft should be valid: ${JSON.stringify(v.items)}`);
  return v.draft;
};

describe('OMS-REG-IMM-01.31 — a new course opens blank with its defaults', () => {
  it('starts with coverage 100, wastage 0, GAPS on, skip off, nothing chosen', () => {
    const draft = newCourseDraft('new-id', 'prog-1');
    expect(draft).toMatchObject({
      id: 'new-id',
      programId: 'prog-1',
      name: '',
      demographicId: null,
      coverageRate: 100,
      wastageRate: 0,
      useInGapsCalculations: true,
      canSkipDose: false,
    });
    expect(draft.vaccineCourseItems).toEqual([]);
    expect(draft.vaccineCourseDoses).toEqual([]);
    expect(draft.storeConfigs).toEqual([]);
  });
});

describe('OMS-REG-IMM-01.16 — an edit opens the course whole', () => {
  it('carries every field, item, dose and override of the course', () => {
    const draft = draftFromCourse(course);
    expect(draft).toMatchObject({
      id: 'course-1',
      name: 'Measles',
      demographicId: 'grp-1',
      coverageRate: 95,
      wastageRate: 10,
    });
    expect(draft.vaccineCourseItems).toHaveLength(1);
    expect(draft.vaccineCourseDoses).toHaveLength(2);
    expect(draft.storeConfigs).toHaveLength(2);
  });

  it("reads the server's null lists as empty", () => {
    const draft = draftFromCourse({
      ...course,
      vaccineCourseItems: null,
      vaccineCourseDoses: null,
      storeConfigs: null,
    });
    expect(draft.vaccineCourseItems).toEqual([]);
    expect(draft.vaccineCourseDoses).toEqual([]);
    expect(draft.storeConfigs).toEqual([]);
  });
});

describe('OMS-REG-IMM-01.34 — a blank Save lists what is missing and sends nothing', () => {
  it('names the course name, at least one item and at least one dose', () => {
    const v = validateDraft(newCourseDraft('id', 'prog-1'));
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(v.items).toEqual([
      {
        kind: 'field',
        field: 'name',
        labelKey: 'label.immunisation-name',
        messageKey: 'messages.required-field',
      },
      {
        kind: 'field',
        field: 'vaccineItems',
        labelKey: 'label.vaccine-items',
        messageKey: 'messages.at-least-one-vaccine-item-required',
      },
      {
        kind: 'field',
        field: 'doses',
        labelKey: 'label.doses',
        messageKey: 'messages.at-least-one-dose-required',
      },
    ]);
  });

  it('accepts a complete draft', () => {
    expect(validateDraft(draftFromCourse(course)).ok).toBe(true);
  });
});

describe('OMS-REG-IMM-01.35 / OMS-REG-IMM-01.64 — the rates', () => {
  it('lists a cleared coverage or wastage rate as required', () => {
    const v = validateDraft({
      ...draftFromCourse(course),
      coverageRate: undefined,
      wastageRate: undefined,
    });
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(
      v.items.map(item => (item.kind === 'field' ? item.field : ''))
    ).toEqual(['coverageRate', 'wastageRate']);
  });

  it('refuses a wastage rate above 100 as too large, and has no cap on coverage', () => {
    const v = validateDraft({
      ...draftFromCourse(course),
      coverageRate: 250,
      wastageRate: 150,
    });
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(v.items).toEqual([
      {
        kind: 'field',
        field: 'wastageRate',
        labelKey: 'label.wastage-rate',
        messageKey: 'error.numeric-input-error-too-big',
      },
    ]);
    expect(
      validateDraft({ ...draftFromCourse(course), wastageRate: 100 }).ok
    ).toBe(true);
  });
});

describe('OMS-REG-IMM-01.50 / OMS-REG-IMM-01.51 — a new dose is born from the last one', () => {
  it('the first dose: "<name> 1", 0 → 1 month, 30 days, blank custom label', () => {
    const draft = { ...newCourseDraft('id', 'prog-1'), name: 'Polio' };
    expect(nextDose(draft, 'd-new')).toEqual({
      id: 'd-new',
      label: 'Polio 1',
      minAgeMonths: 0,
      maxAgeMonths: 1,
      minIntervalDays: 30,
      customAgeLabel: null,
    });
  });

  it('the next dose: from = previous to, to = that + the previous span, the previous interval', () => {
    const draft = draftFromCourse(course); // last dose 15 → 18, 28 days
    expect(nextDose(draft, 'd-3')).toEqual({
      id: 'd-3',
      label: 'Measles 3',
      minAgeMonths: 18,
      maxAgeMonths: 21,
      minIntervalDays: 28,
      customAgeLabel: null,
    });
  });

  it('a previous dose with no span advances by one month', () => {
    const draft = { ...newCourseDraft('id', 'prog-1'), name: 'Polio' };
    const first = { ...nextDose(draft, 'd-1'), maxAgeMonths: 0 };
    const withFirst = { ...draft, vaccineCourseDoses: [first] };
    expect(nextDose(withFirst, 'd-2')).toMatchObject({
      label: 'Polio 2',
      minAgeMonths: 0,
      maxAgeMonths: 1,
    });
  });
});

describe('OMS-REG-IMM-01.52 / OMS-REG-IMM-01.53 / OMS-REG-IMM-01.54 — the dose checks, grouped per dose', () => {
  it('a blank label is required, named by dose number', () => {
    const draft = draftFromCourse(course);
    draft.vaccineCourseDoses = draft.vaccineCourseDoses.map((d, i) =>
      i === 0 ? { ...d, label: '  ' } : d
    );
    const v = validateDraft(draft);
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(v.items).toEqual([
      {
        kind: 'dose',
        doseId: 'd-1',
        number: 1,
        messageKeys: ['messages.required-field'],
      },
    ]);
  });

  it("a from age not greater than the previous dose's is out of order", () => {
    const draft = draftFromCourse(course);
    draft.vaccineCourseDoses = draft.vaccineCourseDoses.map((d, i) =>
      i === 1 ? { ...d, minAgeMonths: 9, maxAgeMonths: 12 } : d
    );
    const v = validateDraft(draft);
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(v.items).toEqual([
      {
        kind: 'dose',
        doseId: 'd-2',
        number: 2,
        messageKeys: ['error.dose-min-out-of-order'],
      },
    ]);
  });

  it('a to age below its from age is refused, and messages for one dose group together', () => {
    const draft = draftFromCourse(course);
    draft.vaccineCourseDoses = draft.vaccineCourseDoses.map((d, i) =>
      i === 1 ? { ...d, label: '', minAgeMonths: 20, maxAgeMonths: 19 } : d
    );
    const v = validateDraft(draft);
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(v.items).toEqual([
      {
        kind: 'dose',
        doseId: 'd-2',
        number: 2,
        messageKeys: [
          'messages.required-field',
          'error.dose-max-less-than-min',
        ],
      },
    ]);
  });
});

describe("when each check reports — the typed-value rules at once, the required family on Save (ui-standards › form submits validate on click; OMS-REG-IMM-01.53 / .54 / .64)", () => {
  // A blank new course (name, item required) with a too-large wastage rate
  // and one dose that is both unlabelled and ends before it starts.
  const failing = (): ValidationItem[] => {
    const draft = newCourseDraft('id', 'prog-1');
    draft.wastageRate = 150;
    draft.vaccineCourseDoses = [
      {
        id: 'd-1',
        label: '',
        minAgeMonths: 20,
        maxAgeMonths: 19,
        customAgeLabel: null,
        minIntervalDays: 0,
      },
    ];
    const v = validateDraft(draft);
    if (v.ok) throw new Error('the draft should fail');
    return v.items;
  };

  it('before a Save press shows the too-large rate and the age order alone — the required checks wait', () => {
    expect(visibleProblems(failing(), false)).toEqual([
      {
        kind: 'field',
        field: 'wastageRate',
        labelKey: 'label.wastage-rate',
        messageKey: 'error.numeric-input-error-too-big',
      },
      {
        kind: 'dose',
        doseId: 'd-1',
        number: 1,
        messageKeys: ['error.dose-max-less-than-min'],
      },
    ]);
  });

  it('once armed shows everything, the dose keeping both its messages', () => {
    const items = failing();
    expect(visibleProblems(items, true)).toEqual(items);
    expect(
      items.map(item =>
        item.kind === 'field' ? item.messageKey : item.messageKeys
      )
    ).toEqual([
      'messages.required-field',
      'error.numeric-input-error-too-big',
      'messages.at-least-one-vaccine-item-required',
      ['messages.required-field', 'error.dose-max-less-than-min'],
    ]);
  });

  it('a dose failing only a required check has no line before Save', () => {
    const draft = draftFromCourse(course);
    draft.vaccineCourseDoses = draft.vaccineCourseDoses.map((d, i) =>
      i === 0 ? { ...d, label: '' } : d
    );
    const v = validateDraft(draft);
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(visibleProblems(v.items, false)).toEqual([]);
    expect(visibleProblems(v.items, true)).toEqual(v.items);
  });

  it('gives each field and dose its own error state from the same visible list', () => {
    const items = failing();
    const quiet = visibleProblems(items, false);
    expect(fieldProblem(quiet, 'wastageRate')).toBe(
      'error.numeric-input-error-too-big'
    );
    expect(fieldProblem(quiet, 'name')).toBeUndefined();
    expect(fieldProblem(items, 'name')).toBe('messages.required-field');
    expect(doseProblem(quiet, 'd-1', 'error.dose-max-less-than-min')).toBe(
      true
    );
    expect(doseProblem(quiet, 'd-1', 'messages.required-field')).toBe(false);
    expect(doseProblem(items, 'd-1', 'messages.required-field')).toBe(true);
    expect(doseProblem(items, 'd-2', 'messages.required-field')).toBe(false);
  });
});

describe('OMS-REG-IMM-01.56 — ages are months on the wire, years + months on screen', () => {
  it('splits 15 months into 1 year 3 months and 9.5 into 0 years 9.5 months', () => {
    expect(splitMonths(15)).toEqual({ years: 1, months: 3 });
    expect(splitMonths(9.5)).toEqual({ years: 0, months: 9.5 });
    expect(splitMonths(0)).toEqual({ years: 0, months: 0 });
  });

  it('joins back to the single months figure', () => {
    expect(joinMonths(1, 3)).toBe(15);
    expect(joinMonths(0, 9.5)).toBe(9.5);
  });
});

describe('OMS-REG-IMM-01.39 / OMS-REG-IMM-01.46 — store overrides', () => {
  it("reads a store's override, and none where the row has no rate", () => {
    const configs = draftFromCourse(course).storeConfigs;
    expect(storeRate(configs, 'store-a', 'wastageRate')).toBe(5);
    expect(storeRate(configs, 'store-a', 'coverageRate')).toBe(80);
    expect(storeRate(configs, 'store-b', 'coverageRate')).toBeUndefined();
    expect(storeRate(configs, 'store-zz', 'wastageRate')).toBeUndefined();
  });

  it('entering a rate for a store with no row creates one; clearing on no row is a no-op', () => {
    const next = setStoreRate(
      [],
      'store-c',
      'coverageRate',
      50,
      () => 'sc-new'
    );
    expect(next).toEqual([
      { id: 'sc-new', storeId: 'store-c', wastageRate: null, coverageRate: 50 },
    ]);
    expect(
      setStoreRate([], 'store-c', 'coverageRate', undefined, () => 'x')
    ).toEqual([]);
  });

  it('clearing a rate on an existing row keeps the row with a null rate (rows are never removed)', () => {
    const configs = draftFromCourse(course).storeConfigs;
    const next = setStoreRate(
      configs,
      'store-a',
      'wastageRate',
      undefined,
      () => 'x'
    );
    expect(next.find(c => c.storeId === 'store-a')).toEqual({
      id: 'sc-1',
      storeId: 'store-a',
      wastageRate: null,
      coverageRate: 80,
    });
    expect(next).toHaveLength(2);
  });
});

describe('OMS-REG-IMM-01.42 — Save is offered only once the draft differs', () => {
  it('a freshly opened course is clean', () => {
    expect(isDirty(draftFromCourse(course), draftFromCourse(course))).toBe(
      false
    );
  });

  it('any field, item, dose or override change makes it dirty, and undoing makes it clean again', () => {
    const base = draftFromCourse(course);
    expect(isDirty({ ...base, name: 'Measles 2' }, base)).toBe(true);
    expect(isDirty({ ...base, canSkipDose: true }, base)).toBe(true);
    expect(isDirty({ ...base, vaccineCourseItems: [] }, base)).toBe(true);
    expect(
      isDirty(
        { ...base, vaccineCourseDoses: base.vaccineCourseDoses.slice(0, 1) },
        base
      )
    ).toBe(true);
    expect(
      isDirty(
        {
          ...base,
          storeConfigs: setStoreRate(
            base.storeConfigs,
            'store-b',
            'coverageRate',
            1,
            () => 'x'
          ),
        },
        base
      )
    ).toBe(true);
    expect(isDirty({ ...{ ...base, name: 'x' }, name: 'Measles' }, base)).toBe(
      false
    );
  });
});

describe('the write inputs (contract § the editor)', () => {
  it('a create carries the whole course: program, header, items, doses in months, wrapped store rates', () => {
    const draft = valid({
      ...draftFromCourse(course),
      id: 'new-1',
      name: '  Measles  ',
    });
    expect(insertInput(draft)).toEqual({
      id: 'new-1',
      programId: 'prog-1',
      name: 'Measles',
      demographicId: 'grp-1',
      coverageRate: 95,
      wastageRate: 10,
      useInGapsCalculations: true,
      canSkipDose: false,
      vaccineItems: [{ id: 'm-1', itemId: 'item-1' }],
      doses: [
        {
          id: 'd-1',
          label: 'Measles 1',
          minAge: 9,
          maxAge: 12,
          minIntervalDays: 0,
          customAgeLabel: 'nine months',
        },
        {
          id: 'd-2',
          label: 'Measles 2',
          minAge: 15,
          maxAge: 18,
          minIntervalDays: 28,
          customAgeLabel: null,
        },
      ],
      storeConfigs: [
        {
          id: 'sc-1',
          storeId: 'store-a',
          wastageRate: { value: 5 },
          coverageRate: { value: 80 },
        },
        {
          id: 'sc-2',
          storeId: 'store-b',
          wastageRate: { value: 7 },
          coverageRate: { value: null },
        },
      ],
    });
  });

  it('an edit carries the whole course too — no programId, demographicId sent even when none (OMS-REG-IMM-01.45), a cleared override as { value: null } (OMS-REG-IMM-01.46)', () => {
    const base = draftFromCourse(course);
    const draft = valid({
      ...base,
      demographicId: null,
      demographic: null,
      storeConfigs: setStoreRate(
        base.storeConfigs,
        'store-a',
        'coverageRate',
        undefined,
        () => 'x'
      ),
    });
    const input = updateInput(draft);
    expect(input).not.toHaveProperty('programId');
    expect(input.demographicId).toBeNull();
    expect(input.storeConfigs?.[0]).toEqual({
      id: 'sc-1',
      storeId: 'store-a',
      wastageRate: { value: 5 },
      coverageRate: { value: null },
    });
    expect(input.vaccineItems).toEqual([{ id: 'm-1', itemId: 'item-1' }]);
    expect(input.doses).toHaveLength(2);
  });
});

// The writes' rejection SHAPES, taken FROM the generated results so a variant
// renamed or retired server-side fails this file.
type InsertErrorTypename = Extract<
  InsertVaccineCourseResult['centralServer']['vaccineCourse']['insertVaccineCourse'],
  { __typename: 'InsertVaccineCourseError' }
>['error']['__typename'];
type UpdateErrorTypename = Extract<
  UpdateVaccineCourseResult['centralServer']['vaccineCourse']['updateVaccineCourse'],
  { __typename: 'UpdateVaccineCourseError' }
>['error']['__typename'];

const inserted: GraphqlResult<InsertVaccineCourseResult> = {
  kind: 'success',
  data: {
    centralServer: {
      vaccineCourse: {
        insertVaccineCourse: {
          __typename: 'VaccineCourseNode',
          id: 'c',
          name: 'n',
        },
      },
    },
  },
};
const insertRefused = (
  typename: InsertErrorTypename,
  description: string
): GraphqlResult<InsertVaccineCourseResult> => ({
  kind: 'success',
  data: {
    centralServer: {
      vaccineCourse: {
        insertVaccineCourse: {
          __typename: 'InsertVaccineCourseError',
          error: { __typename: typename, description },
        },
      },
    },
  },
});
const updateRefused = (
  typename: UpdateErrorTypename,
  description: string
): GraphqlResult<UpdateVaccineCourseResult> => ({
  kind: 'success',
  data: {
    centralServer: {
      vaccineCourse: {
        updateVaccineCourse: {
          __typename: 'UpdateVaccineCourseError',
          error: { __typename: typename, description },
        },
      },
    },
  },
});

describe('OMS-REG-IMM-01.36 / OMS-REG-IMM-01.47 — a name another course of the program carries', () => {
  it('is the typed duplicate on create and on edit', () => {
    expect(
      insertOutcome(
        insertRefused(
          'RecordProgramCombinationAlreadyExists',
          'Course name already exists on this program'
        )
      )
    ).toEqual({ kind: 'duplicate-name' });
    expect(
      updateOutcome(
        updateRefused(
          'RecordProgramCombinationAlreadyExists',
          'Course name already exists on this program'
        )
      )
    ).toEqual({ kind: 'duplicate-name' });
  });

  it('a create that went through is saved', () => {
    expect(insertOutcome(inserted)).toEqual({ kind: 'saved' });
  });
});

describe('OMS-REG-IMM-01.58 — removing an in-use dose', () => {
  it('is the typed doses-in-use refusal on edit', () => {
    expect(
      updateOutcome(
        updateRefused(
          'VaccineDosesInUse',
          'One or more vaccine doses are in use and cannot be modified or deleted.'
        )
      )
    ).toEqual({ kind: 'doses-in-use' });
  });
});

describe('the other shapes (contract § rejections)', () => {
  it("a duplicate id is a generic rejection with the member's description", () => {
    expect(
      insertOutcome(
        insertRefused('RecordAlreadyExist', 'Record already exists')
      )
    ).toEqual({
      kind: 'rejected',
      serverError: 'Record already exists',
    });
  });

  it('an untyped Bad user input carries the variant name; a Forbidden names the permission', () => {
    expect(
      insertOutcome({
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [
          {
            message: 'Bad user input',
            extensions: { details: 'DoseMinAgesAreNotInOrder' },
          },
        ],
      })
    ).toEqual({ kind: 'rejected', serverError: 'DoseMinAgesAreNotInOrder' });
    expect(
      updateOutcome({
        kind: 'graphqlError',
        message: 'Forbidden',
        errors: [
          {
            message: 'Forbidden',
            extensions: {
              details:
                'Missing permission: EditCentralData, Required permissions: HasPermission(EditCentralData), Store: Some("s")',
            },
          },
        ],
      })
    ).toEqual({ kind: 'forbidden', permissions: ['EditCentralData'] });
  });

  it('a transport failure is failed', () => {
    expect(insertOutcome({ kind: 'unexpectedError' })).toEqual({
      kind: 'failed',
    });
    expect(updateOutcome({ kind: 'aborted' })).toEqual({ kind: 'failed' });
  });
});

describe('OMS-REG-IMM-01.64 / OMS-REG-IMM-01.56 — the age pair as typed (IMM-20260917-F2)', () => {
  it('stores the sum of the two halves as typed — the months may carry a fraction', () => {
    expect(ageEntryTotal({ years: 1, months: 6.5 })).toBe(18.5);
    expect(ageEntryTotal({ years: 0, months: 1.5 })).toBe(1.5);
    // Keystroke by keystroke into the months half over 1 year: each commit
    // stores 12 + the months AS TYPED, never a re-derived value.
    expect([6, 6.5].map(months => ageEntryTotal({ years: 1, months }))).toEqual(
      [18, 18.5]
    );
  });

  it('settles the typed pair into whole years and the remaining months', () => {
    expect(settleAgeEntry({ years: 1, months: 6.5 })).toEqual({
      years: 1,
      months: 6.5,
    });
    expect(settleAgeEntry({ years: 1, months: 13 })).toEqual({
      years: 2,
      months: 1,
    });
    // A settled pair is a fixed point.
    expect(settleAgeEntry({ years: 1, months: 9 })).toEqual({
      years: 1,
      months: 9,
    });
  });

  it('opens a stored figure as whole years and the remaining months', () => {
    expect(ageEntryFromTotal(21)).toEqual({ years: 1, months: 9 });
    expect(ageEntryFromTotal(1.5)).toEqual({ years: 0, months: 1.5 });
    expect(ageEntryTotal(ageEntryFromTotal(29.4))).toBeCloseTo(29.4);
  });

  it('documents the drift it replaces: a fractional year re-derived mid-entry', () => {
    // The old cells re-derived BOTH halves from the stored total on every
    // keystroke, and the years half took a fraction: after "1.7" the months
    // half read 8.4, so "1.75" joined with 8.4 and stored 29.4 — not 21. The
    // years half is whole now, and the pair is held as typed.
    const afterOnePointSeven = splitMonths(joinMonths(1.7, 0));
    expect(afterOnePointSeven.months).toBeCloseTo(8.4);
    expect(joinMonths(1.75, afterOnePointSeven.months)).toBeCloseTo(29.4);
    expect(settleAgeEntry({ years: 1, months: 9 })).toEqual({
      years: 1,
      months: 9,
    });
  });
});
