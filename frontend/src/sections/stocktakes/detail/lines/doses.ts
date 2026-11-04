// Client-side doses computation (spec/stocktakes › store-preference gates:
// "Doses are never a stored per-line fact"). Gated by manageVaccinesInDoses and
// shown for vaccine items only; there is nothing to snapshot, save, or validate
// — it is display-only, computed the same way in the detail line table (S3) and
// the line-editor Batch tab (S4), so the formula lives here once.
//
// A line's doses = number of individual vaccine doses the packs represent:
//   packs × packSize × item.doses (doses-per-unit)
// "Doses per unit" is the item's own doses per unit (old-app parity — its
// itemDoses column; spec rules § store-preference gates: "the item's configured
// doses-per-unit"), NOT a per-pack figure; "Doses counted" applies it, through
// the pack size, to the counted packs.

// The minimal shape doses needs off a line/draft (a subset of both the detail
// StocktakeLine fragment and the editor's DraftLine, so neither generated type
// leaks in here).
export interface DosesLine {
  item: { isVaccine: boolean; doses: number };
  packSize?: number | null;
  countedNumberOfPacks?: number | null;
}

// Doses in ONE unit of the item — the item's doses-per-unit, whatever the
// line's pack size. Blank (null) for a non-vaccine item. A vaccine with no
// doses-per-unit configured counts as 1 (spec/stocktakes › store-preference
// gates, D58) — treating it as 0 would pin doses counted at 0 regardless of
// what's counted, matching internal-orders' same-shaped fallback.
export const dosesPerUnit = (line: DosesLine): number | null =>
  line.item.isVaccine ? line.item.doses || 1 : null;

// Total doses counted on this line — counted packs × pack size × doses per
// unit. Blank (null) for a non-vaccine item, or before the line is counted /
// its pack size is known.
export const dosesCounted = (line: DosesLine): number | null => {
  const perUnit = dosesPerUnit(line);
  const packSize = line.packSize ?? null;
  const counted = line.countedNumberOfPacks ?? null;
  if (perUnit == null || packSize == null || counted == null) return null;
  return counted * packSize * perUnit;
};
