import type { JSX } from 'solid-js';
import styles from './ContentFooterActions.module.css';

export interface ContentFooterActionsProps {
  /** The bar's action buttons — library Button instances (blue tone). */
  children: JSX.Element;
}

/*
 * ContentFooterActions — the action cluster at the content footer's
 * inline-end (Cancel / Save, or the selection actions). The mirror of
 * HeaderButtons: a pure layout group that pins itself to the end edge with
 * an auto margin, so it lands correctly whether or not anything (History
 * button, "N selected" count) sits at the start, and hugs the same edge
 * when it wraps onto its own line.
 */
export const ContentFooterActions = (props: ContentFooterActionsProps) => (
  <div class={styles.actions}>{props.children}</div>
);
