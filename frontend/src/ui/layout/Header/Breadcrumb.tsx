import { children, For, Show, type JSX } from 'solid-js';
import { t } from '../../../intl';
import { routerBase } from '../../../nav/storeRelativePath';
import { onLinkClick } from '../../utils/linkClick';
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
   * is ignored. A path starting with '/' is router-space — the same string
   * `navigate()` takes — and the crumb puts the mount in front, so the link's
   * address is a real document URL: right-click → "Open link in new tab",
   * Cmd/Ctrl-click and middle-click all work, as on any link (#271). A plain
   * click is the router's (it intercepts anchors under its base, leave guards
   * included). Anything else (the showcase's hash links) is used as it is.
   */
  to?: string;
  /**
   * Runs on a plain click instead of following `to`; with a `to`, any other
   * click is the browser's (linkClick.ts). Without a `to` the crumb has no
   * address to open elsewhere — give it one wherever there is a route.
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
/** A crumb's document href: a router-space `to` gets the mount in front. */
const crumbHref = (crumb: Crumb): string | undefined =>
  crumb.to?.startsWith('/') ? `${routerBase}${crumb.to}` : crumb.to;

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
                  <a
                    class={styles.link}
                    href={crumbHref(crumb) ?? '#'}
                    onClick={
                      crumb.onClick &&
                      (e => {
                        const href = crumbHref(crumb);
                        // No address: '#' is a placeholder, never followed.
                        if (!href) e.preventDefault();
                        onLinkClick(e, href, crumb.onClick!);
                      })
                    }
                  >
                    {crumb.label}
                  </a>
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
