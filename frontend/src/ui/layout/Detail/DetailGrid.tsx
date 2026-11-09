import { type JSX } from 'solid-js';
import styles from './DetailGrid.module.css';

/*
 * DetailGrid — the whole read-only detail form as ONE grid
 * (spec/ui-standards/detail-views), so every field's label/value line up. Two
 * label+value column-pairs: two-column rows fill both pairs (left → pair 1,
 * right → pair 2); a full-width row's value spans from the first value column
 * to the end. Because the left column and the full-width rows share the SAME
 * (first) label column, their fields align. DetailRows are `display:
 * contents`, so their label/value drop straight into this grid.
 */
export const DetailGrid = (props: { children: JSX.Element }): JSX.Element => (
  <div class={styles.grid}>{props.children}</div>
);
