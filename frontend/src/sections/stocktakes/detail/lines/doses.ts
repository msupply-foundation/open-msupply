// Client-side doses computation (spec/stocktakes › store-preference gates:
// "Doses are never a stored per-line fact"). Gated by manageVaccinesInDoses and
// shown for vaccine items only; there is nothing to snapshot, save, or validate
// — it is display-only, computed the same way in the detail line table (S3) and
// the line-editor Batch tab (S4), so the formula lives here once.
//
// A line's doses = number of individual vaccine doses the packs represent:
//   packs × packSize × item.doses (doses-per-unit)
// "Doses per unit" is the per-pack figure (packSize × item.doses); "Doses
// counted" applies it to the counted packs.

// The minimal shape doses needs off a line/draft (a subset of both the detail
// StocktakeLine fragment and the editor's DraftLine, so neither generated type
// leaks in here).
export interface DosesLine {
  item: { isVaccine: boolean; doses: number };
  packSize?: number | null;
  countedNumberOfPacks?: number | null;
}

// Doses in ONE pack of this line — packSize × the item's doses-per-unit. Blank
// (null) for a non-vaccine item, or when the pack size is unknown.
export const dosesPerUnit = (line: DosesLine): number | null => {
  if (!line.item.isVaccine) return null;
  const packSize = line.packSize ?? null;
  if (packSize == null) return null;
  return packSize * line.item.doses;
};

// Total doses counted on this line — counted packs × doses-per-pack. Blank
// (null) for a non-vaccine item, or before the line is counted / its pack size
// is known.
export const dosesCounted = (line: DosesLine): number | null => {
  const perUnit = dosesPerUnit(line);
  const counted = line.countedNumberOfPacks ?? null;
  if (perUnit == null || counted == null) return null;
  return counted * perUnit;
};
