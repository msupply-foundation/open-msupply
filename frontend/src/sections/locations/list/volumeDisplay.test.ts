import { describe, expect, it } from 'vitest';
// Import the volume module directly (not the domain/location barrel): the
// barrel re-exports the Kobalte-based pickers, which are client-only and can't
// load under node vitest.
import {
  availableVolume,
  getVolumeUsedPercentage,
} from '../../../domain/location/volume';

// AC-citing tests for the volume criteria (spec/locations/acceptance.md
// § volume) over the SHARED helpers in src/domain/location/volume.ts — the one
// rule both this vertical's list fullness display and the volume-aware
// location picker read (their own unit coverage is volume.test.ts; these pin
// the vertical's criteria against the same functions).

const loc = (volume: number, volumeUsed: number, totalCount: number) => ({
  volume,
  volumeUsed,
  stock: { __typename: 'StockLineConnector' as const, totalCount },
});

describe('AC-V2 — fullness display', () => {
  it('a non-zero volume shows the proportion used ÷ capacity', () => {
    expect(getVolumeUsedPercentage(loc(10, 2.5, 3))).toBe(25);
  });

  it('zero volume shows no proportion', () => {
    expect(getVolumeUsedPercentage(loc(0, 0, 0))).toBeUndefined();
    expect(getVolumeUsedPercentage(loc(0, 0, 5))).toBeUndefined();
  });

  it('stock present with volumeUsed 0 (no volume data) also suppresses the figure', () => {
    expect(getVolumeUsedPercentage(loc(10, 0, 4))).toBeUndefined();
  });
});

describe('AC-V3 — volume fields feed location pickers elsewhere', () => {
  // The volume-aware picker (LocationVolumeSelect) reads this vertical's
  // volume / volumeUsed / stock.totalCount through the SAME helpers: the
  // percentage rule above (identical suppression cases), and availableVolume
  // for its Available fullness mode. The picker never writes these fields —
  // AC-V1 holds across every surface (locationEdit.test.ts pins that no input
  // carries volumeUsed).
  it("the picker's % used follows the same undefined-safe rule as the list", () => {
    expect(getVolumeUsedPercentage(loc(4, 4, 1))).toBe(100);
    expect(getVolumeUsedPercentage(loc(10, 0, 4))).toBeUndefined();
    expect(getVolumeUsedPercentage(loc(0, 0, 2))).toBeUndefined();
  });

  it("the Available mode's free-space check reads volume − volumeUsed", () => {
    expect(availableVolume(loc(10, 3, 2))).toBe(7);
    expect(availableVolume(loc(2, 5, 1))).toBe(-3);
  });
});
