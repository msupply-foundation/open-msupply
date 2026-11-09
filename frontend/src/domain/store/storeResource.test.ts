import { describe, expect, it } from 'vitest';
import { storeSearchFilter } from './storeResource';

// The shared Store lookup's server filter. One module, two consumers, so the
// behaviours of both are asserted here:
//
//   spec/sync-message/cases/OMS-REG-MNG-05
//     .10 — the destination picker offers every store on the server by code
//           and name, searchable on either, and does not exclude the active
//           store
//     .14 — a message can be addressed to the active store itself (which
//           depends on .10's "excludes nothing")
//
//   spec/sites — the site editor withholds only the stores already in its
//     draft, so a store belonging to ANOTHER site stays offerable and picking
//     one MOVES it.

describe('OMS-REG-MNG-05.10 — searching', () => {
  it('searches on code OR name, in one operator', () => {
    expect(storeSearchFilter('tam')).toEqual({ codeOrName: { like: 'tam' } });
  });

  it('sends NO filter for an empty search — never an empty `like`, which the server would treat as a real substring', () => {
    expect(storeSearchFilter('')).toEqual({});
  });
});

describe('OMS-REG-MNG-05.10/.14 — excluding nothing', () => {
  it('carries no id clause when the caller names no exclusions', () => {
    expect(storeSearchFilter('tam')).not.toHaveProperty('id');
  });

  it('carries no id clause for an EMPTY exclusion list, rather than an empty notEqualAll the server would have to interpret', () => {
    expect(storeSearchFilter('tam', [])).not.toHaveProperty('id');
  });
});

describe('the site editor — withholding named stores', () => {
  it('excludes exactly the ids it is given', () => {
    expect(storeSearchFilter('tam', ['a', 'b'])).toEqual({
      codeOrName: { like: 'tam' },
      id: { notEqualAll: ['a', 'b'] },
    });
  });

  it('excludes on an empty search too — the exclusion is independent of the search', () => {
    expect(storeSearchFilter('', ['a'])).toEqual({ id: { notEqualAll: ['a'] } });
  });
});
