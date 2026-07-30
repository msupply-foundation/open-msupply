import { describe, expect, it } from 'vitest';
import { itemsForMasterListHref } from './itemsListLink';

// The row-select destination (spec/master-lists S1, OMS-REG-CAT-07.32): the
// items list scoped to the master list, replacing the retired detail screen
// (spec/DIVERGENCES D80).

const decode = (href: string) =>
  JSON.parse(
    decodeURIComponent(href.slice(href.indexOf('?query=') + '?query='.length))
  ) as { filter: Record<string, unknown> };

describe('itemsForMasterListHref (spec/master-lists S1)', () => {
  it('targets the store-scoped items list with the master-list filter (CAT-07.32)', () => {
    const href = itemsForMasterListHref('store-a', 'ml-1');
    expect(href.startsWith('/store-a/catalogue/items?query=')).toBe(true);
    expect(decode(href).filter).toMatchObject({ masterListId: 'ml-1' });
  });

  // useUrlQueryState merges the URL's state SHALLOWLY over the target list's
  // defaults, so a `filter` in the URL replaces the items list's whole default
  // filter — including its `codeOrName: null` search-chip seed. Carrying the
  // seed is what keeps the search chip present on arrival; drop it and the chip
  // silently disappears when the items list is opened this way.
  it('carries the items list’s search-chip seed so the chip survives the jump', () => {
    expect(decode(itemsForMasterListHref('store-a', 'ml-1')).filter).toEqual({
      masterListId: 'ml-1',
      codeOrName: null,
    });
  });

  it('percent-encodes the query so ids with URL-significant characters survive', () => {
    const href = itemsForMasterListHref('store-a', 'ml/1&2');
    expect(href).not.toContain('ml/1&2');
    expect(decode(href).filter).toMatchObject({ masterListId: 'ml/1&2' });
  });
});
