import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE } from '../../list/pageSize';
import {
  ACTIVE_ONLY_FILTER,
  buildVariables,
  cliniciansListPath,
  DEFAULT_STATE,
  genderLabelKey,
  PAGE_SIZE_OPTIONS,
  SORTABLE_KEYS,
  type CliniciansListState,
  type Gender,
} from './cliniciansListLogic';

// Logic-level coverage of the Clinicians list behaviours (spec/clinicians,
// case OMS-FUN-DIS-004). Behaviour that has a backend is validated at the
// query-shape level here; the live-backend leg (C2) and the rendered-UI/a11y
// leg (C4) are recorded as gaps in BUILD_REPORT. Tests cite the behaviour ID
// they exercise.

const state = (
  over: Partial<CliniciansListState> = {}
): CliniciansListState => ({
  ...DEFAULT_STATE,
  ...over,
});

describe('OMS-FUN-DIS-004.9 the list shows only the active store’s clinicians', () => {
  it('scopes the query to the store in the path', () => {
    const vars = buildVariables({ storeId: 'storeA', state: state() });
    expect(vars.storeId).toBe('storeA');
  });
});

describe('OMS-FUN-DIS-004.10 only active clinicians appear', () => {
  it('always sends the active-only filter', () => {
    const vars = buildVariables({ storeId: 'storeA', state: state() });
    expect(vars.filter).toEqual({ isActive: true });
    expect(ACTIVE_ONLY_FILTER).toEqual({ isActive: true });
  });

  it('keeps the active-only filter regardless of sort/paging', () => {
    const vars = buildVariables({
      storeId: 'storeA',
      state: state({ sort: [{ key: 'code', desc: true }], offset: 40 }),
    });
    expect(vars.filter?.isActive).toBe(true);
  });
});

describe('OMS-FUN-DIS-004.16 default order is last name ascending', () => {
  it('defaults sort to lastName ascending', () => {
    expect(DEFAULT_STATE.sort).toEqual([{ key: 'lastName', desc: false }]);
    const vars = buildVariables({ storeId: 'storeA', state: state() });
    expect(vars.sort).toEqual([{ key: 'lastName', desc: false }]);
  });
});

describe('OMS-FUN-DIS-004.5–.7, .15 sortable columns', () => {
  it('offers exactly code, first name, last name, initials', () => {
    expect([...SORTABLE_KEYS]).toEqual([
      'code',
      'firstName',
      'lastName',
      'initials',
    ]);
  });
});

describe('OMS-FUN-DIS-004.17 mobile and gender are not sortable', () => {
  it('excludes mobile and gender from the sortable set', () => {
    expect(SORTABLE_KEYS).not.toContain('mobile');
    // gender is not even a wire sort field; assert it is absent from the set.
    expect(SORTABLE_KEYS as readonly string[]).not.toContain('gender');
  });
});

describe('OMS-FUN-DIS-004.18 single-entry sort (wire trap: only the last honoured)', () => {
  it('sends the sort as a single-element list', () => {
    const vars = buildVariables({
      storeId: 'storeA',
      state: state({ sort: [{ key: 'code', desc: false }] }),
    });
    expect(vars.sort).toHaveLength(1);
  });
});

describe('OMS-FUN-DIS-004.20 page size options and default', () => {
  it('defaults to 20 with options 10/20/50/100', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect([...PAGE_SIZE_OPTIONS]).toEqual([10, 20, 50, 100]);
    const vars = buildVariables({ storeId: 'storeA', state: state() });
    expect(vars.page).toEqual({ first: 20, offset: 0 });
  });
});

describe('OMS-FUN-DIS-004.21 no search or filters', () => {
  it('sends no filter beyond the always-on active-only flag', () => {
    const vars = buildVariables({ storeId: 'storeA', state: state() });
    expect(Object.keys(vars.filter ?? {})).toEqual(['isActive']);
  });
});

describe('OMS-FUN-DIS-004.13 gender renders its translated label, variants collapsed', () => {
  it('maps each gender to its label key', () => {
    expect(genderLabelKey('FEMALE')).toBe('gender.female');
    expect(genderLabelKey('MALE')).toBe('gender.male');
    expect(genderLabelKey('NON_BINARY')).toBe('gender.non-binary');
    expect(genderLabelKey('TRANSGENDER')).toBe('gender.transgender');
    expect(genderLabelKey('UNKNOWN')).toBe('gender.unknown');
  });

  it('collapses the hormone/surgical transgender variants to the plain label', () => {
    const female: Gender[] = [
      'TRANSGENDER_FEMALE',
      'TRANSGENDER_FEMALE_HORMONE',
      'TRANSGENDER_FEMALE_SURGICAL',
    ];
    female.forEach(g =>
      expect(genderLabelKey(g)).toBe('gender.transgender-female')
    );
    const male: Gender[] = [
      'TRANSGENDER_MALE',
      'TRANSGENDER_MALE_HORMONE',
      'TRANSGENDER_MALE_SURGICAL',
    ];
    male.forEach(g =>
      expect(genderLabelKey(g)).toBe('gender.transgender-male')
    );
  });
});

describe('OMS-FUN-DIS-004.1 the list surface path', () => {
  it('builds the store-scoped clinicians path', () => {
    expect(cliniciansListPath('storeA')).toBe('/storeA/dispensary/clinicians');
  });
});
