import { describe, expect, it } from 'vitest';
import { availableVolume, getVolumeUsedPercentage } from './volume';

// A minimal location shape for the pure volume helpers (the real node has more).
const loc = (volume: number, volumeUsed: number, totalCount: number) => ({
  volume,
  volumeUsed,
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

  it('goes negative when over-full (the caller compares against a requirement)', () => {
    expect(availableVolume(loc(2, 5, 1))).toBe(-3);
  });
});
