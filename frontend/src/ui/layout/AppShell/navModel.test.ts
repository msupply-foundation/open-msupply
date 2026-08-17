import { describe, expect, it } from 'vitest';
import { findLeafByPath } from './navModel';

/*
 * The menu highlight is derived from the route, so these cases are about which
 * entry a URL belongs to — the list screens themselves, and the record screens
 * underneath them that have no entry of their own.
 */
describe('findLeafByPath', () => {
  it('matches a destination exactly', () => {
    expect(findLeafByPath('inventory/stocktakes')?.id).toBe(
      'inventory/stocktakes'
    );
  });

  it('keeps a record screen on the list it was reached from', () => {
    // The bug this guards: an exact match left every detail screen with no
    // entry highlighted, so opening a stocktake un-marked Stocktakes.
    expect(findLeafByPath('inventory/stocktakes/abc123')?.id).toBe(
      'inventory/stocktakes'
    );
  });

  it('matches on segment boundaries, not on a bare string prefix', () => {
    // 'inventory/stock' must not claim a stocktake's record screen.
    expect(findLeafByPath('inventory/stocktakes/abc123')?.id).not.toBe(
      'inventory/stock'
    );
  });

  it('prefers the deepest entry when destinations nest', () => {
    const deeper = findLeafByPath('inventory/stocktakes/abc123/lines');
    expect(deeper?.id).toBe('inventory/stocktakes');
  });

  it('returns nothing for a route outside the menu', () => {
    expect(findLeafByPath('nowhere/at/all')).toBeUndefined();
  });
});
