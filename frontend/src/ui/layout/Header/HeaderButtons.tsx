import type { JSX } from 'solid-js';
import styles from './HeaderButtons.module.css';

export interface HeaderButtonsProps {
  /**
   * The page's end-area content — usually its actions (library Button /
   * SplitButton instances), but any content the page pins to the header's
   * inline-end (e.g. the utility pages' read-only LabelledValue).
   */
  children: JSX.Element;
}

/*
 * HeaderButtons — the cluster at the header's inline-end (the current app's
 * AppBarButtons slot), usually the page's actions. A pure layout group: the
 * page owns the content and its handlers. Pins itself to the end edge with an
 * auto margin, so it lands correctly even with no breadcrumb beside it, and
 * hugs the same edge when it wraps onto its own line.
 */
export const HeaderButtons = (props: HeaderButtonsProps) => (
  <div class={styles.buttons}>{props.children}</div>
);
