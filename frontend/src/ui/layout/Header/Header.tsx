import { Show, type JSX } from 'solid-js';
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

/*
 * Page header — the top strip of every page, mirroring the current app's
 * AppBar: breadcrumb top-start, page actions top-end, a per-page toolbar
 * below both. Pure layout, zero state: the page owns the crumb trail and
 * the actions, and hands them in as children. When space runs out the
 * buttons wrap intrinsically below the breadcrumb (flex-wrap) — no
 * breakpoints, per the intrinsic-first responsive principle. Adapted from
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

  return (
    <header class={styles.header}>
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
