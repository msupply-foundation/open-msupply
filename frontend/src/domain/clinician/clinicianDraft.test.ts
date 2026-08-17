import { describe, expect, it } from 'vitest';
import {
  clinicianFieldErrors,
  codeAlreadyUsed,
  emptyDraft,
  toInsertInput,
  type ClinicianDraft,
} from './clinicianDraft';
import type { Clinician } from './clinicianResource';

const draft = (overrides: Partial<ClinicianDraft> = {}): ClinicianDraft => ({
  ...emptyDraft(),
  code: 'ABC',
  lastName: 'Tui',
  initials: 'AT',
  ...overrides,
});

const clinician = (code: string): Clinician => ({
  id: `id-${code}`,
  code,
  firstName: null,
  lastName: 'Existing',
  initials: 'E',
});

const failing = (d: ClinicianDraft) =>
  clinicianFieldErrors(d)
    .filter(e => e.failed)
    .map(e => e.id);

describe('clinicianFieldErrors', () => {
  it('requires code, last name and initials', () => {
    expect(failing(emptyDraft())).toEqual(['code', 'lastName', 'initials']);
  });

  it('passes a draft carrying only those three', () => {
    expect(failing(draft())).toEqual([]);
  });

  it('treats whitespace as empty', () => {
    expect(failing(draft({ initials: '   ' }))).toEqual(['initials']);
  });

  it('never requires first name, mobile or gender', () => {
    expect(failing(draft({ firstName: '', mobile: '', gender: null }))).toEqual(
      []
    );
  });

  it('defers every rule to the save attempt (no message set)', () => {
    // A plain required error carries no message, which is what makes
    // createFormValidation hold it back until armed.
    expect(clinicianFieldErrors(emptyDraft()).every(e => !e.message)).toBe(
      true
    );
  });
});

describe('codeAlreadyUsed', () => {
  const existing = [clinician('ABC'), clinician('zzt-1')];

  it('matches an existing code', () => {
    expect(codeAlreadyUsed(existing, 'ABC')).toBe(true);
  });

  it('matches case-insensitively, either direction', () => {
    expect(codeAlreadyUsed(existing, 'abc')).toBe(true);
    expect(codeAlreadyUsed(existing, 'ZZT-1')).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(codeAlreadyUsed(existing, '  ABC  ')).toBe(true);
  });

  it('reports an unused code', () => {
    expect(codeAlreadyUsed(existing, 'NEW')).toBe(false);
  });

  it('never fires on an empty code — that is the required-field rule', () => {
    expect(codeAlreadyUsed(existing, '')).toBe(false);
    expect(codeAlreadyUsed(existing, '   ')).toBe(false);
  });
});

describe('toInsertInput', () => {
  it('carries the minted id and upper-cases the code', () => {
    const input = toInsertInput('new-id', draft({ code: 'abc-1' }));
    expect(input.id).toBe('new-id');
    expect(input.code).toBe('ABC-1');
  });

  it('trims every text field', () => {
    const input = toInsertInput(
      'id',
      draft({
        code: ' ab ',
        firstName: ' Aroha ',
        lastName: ' Tui ',
        initials: ' AT ',
        mobile: ' 021 ',
      })
    );
    expect(input).toMatchObject({
      code: 'AB',
      firstName: 'Aroha',
      lastName: 'Tui',
      initials: 'AT',
      mobile: '021',
    });
  });

  it('sends a blank optional as null, never an empty string', () => {
    const input = toInsertInput('id', draft({ firstName: '  ', mobile: '' }));
    expect(input.firstName).toBeNull();
    expect(input.mobile).toBeNull();
  });

  it('passes the chosen gender through, and null when unset', () => {
    expect(toInsertInput('id', draft({ gender: 'FEMALE' })).gender).toBe(
      'FEMALE'
    );
    expect(toInsertInput('id', draft()).gender).toBeNull();
  });
});
