import { children, Show, type JSX } from 'solid-js';
import styles from './DashboardCard.module.css';

export interface DashboardCardProps {
  /** Card heading, already translated. */
  title: string;
  /**
   * Optional leading icon beside the title, rendered in the app's tinted
   * icon-chip convention (decorative — the title carries the name).
   */
  icon?: JSX.Element;
  /** Optional footer action (e.g. a create shortcut), pinned to the bottom-inline-end. */
  footer?: JSX.Element;
  /** The StatsPanel children. */
  children?: JSX.Element;
}

/*
 * One dashboard card (ui-standards § Dashboard): a titled card (<h2>) holding a
 * column of StatsPanels, with an optional footer action pinned bottom-right.
 * Hand-rolled card, pure CSS. Presentational — the section owns the data, the
 * display gates, and what (if anything) fills the footer. Lives inside a
 * CardGrid; named DashboardCard (not Widget) to stay distinct from the
 * unrelated clickable WidgetCard in ui/elements/display.
 */
export const DashboardCard = (props: DashboardCardProps) => {
  // `footer`/`icon` are lazy JSX getters read twice (the <Show> test + the
  // insertion); resolve each once so the element isn't instantiated twice
  // (kdd/solid-reactivity-pitfalls §3).
  const footer = children(() => props.footer);
  const icon = children(() => props.icon);
  return (
    <section class={styles.card}>
      <h2 class={styles.title}>
        <Show when={icon()}>
          <span class={styles.icon} aria-hidden="true">
            {icon()}
          </span>
        </Show>
        {props.title}
      </h2>
      <div class={styles.body}>{props.children}</div>
      <Show when={footer()}>
        <div class={styles.footer}>{footer()}</div>
      </Show>
    </section>
  );
};
