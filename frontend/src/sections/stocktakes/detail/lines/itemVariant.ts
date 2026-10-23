// The volume per pack an item variant seeds for a batch (spec/stocktakes
// rules § volume per pack: "seeded from the chosen item variant's
// volume-per-pack where one exists but freely overridable").
//
// A variant records volume per UNIT in litres on each packaging level; a
// stocktake line records volume per PACK in m³. So the seed comes from the
// packaging level whose pack size matches the batch's, as
//   volumePerUnit (L) ÷ 1000 × packSize
// and there is none when no level matches or that level has no volume — the
// caller then keeps whatever the batch already holds.

// The packaging fields the seed reads (a subset of the generated
// PackagingVariantNode selection, so the generated type doesn't leak in here).
export interface VariantPackaging {
  packSize?: number | null;
  volumePerUnit?: number | null;
}

export const variantVolumePerPack = (
  packaging: readonly VariantPackaging[],
  packSize: number | null | undefined
): number | undefined => {
  if (packSize == null) return undefined;
  const level = packaging.find(p => p.packSize === packSize);
  if (level?.volumePerUnit == null) return undefined;
  return (level.volumePerUnit / 1000) * packSize;
};
