// The width a column snaps to when its resize divider is DOUBLE-CLICKED — the
// Excel auto-fit gesture (issue #651). Split out of DataTable so the bounding
// rules are unit-testable without a laid-out table: the DOM measuring stays in
// DataTable (autoFitColumn — a Range per cell, the header unclamped), and the
// arithmetic over those measurements lives here.

/**
 * TanStack's own default `columnDef.minSize` — the lower bound its resize drag
 * clamps to (we deliberately don't set `minSize`; see columnTypes.ts). Auto-fit
 * honours the same floor, so a column of blank cells can't snap to a hairline
 * the user then has to hunt for.
 */
export const AUTO_FIT_MIN_PX = 20;

/**
 * The bounded auto-fit width, px.
 *
 * @param contentWidths every rendered cell's intrinsic content width in px
 *   (header + the current page's body cells + a footer cell) — what each cell
 *   would need for nothing to clip, padding included.
 * @param bounds.current the column's current size (its min-width floor), kept
 *   when there was nothing to measure — a column with no rendered cells keeps
 *   the width it has rather than collapsing.
 * @param bounds.cap the px cap the column's cells already render under (their
 *   resolved `max-width`: a per-column `maxSize`, else the table's
 *   `--table-cell-max-grow`), or `undefined` when uncapped. Auto-fit stays
 *   inside it: past the cap the cell ellipsises anyway, so fitting beyond it
 *   would buy width no content can use.
 */
export const autoFitWidth = (
  contentWidths: readonly number[],
  bounds: { current: number; cap?: number }
): number => {
  const measured = contentWidths.filter(
    width => Number.isFinite(width) && width > 0
  );
  if (measured.length === 0) return bounds.current;
  // Ceil: a fractional content width rounded DOWN clips the last pixel of the
  // widest cell — the one thing auto-fit promises not to do.
  const widest = Math.ceil(Math.max(...measured));
  const capped =
    bounds.cap != null && Number.isFinite(bounds.cap)
      ? Math.min(widest, bounds.cap)
      : widest;
  return Math.max(capped, AUTO_FIT_MIN_PX);
};
