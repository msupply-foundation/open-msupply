import { describe, expect, it } from 'vitest';
import { shownFilter } from './listFilters';

// Anchor: spec/encounters/rules.md § who sees which encounters (a deleted
// encounter never shows; no filter brings it back) and OMS-REG-DIS-11.9.

describe('shownFilter', () => {
  it('drops a Deleted status, so the list is not emptied by it (OMS-REG-DIS-11.9)', () => {
    expect(
      shownFilter({
        status: { equalTo: 'DELETED' },
        patient: { lastName: { like: 'Smith' } },
      })
    ).toEqual({ patient: { lastName: { like: 'Smith' } } });
  });

  it('keeps a status the list offers', () => {
    const filter = { status: { equalTo: 'PENDING' as const } };
    expect(shownFilter(filter)).toEqual(filter);
  });

  it('leaves a filter with no status as it is', () => {
    expect(shownFilter({})).toEqual({});
  });
});
