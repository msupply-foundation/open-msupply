import { children, For, Show, type JSX } from 'solid-js';
import { t } from '../../../intl';
import { ChevronLeftIcon } from '../../icons';
import { useShellSection } from '../AppShell/shellContext';
import styles from './Breadcrumb.module.css';

export interface Crumb {
  label: string;
  /**
   * A marker for THIS crumb, rendered immediately before its label — the
   * record-kind glyph a screen's own surface calls for (the inbound shipment
   * detail's truck/house before the shipment number). Distinct from the trail's
   * leading `icon`, which is the section, not the record. The page tones it
   * (icons paint with `currentColor`); it is decorative, so it stays
   * `aria-hidden` and the leaf's <h1> keeps the label as its accessible name.
   */
  icon?: JSX.Element;
  /**
   * Link target for ancestor crumbs (navigate back up the trail). The last
   * crumb is the current page and always renders as plain text, so its `to`
   * is ignored. Until routing is decided these are plain hrefs (the
   * showcase uses hash links); a router makes them real routes later.
   */
  to?: string;
  /**
   * Interim navigation for pages that swap views with local state (list ↔
   * detail) while routing is undecided: renders the crumb as a link and runs
   * the callback instead of following `to`. A router replaces these with
   * real routed hrefs later.
   */
  onClick?: () => void;
}

export interface BreadcrumbProps {
  /**
   * Leading icon, painted brand orange. Optional because inside the app shell
   * the trail already shows the current route's SECTION glyph (the nav group's
   * icon — see the shell-section bridge below); pass one only to override that
   * with a screen-specific glyph.
   */
  icon?: JSX.Element;
  /** The trail, root first, current page last. The page owns this data. */
  crumbs: Crumb[];
}

/*
 * Breadcrumb — the WAI-ARIA breadcrumb pattern: <nav aria-label> wrapping an
 * <ol>, ancestor crumbs as links, the current page marked aria-current="page".
 * The leaf renders as the page's <h1> (the page title lives in the breadcrumb
 * tail, current-app style — so pages must not render another h1; see
 * kdd/page-composition, shell integration). Separators are aria-hidden list
 * items. Hand-rolled: links + separators carry no interaction contract worth
 * buying. Ported from the RnD prototype's Breadcrumbs.
 */
export const Breadcrumb = (props: BreadcrumbProps) => {
  const isLast = (index: number) => index === props.crumbs.length - 1;
  /*
   * The immediate parent — where "up one level" goes (KB-X5's destination, and
   * on a touch device the only visible way off a detail screen). It alone gets
   * the back marker; crumbs further up the trail stay plain links, so the
   * marker keeps meaning "out of here" rather than "this is a link".
   */
  const isParent = (index: number) => index === props.crumbs.length - 2;
  // The nav group's glyph for the current route, supplied by the shell — every
  // page in the shell shows one without asking (shellContext › ShellSection).
  const section = useShellSection();
  const sectionIcon = () => {
    const Icon = section?.icon();
    return Icon ? <Icon /> : undefined;
  };
  // Resolved once — a JSX prop read twice builds two element trees
  // (kdd/solid-reactivity-pitfalls §3).
  const icon = children(() => props.icon ?? sectionIcon());

  return (
    <nav class={styles.breadcrumb} aria-label={t('label.breadcrumb')}>
      <Show when={icon()}>
        <span class={styles.icon} aria-hidden="true">
          {icon()}
        </span>
      </Show>
      <ol class={styles.list}>
        <For each={props.crumbs}>
          {(crumb, index) => (
            <>
              <Show when={index() > 0}>
                <li class={styles.separator} aria-hidden="true">
                  /
                </li>
              </Show>
              <li class={styles.crumb}>
                {/* The crumb's own marker, before its label — outside the
                    link/heading so it never joins their accessible name. */}
                <Show when={crumb.icon}>
                  <span class={styles.crumbIcon} aria-hidden="true">
                    {crumb.icon}
                  </span>
                </Show>
                <Show
                  when={(crumb.to || crumb.onClick) && !isLast(index())}
                  fallback={
                    <Show
                      when={isLast(index())}
                      fallback={<span>{crumb.label}</span>}
                    >
                      <h1 class={styles.leaf} aria-current="page">
                        {crumb.label}
                      </h1>
                    </Show>
                  }
                >
                  <a
                    class={styles.link}
                    href={crumb.to ?? '#'}
                    onClick={
                      crumb.onClick &&
                      (e => {
                        e.preventDefault();
                        crumb.onClick!();
                      })
                    }
                  >
                    {/* Inside the link, not beside it: the marker is part of
                        the thing you press, so it grows the tap target instead
                        of sitting next to it as dead pixels. It carries the
                        icon set's own aria-hidden, so the link's accessible
                        name stays the label alone. */}
                    <Show when={isParent(index())}>
                      <ChevronLeftIcon class={styles.backChevron} />
                    </Show>
                    {crumb.label}
                  </a>
                </Show>
              </li>
            </>
          )}
        </For>
      </ol>
    </nav>
  );
};
