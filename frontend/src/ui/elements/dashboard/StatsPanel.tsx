import { Match, Show, Switch, type JSX } from 'solid-js';
import { A } from '@solidjs/router';
import { Alert } from '../feedback/Alert';
import styles from './StatsPanel.module.css';

export type StatsPanelState = 'loading' | 'error' | 'ready';

export interface StatsPanelProps {
  /** Panel heading, already translated. */
  title: string;
  /** When set, the whole-panel title links here (the unfiltered list). */
  titleHref?: string;
  /**
   * The state of the count query backing this panel. `loading` and `error`
   * replace the stat list in place; `ready` shows the stats (children). Each
   * panel owns this independently, so a forbidden family erroring leaves its
   * siblings untouched.
   */
  state: StatsPanelState;
  /** Message shown in the error state, already translated. */
  errorMessage?: string;
  /** The Statistic children, shown when ready. */
  children?: JSX.Element;
}

/*
 * A titled group of related statistics within a Widget (ui-standards §
 * Dashboard). The title (<h3>) optionally links to the unfiltered list. The
 * panel owns its own loading / error state from its count query: while the query
 * loads or fails (e.g. a Forbidden family the user cannot read), that state
 * replaces the stat list — sibling panels are unaffected.
 */
export const StatsPanel = (props: StatsPanelProps) => (
  <section
    class={styles.panel}
    aria-busy={props.state === 'loading' || undefined}
  >
    <h3 class={styles.title}>
      <Show when={props.titleHref} fallback={props.title}>
        <A href={props.titleHref!} class={styles.titleLink}>
          {props.title}
        </A>
      </Show>
    </h3>
    <Switch>
      <Match when={props.state === 'loading'}>
        <div class={styles.loading} aria-hidden="true">
          <span class={styles.skeleton} />
          <span class={styles.skeleton} />
          <span class={styles.skeleton} />
        </div>
      </Match>
      <Match when={props.state === 'error'}>
        <Alert severity="error">{props.errorMessage}</Alert>
      </Match>
      <Match when={props.state === 'ready'}>
        <div class={styles.stats}>{props.children}</div>
      </Match>
    </Switch>
  </section>
);
