import { type JSX } from 'solid-js';
import styles from './DetailContainer.module.css';

/*
 * DetailContainer — the read-only detail-form scaffold's outer frame
 * (spec/ui-standards/detail-views). Centres the field block horizontally and
 * caps its width so a detail view never stretches edge-to-edge; children (a
 * record-name header, two-column groups, full-width rows) stack with a
 * consistent gap. Geometry only — no field styling. Mirrors the current app's
 * DetailContainer.
 */
export const DetailContainer = (props: {
  children: JSX.Element;
}): JSX.Element => (
  <div class={styles.container}>
    <div class={styles.inner}>{props.children}</div>
  </div>
);
