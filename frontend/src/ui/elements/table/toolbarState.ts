/*
 * Where the table's toolbar row and its refetch indicator render.
 *
 * Two rules that have to agree, and did not: the toolbar row is skipped when
 * it would hold nothing, and the refetch indicator falls back to floating in
 * the table area when its usual home is not rendered. Read separately, they
 * double-rendered the indicator on every table whose host lifts the controls
 * into its own chrome (PR #749 and its re-review). They live here, together
 * and pure, so the interaction is pinned by tests — the repo has no DOM test
 * environment, so the component that consumes them cannot be rendered in one.
 */

export interface ToolbarInputs {
  /** A filter bar was composed into the table. */
  hasFilters: boolean;
  /** The table is paginated, so the toolbar carries the row count. */
  hasPagination: boolean;
  /** The host takes the control cluster into its own chrome (controlsMount). */
  controlsLifted: boolean;
  /** The cluster has a control to show (sort, settings, full screen). */
  hasControls: boolean;
}

/**
 * Whether the toolbar ROW renders at all. Not when the controls are lifted
 * into a host's chrome and there is no filter bar or count to show — and not
 * when the cluster would be empty here anyway (a modal's structural line
 * table: every column fixed, no config, no full screen). An empty bar spends
 * a row and draws its bottom hairline under nothing, which reads as a double
 * line above the header.
 */
export const showsToolbarRow = (inputs: ToolbarInputs): boolean =>
  inputs.hasFilters ||
  inputs.hasPagination ||
  (!inputs.controlsLifted && inputs.hasControls);

/**
 * Where the refetch indicator goes — exactly one of:
 *
 * - `cluster`, its home, beside the icon controls. The cluster itself renders
 *   either in the toolbar row or portalled into the host's chrome, and the
 *   indicator rides along with it.
 * - `floating`, in the table area's corner, when the cluster renders NOWHERE:
 *   no toolbar row, and not lifted. Without this a search-driven modal list
 *   would refetch with no sign of it.
 *
 * Never both: two indicators on screen, and two `table-loading-inline` nodes
 * against the id contract.
 */
export const refetchIndicatorHome = (
  inputs: ToolbarInputs
): 'cluster' | 'floating' =>
  showsToolbarRow(inputs) || inputs.controlsLifted ? 'cluster' : 'floating';
