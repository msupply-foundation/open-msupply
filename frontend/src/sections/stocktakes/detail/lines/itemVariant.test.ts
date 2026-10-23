import { describe, expect, it } from 'vitest';
import { variantVolumeForLine, variantVolumePerPack } from './itemVariant';

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

// Anchor: spec/stocktakes/cases/OMS-REG-INV-03.93 — the volume seed is re-read
// at the batch's current pack size, so correcting the pack size after a variant
// is chosen re-seeds the volume (not leaving the one worked out for the old pack
// size). The same lookup also powers "nothing to re-seed from" cases.
const variants = [
  {
    id: 'v1',
    packagingVariants: [
      { packSize: 5, volumePerUnit: 4 },
      { packSize: 10, volumePerUnit: 4 },
    ],
  },
];

describe('variantVolumeForLine', () => {
  it('re-seeds the volume at the new pack size when the pack size changes', () => {
    // Chosen at pack size 5 → 4 ÷ 1000 × 5 = 0.02; corrected to 10 → 0.04.
    expect(variantVolumeForLine(variants, 'v1', 5)).toBeCloseTo(0.02);
    expect(variantVolumeForLine(variants, 'v1', 10)).toBeCloseTo(0.04);
  });

  it('keeps the volume (undefined) when no level matches the new pack size', () => {
    expect(variantVolumeForLine(variants, 'v1', 20)).toBeUndefined();
  });

  it('keeps the volume when the line has no variant', () => {
    expect(variantVolumeForLine(variants, null, 5)).toBeUndefined();
  });

  it('keeps the volume when the variant is not in the list (auto-created)', () => {
    // An auto-created barcode-only variant never appears in the item's variant
    // list, so there is nothing to re-seed from and the batch's volume stands.
    expect(variantVolumeForLine(variants, 'auto', 5)).toBeUndefined();
  });
});
