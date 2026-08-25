import { describe, expect, it } from 'vitest';
import type { Filter } from './FilterBar';
import {
  activeFilters,
  showsClearAll,
  availableFilters,
  isFilterActive,
} from './filterBarLogic';

// A stocktake-detail-shaped filter: the item search the screen starts with plus
// an addable location chip — the #735 arrangement, with the search now a
// DEFAULT filter by virtue of the page SEEDING its key (#563), so nothing here
// distinguishes the two definitions.
type LineFilter = {
  itemCodeOrName?: { like?: string } | null;
  locationId?: { equalTo?: string } | null;
};

const search: Filter<LineFilter> = {
  key: 'itemCodeOrName',
  label: () => 'Name',
  render: () => null,
};
const location: Filter<LineFilter> = {
  key: 'locationId',
  label: () => 'Location',
  render: () => null,
};
const filters = [search, location];
// What a page seeds as its default state: the search present, but empty.
const seeded: LineFilter = { itemCodeOrName: null };

const keys = (fs: Filter<LineFilter>[]) => fs.map(f => f.key);

describe('isFilterActive', () => {
  it('shows a chip only while its key is present', () => {
    expect(isFilterActive(location, {})).toBe(false);
    // Present-as-null — added but empty — still a chip.
    expect(isFilterActive(location, { locationId: null })).toBe(true);
    expect(isFilterActive(location, { locationId: { equalTo: 'a' } })).toBe(
      true
    );
  });

  it('shows a default filter because its key is SEEDED, not by definition', () => {
    expect(isFilterActive(search, seeded)).toBe(true);
    // Removed (or a "Clear all"): the chip goes, like any other (#563).
    expect(isFilterActive(search, {})).toBe(false);
  });
});

describe('activeFilters', () => {
  it('keeps definition order and shows the seeded default on a pristine screen', () => {
    expect(keys(activeFilters(filters, seeded))).toEqual(['itemCodeOrName']);
    expect(
      keys(activeFilters(filters, { ...seeded, locationId: null }))
    ).toEqual(['itemCodeOrName', 'locationId']);
  });
});

describe('availableFilters', () => {
  it('does not offer a filter that is already a chip', () => {
    expect(keys(availableFilters(filters, seeded))).toEqual(['locationId']);
  });

  it('offers a removed default filter back', () => {
    expect(keys(availableFilters(filters, {}))).toEqual([
      'itemCodeOrName',
      'locationId',
    ]);
  });
});

describe('showsClearAll', () => {
  it('offers "Clear all" for ANY chip on the bar — a default filter included', () => {
    expect(showsClearAll(filters, seeded)).toBe(true);
    expect(showsClearAll(filters, { itemCodeOrName: { like: 'amox' } })).toBe(
      true
    );
    expect(showsClearAll(filters, { locationId: null })).toBe(true);
  });

  it('offers nothing on an empty bar', () => {
    expect(showsClearAll(filters, {})).toBe(false);
  });
});
