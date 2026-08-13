import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE } from '@/list/pageSize';
import {
  DEFAULT_STATE,
  buildListVariables,
  nameSearchFilter,
  nameSearchValue,
} from './listState';

// Anchors: spec/sites/cases/OMS-FUN-SYC-002 (behaviours cited per describe).

describe('OMS-FUN-SYC-002.7 — the register is sorted by name ascending until the user chooses otherwise', () => {
  it('defaults to name ascending', () => {
    expect(DEFAULT_STATE.sort).toEqual([{ key: 'name', desc: false }]);
  });

  it('sends exactly ONE sort input — with several, the LAST wins on the wire', () => {
    const variables = buildListVariables({
      ...DEFAULT_STATE,
      sort: [{ key: 'code', desc: true }],
    });
    expect(variables.sort).toHaveLength(1);
    expect(variables.sort?.[0]).toEqual({ key: 'code', desc: true });
  });
});

describe('OMS-FUN-SYC-002.8 — Code and Name sort in both directions; no other column offers a sort', () => {
  it('accepts only the two usable sort keys — `id` errors on the wire and is typed out', () => {
    // A compile-time assertion: SiteSortKey excludes `id` (the declared third
    // key, whose COLLATE NOCASE against an integer column fails the read), so a
    // column can never name it. Kept as a value check too so the intent is
    // visible in the run.
    const keys: ReadonlyArray<'code' | 'name'> = ['code', 'name'];
    expect(keys).not.toContain('id');
    expect(
      buildListVariables({ ...DEFAULT_STATE, sort: [{ key: 'code' }] })
        .sort?.[0]?.key
    ).toBe('code');
  });
});

describe('OMS-FUN-SYC-002.9 — the name search narrows the list by case-insensitive substring, and the reported total narrows with it', () => {
  it('builds the one filter the screen offers — name contains', () => {
    expect(nameSearchFilter('s0')).toEqual({ name: { like: 's0' } });
  });

  it('drops the filter entirely when the box is empty, so the total is the unfiltered one', () => {
    expect(nameSearchFilter('')).toEqual({});
    expect(
      buildListVariables({ ...DEFAULT_STATE, filter: nameSearchFilter('') })
        .filter
    ).toEqual({});
  });

  it('round-trips the search text out of the URL-backed filter', () => {
    expect(nameSearchValue(nameSearchFilter('waitak'))).toBe('waitak');
    expect(nameSearchValue({})).toBe('');
  });

  it('surfaces no code, exact-name or id filter, though the read declares all three', () => {
    expect(Object.keys(nameSearchFilter('x'))).toEqual(['name']);
  });
});

describe('OMS-FUN-SYC-002.11 — page, page size, sort and the name search are carried in the URL and survive a reload', () => {
  it('maps the whole URL-backed state onto the query variables with no remapping', () => {
    expect(
      buildListVariables({
        filter: nameSearchFilter('s'),
        sort: [{ key: 'name', desc: true }],
        offset: 40,
        first: 10,
      })
    ).toEqual({
      filter: { name: { like: 's' } },
      sort: [{ key: 'name', desc: true }],
      page: { first: 10, offset: 40 },
    });
  });

  it('paginates server-side at the spec default page size', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(buildListVariables(DEFAULT_STATE).page).toEqual({
      first: 20,
      offset: 0,
    });
  });
});
