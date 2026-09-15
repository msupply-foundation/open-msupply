import { describe, expect, it } from 'vitest';
import {
  availableVolume,
  getVolumeUsedPercentage,
  isAvailable,
  isEmpty,
  passesFullness,
  visibleLocations,
} from './volume';

// A minimal location shape for the pure volume helpers (the real node has
// more).
const loc = (
  volume: number,
  volumeUsed: number,
  totalCount: number,
  onHold = false
) => ({
  volume,
  volumeUsed,
  onHold,
  stock: { __typename: 'StockLineConnector' as const, totalCount },
});

describe('getVolumeUsedPercentage', () => {
  it('is the used-over-capacity percentage', () => {
    expect(getVolumeUsedPercentage(loc(10, 2, 5))).toBe(20);
    expect(getVolumeUsedPercentage(loc(4, 4, 1))).toBe(100);
  });

  it('can exceed 100% when over capacity', () => {
    expect(getVolumeUsedPercentage(loc(2, 3, 1))).toBe(150);
  });

  it('is undefined when capacity is 0 (nothing to be a proportion of)', () => {
    expect(getVolumeUsedPercentage(loc(0, 0, 0))).toBeUndefined();
    expect(getVolumeUsedPercentage(loc(0, 0, 3))).toBeUndefined();
  });

  it('is undefined when stock is present but volumeUsed is 0 (no volume data)', () => {
    // A misleading "0% used" would otherwise show — suppress it instead.
    expect(getVolumeUsedPercentage(loc(10, 0, 4))).toBeUndefined();
  });

  it('is a real 0% only when there is genuinely no stock', () => {
    expect(getVolumeUsedPercentage(loc(10, 0, 0))).toBe(0);
  });
});

describe('availableVolume', () => {
  it('is capacity minus used', () => {
    expect(availableVolume(loc(10, 3, 2))).toBe(7);
  });

  it('goes negative when over-full', () => {
    expect(availableVolume(loc(2, 5, 1))).toBe(-3);
  });
});

describe('isEmpty', () => {
  it('is true only when no stock is held', () => {
    expect(isEmpty(loc(10, 0, 0))).toBe(true);
    expect(isEmpty(loc(0, 0, 0))).toBe(true);
  });

  it('is false as soon as any stock is held', () => {
    expect(isEmpty(loc(10, 2, 1))).toBe(false);
    // Even stock without volume data (volumeUsed 0 but totalCount > 0) is
    // stock.
    expect(isEmpty(loc(10, 0, 3))).toBe(false);
  });
});

describe('isAvailable', () => {
  it('is true when not on hold and not full', () => {
    expect(isAvailable(loc(10, 3, 2))).toBe(true);
  });

  it('treats a location with no recorded capacity as having room', () => {
    expect(isAvailable(loc(0, 0, 0))).toBe(true);
    expect(isAvailable(loc(0, 0, 5))).toBe(true);
  });

  it('is false when full or over-full', () => {
    expect(isAvailable(loc(10, 10, 4))).toBe(false);
    expect(isAvailable(loc(10, 12, 4))).toBe(false);
  });

  it('is false when on hold, even with free space', () => {
    expect(isAvailable(loc(10, 1, 1, true))).toBe(false);
    // On hold with no recorded capacity is still unavailable.
    expect(isAvailable(loc(0, 0, 0, true))).toBe(false);
  });
});

describe('isAvailable with a required volume', () => {
  it('is true when free capacity covers the volume being placed', () => {
    expect(isAvailable(loc(10, 3, 2), 5)).toBe(true); // 7 free ≥ 5
    expect(isAvailable(loc(10, 3, 2), 7)).toBe(true); // fits exactly
  });

  it("is false when it won't fit — a large quantity in a small room", () => {
    expect(isAvailable(loc(10, 3, 2), 20)).toBe(false); // 7 free < 20
    expect(isAvailable(loc(10, 9, 1), 2)).toBe(false); // 1 free < 2
  });

  it('treats no recorded capacity as room regardless of the volume placed', () => {
    expect(isAvailable(loc(0, 0, 0), 100)).toBe(true);
  });

  it('stays false when on hold even if the volume would fit', () => {
    expect(isAvailable(loc(10, 0, 0, true), 1)).toBe(false);
  });
});

// The picker's fullness filter, and the two exemptions that stop it hiding a
// valid choice (spec/stock OMS-REG-INV-02.57). Both failure modes are silent — a location
// merely goes missing from a list — so they are asserted here rather than left
// to the widget.
const withId = (
  id: string,
  volume: number,
  volumeUsed: number,
  totalCount: number,
  onHold = false
) => ({ id, ...loc(volume, volumeUsed, totalCount, onHold) });

describe('passesFullness', () => {
  it('keeps everything under "all", exemptions irrelevant', () => {
    expect(passesFullness(withId('a', 10, 10, 5), 'all')).toBe(true);
    expect(passesFullness(withId('a', 10, 10, 5, true), 'all')).toBe(true);
  });

  it('filters on stock under "empty" and on room under "available"', () => {
    expect(passesFullness(withId('a', 10, 0, 0), 'empty')).toBe(true);
    expect(passesFullness(withId('a', 10, 2, 3), 'empty')).toBe(false);
    expect(
      passesFullness(withId('a', 10, 2, 3), 'available', { requiredVolume: 5 })
    ).toBe(true);
    expect(
      passesFullness(withId('a', 10, 2, 3), 'available', { requiredVolume: 50 })
    ).toBe(false);
  });

  it('always keeps the selected location, so a line can be re-saved unchanged', () => {
    // Full, over capacity, and on hold — selected still survives, every mode.
    const full = withId('sel', 10, 10, 5);
    const held = withId('sel', 10, 0, 0, true);
    for (const mode of ['empty', 'available'] as const) {
      expect(passesFullness(full, mode, { selectedId: 'sel' })).toBe(true);
      expect(passesFullness(held, mode, { selectedId: 'sel' })).toBe(true);
    }
  });

  // The repack bug this exemption exists for: capacity 100, volumeUsed 80 of
  // which THIS line contributes 30. Repacking all 30 back into it is a pure
  // relocation (OMS-REG-SMV-08.22), but 100 − 80 = 20 < 30, so without the exemption the
  // one location the stock certainly fits in is filtered out.
  it('keeps the location the stock is already in under "available"', () => {
    const origin = withId('orig', 100, 80, 4);
    expect(passesFullness(origin, 'available', { requiredVolume: 30 })).toBe(
      false
    );
    expect(
      passesFullness(origin, 'available', {
        requiredVolume: 30,
        originalLocationId: 'orig',
      })
    ).toBe(true);
  });

  it('exempts the origin even when it is completely full', () => {
    expect(
      passesFullness(withId('orig', 10, 10, 2), 'available', {
        originalLocationId: 'orig',
      })
    ).toBe(true);
  });

  it('does NOT exempt the origin from "empty" — it holds this stock', () => {
    expect(
      passesFullness(withId('orig', 100, 80, 4), 'empty', {
        originalLocationId: 'orig',
      })
    ).toBe(false);
  });

  it('leaves other locations unexempted', () => {
    expect(
      passesFullness(withId('other', 100, 80, 4), 'available', {
        requiredVolume: 30,
        originalLocationId: 'orig',
        selectedId: 'sel',
      })
    ).toBe(false);
  });

  it('still refuses an on-hold origin-less location under "available"', () => {
    expect(
      passesFullness(withId('a', 100, 0, 0, true), 'available', {
        originalLocationId: 'orig',
      })
    ).toBe(false);
  });
});

// The list the picker actually offers, and the field-level suppression on top
// of the filter — `fullnessFilter={false}` on a field that references a
// location without placing stock in it (a sensor's assignment, AC-P8 of
// spec/cold-chain-sensors). Such a field shows no tabs, so it must not narrow
// its options either: there would be no control on screen to explain a missing
// location.
describe('visibleLocations', () => {
  const FULL = withId('full', 10, 10, 5);
  const EMPTY = withId('empty', 10, 0, 0);
  const HELD = withId('held', 10, 0, 0, true);
  const ALL = [FULL, EMPTY, HELD];

  it('applies the chosen mode when the filter is offered', () => {
    expect(visibleLocations(ALL, 'empty')).toEqual([EMPTY, HELD]);
    expect(visibleLocations(ALL, 'available')).toEqual([EMPTY]);
  });

  it('keeps every location under "all"', () => {
    expect(visibleLocations(ALL, 'all')).toEqual(ALL);
  });

  it('honours the exemptions the mode would otherwise hide', () => {
    expect(visibleLocations(ALL, 'available', { selectedId: 'full' })).toEqual([
      FULL,
      EMPTY,
    ]);
  });

  it('offers every location when the filter is suppressed', () => {
    // Whatever mode the tab strip happens to hold: a field with no tabs can
    // never be narrowing its own list behind the user's back.
    for (const mode of ['all', 'empty', 'available'] as const) {
      expect(visibleLocations(ALL, mode, { fullnessFilter: false })).toEqual(
        ALL
      );
    }
  });

  it('filters as usual when the flag is absent or explicitly true', () => {
    expect(visibleLocations(ALL, 'empty', {})).toEqual([EMPTY, HELD]);
    expect(visibleLocations(ALL, 'empty', { fullnessFilter: true })).toEqual([
      EMPTY,
      HELD,
    ]);
  });
});
