import { For, Show, type JSX } from 'solid-js';
import { t } from '../../../intl';
import styles from './Breadcrumb.module.css';

export interface Crumb {
  label: string;
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
  /** Leading section icon, painted brand orange (e.g. the nav group's icon). */
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

  return (
    <nav class={styles.breadcrumb} aria-label={t('breadcrumb.label')}>
      <Show when={props.icon}>
        <span class={styles.icon} aria-hidden="true">
          {props.icon}
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
