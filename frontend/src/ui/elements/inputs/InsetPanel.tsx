import { Show, type JSX } from 'solid-js';
import styles from './InsetPanel.module.css';

export interface InsetPanelProps {
  /** Optional muted hint line above the panel's content (e.g. "Select filters below…"). */
  hint?: JSX.Element;
  children: JSX.Element;
  class?: string;
}

/*
 * A recessed grey panel that groups a set of related controls or content, with an optional
 * muted hint line at the top — the current app's pattern for the "extra options" area inside
 * a dialog (e.g. the stocktake create form's filter / include-all block). Hand-rolled, pure
 * CSS + tokens: no interaction/a11y contract to buy, just a tinted rounded container.
 */
export const InsetPanel = (props: InsetPanelProps): JSX.Element => (
  <div class={props.class ? `${styles.panel} ${props.class}` : styles.panel}>
    <Show when={props.hint}>
      <p class={styles.hint}>{props.hint}</p>
    </Show>
    {props.children}
  </div>
);
