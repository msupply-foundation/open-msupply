import { children, For, Show, type JSX } from 'solid-js';
import { t } from '../../../intl';
import { documentHref } from '../../../nav/storeRelativePath';
import { useShellSection } from '../AppShell/shellContext';
import styles from './Breadcrumb.module.css';

interface CrumbBase {
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
}

/**
 * A crumb that goes somewhere — every ancestor crumb in the app. Rendered as a
 * real link, so right-click → "Open link in new tab", Cmd/Ctrl-click and
 * middle-click do what the browser does with any link, and a plain click is
 * the router's (it intercepts anchors under its base, leave guards included).
 */
interface LinkCrumb extends CrumbBase {
  /**
   * Where the crumb goes, router-space — the same string `navigate()` takes;
   * the crumb puts the mount in front (crumbHref). A `#` fragment is the one
   * exception, used as it is, for a hash-routed host (the showcase). Ignored on
   * the last crumb, which is the current page and always plain text.
   */
  to?: string;
  onClick?: never;
}

/**
 * A crumb for a host with no routes to link to (a prototype swapping views in
 * local state): rendered as a button, since there is no address for a link to
 * carry. Anywhere there is a route, give the crumb its `to` instead.
 */
interface ActionCrumb extends CrumbBase {
  onClick: () => void;
  to?: never;
}

export type Crumb = LinkCrumb | ActionCrumb;

/**
 * A crumb's document href (#271): a `#` fragment as it is, anything else
 * router-space with the mount in front.
 */
export const crumbHref = (to: string): string =>
  to.startsWith('#') ? to : documentHref(to);

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
  /**
   * The record's status, shown right after the leaf on the title's line — a
   * StatusChip, or a StatusMenu where the status can be changed here (the
   * encounter screen). Part of the trail so it wraps with the title and the
   * header measures it with the crumbs; outside the leaf's <h1>, so the page's
   * name stays the record's.
   */
  status?: JSX.Element;
}

/*
 * Breadcrumb — the WAI-ARIA breadcrumb pattern: <nav aria-label> wrapping an
 * <ol>, ancestor crumbs as links, the current page marked aria-current="page".
 * The leaf renders as the page's <h1> (the page title lives in the breadcrumb
 * tail, current-app style — so pages must not render another h1; see
 * kdd/page-composition, shell integration). Separators are aria-hidden list
 * items. A `status` rides the end of the trail, after the leaf. Hand-rolled:
 * links + separators carry no interaction contract worth buying. Ported from
 * the RnD prototype's Breadcrumbs.
 */
export const Breadcrumb = (props: BreadcrumbProps) => {
  const isLast = (index: number) => index === props.crumbs.length - 1;
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
  const status = children(() => props.status);

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
                  <Show
                    when={crumb.to}
                    fallback={
                      <button
                        type="button"
                        class={`${styles.link} ${styles.action}`}
                        onClick={() => crumb.onClick?.()}
                      >
                        {crumb.label}
                      </button>
                    }
                  >
                    {to => (
                      <a class={styles.link} href={crumbHref(to())}>
                        {crumb.label}
                      </a>
                    )}
                  </Show>
                </Show>
              </li>
            </>
          )}
        </For>
      </ol>
      <Show when={status()}>
        <span class={styles.status}>{status()}</span>
      </Show>
    </nav>
  );
};
