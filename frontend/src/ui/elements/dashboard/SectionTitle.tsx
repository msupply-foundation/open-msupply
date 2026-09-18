import { children, Show, type JSX } from 'solid-js';
import { A } from '@solidjs/router';
import styles from './SectionTitle.module.css';

export interface SectionTitleProps {
  /** The heading text, already translated. */
  title: string;
  /** When set, the title links here (e.g. the unfiltered list). */
  href?: string;
  /** Optional leading icon (inherits the title's colour + sits at 1em). */
  icon?: JSX.Element;
}

/*
 * The small action-toned section heading used by the dashboard panels
 * (ui-standards § Dashboard): an optional leading icon + the title in the
 * action colour (--secondary-main), rendered as an <h3>. When `href` is set the
 * title becomes a router <A> into the unfiltered list; the icon stays outside
 * the link so it isn't part of the accessible name. Hand-rolled, pure CSS —
 * extracted from StatsPanel so the "iconed action-colour title" is one shape.
 *
 * NB the icon inherits `currentColor`, so it matches the title. Uses
 * --secondary-main — the app's blue action colour, and the library's action
 * text colour (Button/Dialog/DataTable) — matching the app's panel titles.
 */
export const SectionTitle = (props: SectionTitleProps) => {
  // Resolve the icon once — it's read by both the <Show> test and the render
  // (kdd/solid-reactivity-pitfalls §3).
  const icon = children(() => props.icon);
  return (
    <h3 class={styles.title}>
      <Show when={icon()}>
        <span class={styles.icon} aria-hidden="true">
          {icon()}
        </span>
      </Show>
      <Show when={props.href} fallback={<span>{props.title}</span>}>
        <A href={props.href!} class={styles.link}>
          {props.title}
        </A>
      </Show>
    </h3>
  );
};
