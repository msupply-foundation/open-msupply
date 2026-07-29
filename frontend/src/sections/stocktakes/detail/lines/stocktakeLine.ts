// Pure per-line count arithmetic for the stocktake detail table
// (spec/stocktakes S3). Kept as free functions — not inline accessors — so the
// two observable outcomes they drive can be pinned at the unit layer and the
// "uncounted" predicate isn't restated in three places (the difference column,
// the row tone, and the finalise-trim rule all mean the same thing: a line with
// no counted value).

// The minimal shape the count arithmetic needs — a subset of the detail
// StocktakeLine fragment, so the generated type doesn't leak in here.
export interface CountLine {
  snapshotNumberOfPacks?: number | null;
  countedNumberOfPacks?: number | null;
}

// A line is uncounted until a counted value is entered. Zero counts as counted
// (a deliberate zero is a real count, and renders in the default tone) — only a
// null/absent counted value is uncounted (OMS-REG-INV-03.68). These are the
// lines trimmed on finalise (OMS-REG-SMV-01.9).
export const isUncounted = (line: CountLine): boolean =>
  line.countedNumberOfPacks == null;

// The line's difference = counted − snapshot, or null while the line is
// uncounted (OMS-REG-INV-03.49). A missing snapshot reads as 0, so a first
// count of a brand-new batch shows its full counted quantity as the difference.
export const lineDifference = (line: CountLine): number | null => {
  const counted = line.countedNumberOfPacks;
  if (counted == null) return null;
  return counted - (line.snapshotNumberOfPacks ?? 0);
};
