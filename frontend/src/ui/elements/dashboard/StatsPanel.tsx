import { Match, Switch, type JSX } from 'solid-js';
import { SectionTitle } from './SectionTitle';
import styles from './StatsPanel.module.css';

export type StatsPanelState = 'loading' | 'error' | 'ready';

export interface StatsPanelProps {
  /** Panel heading, already translated. */
  title: string;
  /** When set, the whole-panel title links here (the unfiltered list). */
  titleHref?: string;
  /** Optional leading icon for the title (which family this panel counts). */
  icon?: JSX.Element;
  /**
   * The state of the count query backing this panel. `loading` and `error`
   * replace the stat list in place; `ready` shows the stats (children). Each
   * panel owns this independently, so a forbidden family erroring leaves its
   * siblings untouched.
   */
  state: StatsPanelState;
  /** Message shown in the loading state (e.g. "Loading…"), already translated. */
  loadingMessage?: string;
  /** Message shown in the error state, already translated. */
  errorMessage?: string;
  /** The Statistic children, shown when ready. */
  children?: JSX.Element;
}

/*
 * A titled group of related statistics within a DashboardCard (ui-standards §
 * Dashboard), rendered as an inner elevation card. Its heading is a
 * `SectionTitle` (the iconed action-colour title) that optionally links to the
 * unfiltered list. The panel owns its own loading / error state from its count
 * query: while the query loads or fails (e.g. a Forbidden family the user
 * cannot read), that state replaces the stat list — sibling panels are
 * unaffected.
 */
export const StatsPanel = (props: StatsPanelProps) => (
  <section
    class={styles.panel}
    aria-busy={props.state === 'loading' || undefined}
  >
    <SectionTitle
      title={props.title}
      href={props.titleHref}
      icon={props.icon}
    />
    <Switch>
      <Match when={props.state === 'loading'}>
        <p class={styles.status}>{props.loadingMessage}</p>
      </Match>
      <Match when={props.state === 'error'}>
        <p class={styles.status}>{props.errorMessage}</p>
      </Match>
      <Match when={props.state === 'ready'}>
        <div class={styles.stats}>{props.children}</div>
      </Match>
    </Switch>
  </section>
);
