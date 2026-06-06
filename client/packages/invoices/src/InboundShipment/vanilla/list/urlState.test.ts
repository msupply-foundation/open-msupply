import { buildFilterBy } from './urlState';

describe('buildFilterBy', () => {
  it('returns null when no filters are set', () => {
    expect(buildFilterBy({ search: '', status: [] })).toBeNull();
    expect(buildFilterBy({ search: '   ', status: [] })).toBeNull();
  });

  it('builds a name "like" filter from the search term', () => {
    expect(buildFilterBy({ search: 'acme', status: [] })).toEqual({
      otherPartyName: { like: 'acme' },
    });
  });

  it('builds an equalAny status filter', () => {
    expect(
      buildFilterBy({ search: '', status: ['NEW', 'DELIVERED'] })
    ).toEqual({ status: { equalAny: ['NEW', 'DELIVERED'] } });
  });

  it('combines search and status', () => {
    expect(buildFilterBy({ search: 'acme', status: ['NEW'] })).toEqual({
      otherPartyName: { like: 'acme' },
      status: { equalAny: ['NEW'] },
    });
  });
});
