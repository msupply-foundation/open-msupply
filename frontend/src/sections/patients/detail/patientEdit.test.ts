import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ageFromDob,
  draftEquals,
  emptyDraft,
  isDraftValid,
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

  it('is whole years floor(days / 365) from the date of birth', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T12:00:00Z'));
    // 30 calendar years back → 30 whole years.
    expect(ageFromDob('1996-07-22')).toBe(30);
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
