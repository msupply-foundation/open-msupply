import { onCleanup, onMount, Show, type JSX } from 'solid-js';
import { MenuIcon } from '../../icons';
import { useShellNav } from '../AppShell/shellContext';
import { t } from '../../../intl';
import styles from './Header.module.css';

export interface HeaderProps {
  /**
   * The header's parts: Breadcrumb (inline-start), HeaderButtons
   * (inline-end), Toolbar (its own full-width row below) and optionally a
   * TabList as the last child (the header's bottom edge). Each part is
   * optional; they pin themselves into place via their own CSS, so the
   * header stays a flat flex-wrap container with no nested row markup.
   */
  children: JSX.Element;
}

/** Whether the labelled actions fit — see `fit` in Header. */
const fits = (header: HTMLElement, actions: HTMLElement): boolean => {
  const controls = [...actions.children].filter(
    (c): c is HTMLElement => c instanceof HTMLElement && c.offsetWidth > 0
  );
  const top = controls[0]?.getBoundingClientRect().top;
  // The cluster wrapped inside itself.
  if (controls.some(c => c.getBoundingClientRect().top !== top)) return false;
  // The cluster wrapped below the title.
  const trail = header.querySelector<HTMLElement>(':scope > nav');
  if (
    trail &&
    actions.getBoundingClientRect().top >= trail.getBoundingClientRect().bottom
  )
    return false;
  // Something on the line is truncated (the single-row header squeezes
  // rather than wraps) — the trail's crumbs, or the actions' own labels.
  const clipped = (e: Element) => e.scrollWidth > e.clientWidth + 1;
  return ![
    ...header.querySelectorAll(':scope > nav h1, :scope > nav a'),
    ...actions.querySelectorAll('[data-variant]'),
  ].some(clipped);
};

/*
 * Page header — the top strip of every page, mirroring the current app's
 * AppBar: breadcrumb top-start, page actions top-end, a per-page toolbar
 * below both. Pure layout, zero state: the page owns the crumb trail and
 * the actions, and hands them in as children. When space runs out the
 * actions first shed their labels to icons (measured — see `fit`), and only
 * then wrap below the breadcrumb (flex-wrap) — no breakpoints, per the
 * intrinsic-first responsive principle. Adapted from
 * the RnD prototype's Header. Its tab strip is ported too: a ui/Tabs
 * <TabList> rendered as the last child claims the header's bottom edge
 * (the strip's border replaces the header's own — see Header.module.css);
 * the surrounding <Tabs> root wraps the header from outside.
 *
 * Inside an AppShell, the menu-bar hamburger renders here automatically
 * (via ShellNavContext) when the nav is in overlay mode — the shell owns
 * the state, the header owns the spot. Standalone headers show none.
 */
export const Header = (props: HeaderProps) => {
  const shell = useShellNav();
  let header!: HTMLElement;

  /*
   * Labels or icons, by MEASUREMENT rather than a breakpoint: the page's
   * actions keep their labels for as long as they fit beside the title, and
   * shed them to icons (data-actions-collapsed → Button/SplitButton CSS) only
   * when they don't — so a tablet with room keeps "New shipment", while a
   * 320px scanner gets the icon. "Fit" = every action on the title's line,
   * the cluster on one line itself, and no crumb or label truncated.
   *
   * Try-then-check, synchronously: drop the flag, read the labelled layout,
   * set the flag again if it doesn't fit. Both run before the next paint, so
   * the labelled attempt is never seen.
   */
  const fit = () => {
    const actions = header.querySelector<HTMLElement>(
      ':scope > [data-header-buttons]'
    );
    delete header.dataset.actionsCollapsed;
    if (!actions || fits(header, actions)) return;
    header.dataset.actionsCollapsed = '';
  };

  onMount(() => {
    fit();
    // The PARENT's width, not the header's own box: collapsing changes the
    // header's height (a wrapped row goes away), and resizing an observed
    // element from inside its own callback is a ResizeObserver loop.
    let width = -1;
    const resize = new ResizeObserver(([entry]) => {
      const next = entry?.contentRect.width ?? -1;
      if (next === width) return;
      width = next;
      fit();
    });
    if (header.parentElement) resize.observe(header.parentElement);
    // Content changes move the line too: an action appearing, a status
    // relabelling one, the record's name loading into the trail. Attributes
    // aren't observed, so fit's own flag never re-triggers it.
    const content = new MutationObserver(fit);
    content.observe(header, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    // Labels measured in a fallback font are narrower or wider than the
    // real ones — check again once the web fonts are in.
    void document.fonts?.ready.then(fit);
    onCleanup(() => {
      resize.disconnect();
      content.disconnect();
    });
  });

  return (
    <header class={styles.header} ref={header}>
      <Show when={shell?.isOverlay()}>
        <button
          type="button"
          class={styles.hamburger}
          data-testid="mobile-nav-toggle"
          onClick={() => shell?.openNav()}
          aria-label={t('button.open-the-menu')}
        >
          <MenuIcon class={styles.hamburgerIcon} />
        </button>
      </Show>
      {props.children}
    </header>
  );
};
