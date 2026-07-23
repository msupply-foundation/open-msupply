import { describe, expect, it } from 'vitest';
import {
  availableVolume,
  getVolumeUsedPercentage,
  isAvailable,
  isEmpty,
} from './volume';

// A minimal location shape for the pure volume helpers (the real node has more).
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
    // Even stock without volume data (volumeUsed 0 but totalCount > 0) is stock.
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
