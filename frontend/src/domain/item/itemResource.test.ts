import { describe, expect, it } from 'vitest';
import { presencePatch } from './itemResource';

describe('presencePatch — already-on-document option marking', () => {
  // OMS-REG-INV-03.78 — an item already on the stocktake is marked in the
  // "Add item" results; an item not on it carries no marker.
  it('marks probe hits true and the rest of the probed page false (INV-03.78)', () => {
    expect(presencePatch(['a', 'b', 'c'], ['b'])).toEqual({
      a: false,
      b: true,
      c: false,
    });
  });

  // Re-probing a page must CLEAR a mark that no longer holds (the item's
  // lines were deleted since) — every probed id gets an explicit value, so
  // merging the patch overwrites a stale true rather than leaving it stuck.
  it('re-probe clears a stale mark (explicit false, not absence)', () => {
    const first = presencePatch(['a', 'b'], ['a', 'b']);
    const second = presencePatch(['a', 'b'], ['b']);
    expect({ ...first, ...second }).toEqual({ a: false, b: true });
  });

  // A probe answer never marks ids outside its probed page — an id the server
  // returns that wasn't asked about (defensive; keeps the map page-scoped).
  it('ignores present ids outside the probed page', () => {
    expect(presencePatch(['a'], ['a', 'zzz'])).toEqual({ a: true });
  });
});
