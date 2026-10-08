import { Match, Switch, type JSX } from 'solid-js';
import { SectionTitle } from './SectionTitle';
import styles from './StatsPanel.module.css';

interface ReadyState {
  status: 'ready';
}
interface LoadingState {
  status: 'loading';
  /**
   * Message shown while the count query loads (e.g. "Loading…"), already
   * translated.
   */
  loadingMessage: string;
}
interface ErrorState {
  status: 'error';
  /** Message shown when the count query fails, already translated. */
  errorMessage: string;
}

/**
 * The state of the count query backing a panel, as a discriminated union so a
 * message always travels with the status that needs it — you can't pass
 * `loading` without a `loadingMessage`, or `error` without an `errorMessage`.
 * `loading` and `error` replace the stat list in place; `ready` shows the stats
 * (the children). Each panel owns its own state, so a forbidden family erroring
 * leaves its siblings untouched.
 */
export type StatsPanelState = ReadyState | LoadingState | ErrorState;

export interface StatsPanelProps {
  /** Panel heading, already translated. */
  title: string;
  /** When set, the whole-panel title links here (the unfiltered list). */
  titleHref?: string;
  /** Optional leading icon for the title (which family this panel counts). */
  icon?: JSX.Element;
  /**
   * The count query's state — each message travels with its status (see
   * `StatsPanelState`).
   */
  state: StatsPanelState;
  /** e2e testid — the panel's published id (e2e/TESTIDS.md § Dashboard). */
  testId?: string;
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
    aria-busy={props.state.status === 'loading' || undefined}
    data-testid={props.testId}
  >
    <SectionTitle
      title={props.title}
      href={props.titleHref}
      icon={props.icon}
    />
    <Switch>
      <Match when={props.state.status === 'loading' && props.state}>
        {state => <p class={styles.status}>{state().loadingMessage}</p>}
      </Match>
      <Match when={props.state.status === 'error' && props.state}>
        {state => <p class={styles.status}>{state().errorMessage}</p>}
      </Match>
      <Match when={props.state.status === 'ready'}>
        <div class={styles.stats}>{props.children}</div>
      </Match>
    </Switch>
  </section>
);
