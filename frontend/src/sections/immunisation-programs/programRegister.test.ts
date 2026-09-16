import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REGISTER_STATE,
  courseNames,
  programVariables,
} from './programRegister';

// Anchors: spec/immunisation-programs/acceptance.md — the program list.
//   AC-L1  only immunisation programs are listed
//   AC-L3  name ascending, case-insensitive, is the default order
//   AC-L4  the name sort reverses and is what the read carries
//   AC-L5  the name filter is a contains match
//   AC-L6  the courses column names the live courses only
//   AC-L7  a program with no course shows a blank cell
//   AC-L10 twenty to a page
// The list's rules live in pure functions, so each is pinned at the wire
// mapping the screen sends (contract.md § the program list).

const STORE = 'store-1';

describe('AC-L1 — only immunisation programs are listed', () => {
  it('forces isImmunisation: true onto every read, whatever the filter', () => {
    expect(programVariables(STORE, DEFAULT_REGISTER_STATE).filter).toEqual({
      isImmunisation: true,
    });
    expect(
      programVariables(STORE, {
        ...DEFAULT_REGISTER_STATE,
        filter: { name: { like: 'epi' } },
      }).filter
    ).toEqual({ name: { like: 'epi' }, isImmunisation: true });
  });

  it('carries the store id as auth plumbing only — never as a filter', () => {
    const variables = programVariables(STORE, DEFAULT_REGISTER_STATE);
    expect(variables.storeId).toBe(STORE);
    expect(JSON.stringify(variables.filter)).not.toContain(STORE);
  });
});

describe('AC-L3 — name ascending is the default, and is SENT', () => {
  it('sends the name sort rather than relying on the server default (id order)', () => {
    expect(programVariables(STORE, DEFAULT_REGISTER_STATE).sort).toEqual({
      key: 'name',
      desc: false,
    });
  });
});

describe('AC-L4 — reversing the sort reverses the read', () => {
  it('carries desc: true', () => {
    expect(
      programVariables(STORE, {
        ...DEFAULT_REGISTER_STATE,
        sort: { key: 'name', desc: true },
      }).sort
    ).toEqual({ key: 'name', desc: true });
  });
});

describe('AC-L5 — the name filter is a contains match', () => {
  it('sends name.like, and drops an added-but-empty chip', () => {
    expect(
      programVariables(STORE, {
        ...DEFAULT_REGISTER_STATE,
        filter: { name: { like: 'hpv' } },
      }).filter
    ).toEqual({ name: { like: 'hpv' }, isImmunisation: true });
    expect(
      programVariables(STORE, {
        ...DEFAULT_REGISTER_STATE,
        filter: { name: null },
      }).filter
    ).toEqual({ isImmunisation: true });
  });
});

describe('AC-L6 / AC-L7 — the Vaccine courses cell', () => {
  it('names the live courses, comma-separated, in the order answered', () => {
    expect(
      courseNames({
        vaccineCourses: [
          { id: 'c1', name: 'Measles' },
          { id: 'c2', name: 'MEASLES' },
        ],
      })
    ).toBe('Measles, MEASLES');
  });

  it('is blank for a program with no course — whether the server says [] or null (wire trap)', () => {
    expect(courseNames({ vaccineCourses: [] })).toBe('');
    expect(courseNames({ vaccineCourses: null })).toBe('');
  });
});

describe('AC-L10 — twenty to a page', () => {
  it('defaults to a page of 20 from offset 0, and carries the page it is given', () => {
    expect(programVariables(STORE, DEFAULT_REGISTER_STATE).page).toEqual({
      first: 20,
      offset: 0,
    });
    expect(
      programVariables(STORE, {
        ...DEFAULT_REGISTER_STATE,
        offset: 40,
        first: 20,
      }).page
    ).toEqual({ first: 20, offset: 40 });
  });
});
