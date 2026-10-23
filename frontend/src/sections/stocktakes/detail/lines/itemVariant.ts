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

// A variant as the Item variant field lists it: its id, and the packaging the
// seed above reads.
export interface VariantWithPackaging {
  id: string;
  packagingVariants: readonly VariantPackaging[];
}

// The volume per pack a line's chosen variant seeds at a given pack size,
// finding the variant in the item's visible-variant list by id. It backs both
// choosing a variant and, afterwards, correcting the pack size — the packaging
// level that matches moves with the pack size, so the seed must follow it (the
// reason a pack-size change re-applies this, per OMS-REG-INV-03.93). undefined
// — keep the batch's current volume — when the line has no variant, its variant
// isn't in the list (an auto-created barcode-only one, never shown here), or no
// packaging level matches the pack size.
export const variantVolumeForLine = (
  variants: readonly VariantWithPackaging[],
  itemVariantId: string | null | undefined,
  packSize: number | null | undefined
): number | undefined => {
  const variant = variants.find(v => v.id === itemVariantId);
  return variant
    ? variantVolumePerPack(variant.packagingVariants, packSize)
    : undefined;
};
