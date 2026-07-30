import { describe, expect, it } from 'vitest';
import type { Filter } from './FilterBar';
import {
  activeFilters,
  showsClearAll,
  availableFilters,
  isFilterActive,
} from './filterBarLogic';

// A stocktake-detail-shaped filter: a default (alwaysOn) search plus an addable
// location chip — the #735 arrangement.
type LineFilter = {
  itemCodeOrName?: { like?: string } | null;
  locationId?: { equalTo?: string } | null;
};

const search: Filter<LineFilter> = {
  key: 'itemCodeOrName',
  alwaysOn: true,
  label: () => 'Name',
  render: () => null,
};
const location: Filter<LineFilter> = {
  key: 'locationId',
  label: () => 'Location',
  render: () => null,
};
const filters = [search, location];

const keys = (fs: Filter<LineFilter>[]) => fs.map(f => f.key);

describe('isFilterActive', () => {
  it('shows an addable chip only while its key is present', () => {
    expect(isFilterActive(location, {})).toBe(false);
    // Present-as-null — added but empty — still a chip.
    expect(isFilterActive(location, { locationId: null })).toBe(true);
    expect(isFilterActive(location, { locationId: { equalTo: 'a' } })).toBe(
      true
    );
  });

  it('shows a default filter with no key in the filter at all', () => {
    // A URL saved before the filter was made default, or one a "Clear all"
    // stripped: the chip is a fact of the definition, not of the state.
    expect(isFilterActive(search, {})).toBe(true);
  });
});

describe('activeFilters', () => {
  it('keeps definition order and includes the default on a pristine screen', () => {
    expect(keys(activeFilters(filters, {}))).toEqual(['itemCodeOrName']);
    expect(keys(activeFilters(filters, { locationId: null }))).toEqual([
      'itemCodeOrName',
      'locationId',
    ]);
  });
});

describe('availableFilters', () => {
  it('never offers a default filter in the add menu', () => {
    expect(keys(availableFilters(filters, {}))).toEqual(['locationId']);
  });

  it('drops an addable filter once it is a chip', () => {
    expect(availableFilters(filters, { locationId: null })).toEqual([]);
  });
});

describe('showsClearAll', () => {
  it('never offers "Clear all" for default filters — empty OR valued', () => {
    expect(showsClearAll(filters, {})).toBe(false);
    expect(showsClearAll(filters, { itemCodeOrName: null })).toBe(false);
    expect(showsClearAll(filters, { itemCodeOrName: { like: 'amox' } })).toBe(
      false
    );
  });

  it('offers it as soon as a user-added chip exists, valued or not', () => {
    expect(showsClearAll(filters, { locationId: null })).toBe(true);
    expect(
      showsClearAll(filters, {
        itemCodeOrName: { like: 'amox' },
        locationId: { equalTo: 'a' },
      })
    ).toBe(true);
  });
});
