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

  /*
   * Home is the store root, so it is the one entry whose route is the empty
   * string — and the one whose id therefore cannot be its path (an empty id
   * would leave the menu entry a nameless `nav-` for e2e).
   */
  it('highlights Home at the store root', () => {
    const home = findLeafByPath('');
    expect(home?.id).toBe('home');
    expect(home?.to).toBe('');
    expect(home?.labelKey).toBe('label.home');
  });

  it("does not let Home's empty route claim every other screen", () => {
    // The trap in a '' entry: a naive prefix test makes it match everything.
    // The `/` in the prefix check is what keeps it to the root alone.
    expect(findLeafByPath('inventory/stocktakes')?.id).not.toBe('home');
    expect(findLeafByPath('nowhere/at/all')).toBeUndefined();
  });
});
