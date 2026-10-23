import { describe, expect, it } from 'vitest';
import { variantVolumePerPack } from './itemVariant';

// Anchor: spec/stocktakes/cases/OMS-REG-INV-03.93 — choosing an item variant
// seeds the batch's volume per pack from the variant's packaging level that
// matches its pack size. Here we pin the pure seed: litres per unit → m³ per
// pack, and no seed (undefined, so the batch keeps its value) when nothing
// matches.

const packaging = [
  { packSize: 1, volumePerUnit: 0.5 },
  { packSize: 10, volumePerUnit: 2 },
  { packSize: 100, volumePerUnit: null },
];

describe('variantVolumePerPack', () => {
  it('converts the matching level from litres per unit to m³ per pack', () => {
    expect(variantVolumePerPack(packaging, 10)).toBeCloseTo(0.02);
    expect(variantVolumePerPack(packaging, 1)).toBeCloseTo(0.0005);
  });

  it('seeds nothing when no level has the batch pack size', () => {
    expect(variantVolumePerPack(packaging, 20)).toBeUndefined();
  });

  it('seeds nothing when the matching level has no volume', () => {
    expect(variantVolumePerPack(packaging, 100)).toBeUndefined();
  });

  it('seeds nothing for a batch with no pack size yet', () => {
    expect(variantVolumePerPack(packaging, null)).toBeUndefined();
  });
});
