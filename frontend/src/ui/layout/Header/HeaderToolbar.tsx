import type { JSX } from 'solid-js';
import { Toolbar } from './Toolbar';
import styles from './HeaderToolbar.module.css';

export interface HeaderToolbarProps {
  /**
   * The header's field cluster — inputs and read-only LabelledValues. Each is
   * one cell of a CSS grid, so columns line up across rows when the cluster
   * wraps.
   */
  children?: JSX.Element;
  /**
   * Optional <Alert>(s) stating the record's standing context. Rendered on its
   * own line BELOW the field grid — a full-width Alert spans the strip, a
   * `compact` one hugs its content at the inline start. Pass a fragment for
   * more than one and they stack.
   */
  alert?: JSX.Element;
  /**
   * How the fields divide the strip — the standard's per-screen `--cols`:
   *  - omitted (default) — `repeat(auto-fill, minmax(minFieldWidth, 1fr))`.
   *    Fields take one track each and pack from the inline start, so a header
   *    with two or three of them keeps them field-sized instead of stretching
   *    each to half or a third of the strip. Tracks only grow once there are
   *    enough fields to fill the row.
   *  - `'equal'` — `repeat(auto-fit, …)`: every field shares the full width
   *  (the
   *    standard's `repeat(N, 1fr)`), for a field-heavy header meant to span the
   *    strip.
   *  - `'content'` — each field only as wide as its data (the standard's
   *    content-width option), for a cluster of short read-only facts.
   *  - any CSS `grid-template-columns` string — e.g. `'2fr 1fr'` for the
   *    standard's weighted case, where one field needs the width and the rest
   *    don't.
   */
  columns?: 'equal' | 'content' | string;
  /**
   * The min inline size a field keeps before the grid drops a column. Any CSS
   * length; default `15rem`. Unused by `content` and by an explicit template.
   */
  minFieldWidth?: string;
}

/*
 * HeaderToolbar — the page-header field cluster (Carl 2026-07-27), built on
 * the header standard's Tier-2 meta strip: the standard's `.fields` grid
 * (per-screen `--cols`) and its `.info-box`.
 *
 * A grid (not a wrapping flex row) because the standard buys one thing with it
 * that flex can't: columns that line up across rows when the cluster wraps.
 * Cells are top-aligned, so every field label lands on one line — which is why
 * a read-only LabelledValue takes the control's footprint here (the standard's
 * `.ro`, opted into with --labelled-value-control-block-size), or its bare
 * value would sit up on its neighbours' label line.
 *
 * One deliberate deviation from the standard (Brian 2026-07-28): the alert
 * gets its own line under the grid rather than riding the field row's inline
 * end. Sharing that row lets flexbox decide, from the MESSAGE LENGTH, whether
 * the chip wraps or the grid loses columns — and it always narrows the grid,
 * so a wordy message folds four fields into 2×2 and the worst layout varies by
 * locale. See HeaderToolbar.module.css.
 *
 * The generic <Toolbar> stays layout-only for its other uses (a list FilterBar,
 * a stub); this composes it for the detail/header field case. Demoed on the
 * Header showcase (the Detail-table page uses it too).
 */
export const HeaderToolbar = (props: HeaderToolbarProps) => {
  const min = () => props.minFieldWidth ?? '15rem';
  // `content` can't be a track template: auto-fill rejects an intrinsic track
  // size, and a bare `max-content` would be ONE column that stacks the fields.
  // It's a wrapping flex row instead (CSS below) — correct here, since
  // content-sized cells have no columns to line up across rows anyway.
  const cols = () => {
    if (props.columns === 'content') return undefined;
    if (props.columns === 'equal')
      return `repeat(auto-fit, minmax(${min()}, 1fr))`;
    return props.columns ?? `repeat(auto-fill, minmax(${min()}, 1fr))`;
  };

  return (
    <Toolbar>
      <div class={styles.strip}>
        <div
          class={styles.fields}
          data-columns={props.columns === 'content' ? 'content' : undefined}
          style={{ '--header-field-cols': cols() }}
        >
          {props.children}
        </div>
        {props.alert}
      </div>
    </Toolbar>
  );
};
