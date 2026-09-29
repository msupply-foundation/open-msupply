import { children, Show, type JSX } from 'solid-js';
import styles from './InsetPanel.module.css';

export interface InsetPanelProps {
  /**
   * Optional muted hint line above the panel's content (e.g. "Select filters
   * below…").
   */
  hint?: JSX.Element;
  /**
   * The panel's heading figures — facts that describe the whole group rather
   * than being one of its rows (e.g. a line editor's default pack size above
   * its demand figures). Rendered at the top of the panel, above its own
   * hairline divider, so the group's head and its rows read as one panel.
   * Renders nothing, divider included, when it resolves to nothing.
   */
  head?: JSX.Element;
  /**
   * Spacing between the panel's rows, in the Stack/HStack preset vocabulary
   * (`sm` = `--space-2`, `md` = `--space-4`, `lg` = `--space-6`). Omitted, the
   * panel keeps its own `--space-3`. `sm` suits a dense panel of read-only
   * figures or compact field rows.
   */
  gap?: 'sm' | 'md' | 'lg';
  children: JSX.Element;
  class?: string;
}

/*
 * A recessed grey panel that groups a set of related controls or content, with
 * an optional muted hint line at the top — the current app's pattern for the
 * "extra options" area inside a dialog (e.g. the stocktake create form's
 * filter / include-all block). Hand-rolled, pure CSS + tokens: no
 * interaction/a11y contract to buy, just a tinted rounded container.
 */
export const InsetPanel = (props: InsetPanelProps): JSX.Element => {
  // Resolved once — a JSX prop read twice builds two element trees
  // (kdd/solid-reactivity-pitfalls §3).
  const hint = children(() => props.hint);
  const head = children(() => props.head);
  return (
    <div
      class={props.class ? `${styles.panel} ${props.class}` : styles.panel}
      data-gap={props.gap}
    >
      <Show when={head()}>
        <div class={styles.head}>{head()}</div>
      </Show>
      <Show when={hint()}>
        <p class={styles.hint}>{hint()}</p>
      </Show>
      {props.children}
    </div>
  );
};
