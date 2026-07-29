import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ageFromDob,
  dobFromAge,
  draftEquals,
  emptyDraft,
  isDraftValid,
  patientFieldErrors,
  toInsertInput,
  toUpdateInput,
  type PatientDraft,
} from './patientEdit';

// A fully-populated draft for the input-builder tests.
const fullDraft = (): PatientDraft => ({
  code: 'P-001',
  code2: 'NUIC-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  gender: 'FEMALE',
  dateOfBirth: '1990-12-10',
  address1: '1 Analytical Way',
  phone: '555-0100',
  nextOfKinId: 'kin-1',
  nextOfKinName: 'Byron, Anne',
  isDeceased: false,
  dateOfDeath: null,
});

describe('ageFromDob (AC-M3 — age derived from date of birth)', () => {
  afterEach(() => vi.useRealTimers());

  it('is completed calendar years from the date of birth', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T12:00:00Z'));
    // 30 calendar years back → 30 whole years.
    expect(ageFromDob('1996-07-22')).toBe(30);
  });

  // A day short of the birthday is still the younger age — the property a
  // days/365 division gets wrong once leap days accumulate.
  it('counts the year only once the birthday has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 22, 12));
    expect(ageFromDob('1996-07-23')).toBe(29);
    expect(ageFromDob('1996-07-22')).toBe(30);
  });

  // The regression this file's round-trip test caught in CI but not locally: on
  // 31 December, three leap-inclusive years past a 1 January date of birth,
  // floor(days / 365) read 3 where the calendar says 2.
  it('does not overcount a January date of birth late in December', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 23));
    expect(ageFromDob('2024-01-01')).toBe(2);
  });

  // The second one the round-trip caught, in Asia/Kathmandu only: the zone
  // moved +05:30 → +05:45 in 1986, so instant arithmetic lands 15 minutes short
  // of a 1986 birthday and reads a year low. Comparing calendar fields can't.
  it('is unaffected by a zone changing offset since the birth year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));
    expect(ageFromDob('1986-01-01')).toBe(40);
  });

  it('is undefined with no date of birth', () => {
    expect(ageFromDob(null)).toBeUndefined();
  });

  it('is undefined for a future date of birth', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T12:00:00Z'));
    expect(ageFromDob('2030-01-01')).toBeUndefined();
  });
});

describe('dobFromAge (an age entered in place of a date of birth)', () => {
  afterEach(() => vi.useRealTimers());

  it('back-fills the start of the birth year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T12:00:00Z'));
    expect(dobFromAge(43)).toBe('1983-01-01');
  });

  it('treats a newborn as the start of the current year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T12:00:00Z'));
    expect(dobFromAge(0)).toBe('2026-01-01');
  });

  // The form drives both directions off the single dateOfBirth field, so a
  // typed age must survive the trip back out as the SAME number — otherwise the
  // field fights the typist. Checked across the whole offered range at both
  // ends of the year.
  //
  // The instants are LOCAL (`new Date(y, m, d)`), not UTC strings: both helpers
  // read the local calendar, so a UTC string lands on a different local date in
  // every timezone — which is how the December end of this range passed in NZ
  // (UTC+13, already next year) and failed in CI (UTC).
  it.each([
    ['1 January', new Date(2026, 0, 1)],
    ['31 December', new Date(2026, 11, 31, 23)],
  ])('round-trips every age 0–150 on %s', (_label, now) => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    for (let age = 0; age <= 150; age++) {
      expect(ageFromDob(dobFromAge(age))).toBe(age);
    }
  });
});

describe('isDraftValid (AC-C3 — built-in form requires code + names)', () => {
  it('requires code, first name and last name', () => {
    expect(isDraftValid(fullDraft())).toBe(true);
    expect(isDraftValid({ ...fullDraft(), code: '' })).toBe(false);
    expect(isDraftValid({ ...fullDraft(), firstName: '  ' })).toBe(false);
    expect(isDraftValid({ ...fullDraft(), lastName: '' })).toBe(false);
  });

  it('an empty draft is invalid', () => {
    expect(isDraftValid(emptyDraft())).toBe(false);
  });
});

describe('patientFieldErrors (AC-C3 — required-field rules feed validation)', () => {
  const ids = (draft: PatientDraft) =>
    patientFieldErrors(draft)
      .filter(e => e.failed)
      .map(e => e.id);

  it('flags exactly code, first name and last name when empty', () => {
    expect(ids(emptyDraft())).toEqual(['code', 'firstName', 'lastName']);
  });

  it('flags nothing once all three are filled', () => {
    expect(ids(fullDraft())).toEqual([]);
  });

  it('treats whitespace-only as empty and flags just that field', () => {
    expect(ids({ ...fullDraft(), firstName: '   ' })).toEqual(['firstName']);
  });

  it('the required rules carry no per-field message — each defaults to the generic required text', () => {
    const required = patientFieldErrors(emptyDraft()).filter(e => e.failed);
    expect(required.every(e => !e.message)).toBe(true);
  });
});

// spec/patients § generating a code — DIS-02 `.57`.
describe('patientFieldErrors (DIS-02 .57 — duplicate code blocks the save)', () => {
  const codeErrors = (draft: PatientDraft, codeTaken: boolean) =>
    patientFieldErrors(draft, codeTaken).filter(
      e => e.id === 'code' && e.failed
    );

  it('flags nothing extra when the code is not taken', () => {
    expect(codeErrors(fullDraft(), false)).toEqual([]);
  });

  // No dictionary is loaded under test, so t() answers with the key — asserting
  // the key is what pins the message to the right locale entry.
  it('flags the code with the duplicated-code message when it is taken', () => {
    const errors = codeErrors({ ...fullDraft(), code: 'GEN0007' }, true);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe('error.duplicated-code');
  });

  // The message means the rule is NOT deferred (formValidation defers only
  // message-less rules), so the clash shows the moment the check answers
  // instead of needing the form armed a second time.
  it('is not held back until the form is armed', () => {
    const errors = codeErrors(fullDraft(), true);
    expect(errors[0]?.showOnSubmit).toBeUndefined();
    expect(errors[0]?.message).toBeDefined();
  });

  // Both code rules share the id so the field renders one message; the required
  // rule is listed first, so an empty code reads as required, not duplicated.
  it('reports an empty code as required, not duplicated', () => {
    const errors = codeErrors(emptyDraft(), true);
    expect(errors[0]?.message).toBeUndefined();
  });
});

describe('toUpdateInput (AC-E2 — plain edit is a destructive full replace)', () => {
  it('sends the FULL field set so omitted values clear (never partial)', () => {
    // Blank optional fields must go over the wire as explicit null, not "" and
    // not omitted — the server clears any field not present.
    const draft: PatientDraft = {
      ...emptyDraft(),
      code: 'P-9',
      firstName: 'Grace',
      lastName: 'Hopper',
    };
    const input = toUpdateInput('id-9', draft);
    expect(input).toEqual({
      id: 'id-9',
      code: 'P-9',
      code2: null,
      firstName: 'Grace',
      lastName: 'Hopper',
      gender: null,
      dateOfBirth: null,
      address1: null,
      phone: null,
      isDeceased: false,
      dateOfDeath: null,
      nextOfKinId: null,
      nextOfKinName: null,
    });
  });

  it('never carries a `name` field — the display name is derived', () => {
    expect('name' in toUpdateInput('id-1', fullDraft())).toBe(false);
  });

  it('only sends date of death when the patient is deceased', () => {
    const alive = toUpdateInput('id-1', {
      ...fullDraft(),
      isDeceased: false,
      dateOfDeath: '2020-01-01',
    });
    expect(alive.dateOfDeath).toBeNull();

    const deceased = toUpdateInput('id-1', {
      ...fullDraft(),
      isDeceased: true,
      dateOfDeath: '2020-01-01',
    });
    expect(deceased.dateOfDeath).toBe('2020-01-01');
    expect(deceased.isDeceased).toBe(true);
  });
});

describe('toInsertInput (AC-C3/C6 — plain create input)', () => {
  it('carries the minted id + code and the full field set', () => {
    const input = toInsertInput('new-id', fullDraft());
    expect(input.id).toBe('new-id');
    expect(input.code).toBe('P-001');
    expect(input.firstName).toBe('Ada');
    expect('name' in input).toBe(false);
  });
});

describe('draftEquals (dirty tracking)', () => {
  it('is true for structurally-equal drafts and false otherwise', () => {
    expect(draftEquals(fullDraft(), fullDraft())).toBe(true);
    expect(draftEquals(fullDraft(), { ...fullDraft(), phone: 'changed' })).toBe(
      false
    );
  });
});
