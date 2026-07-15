import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { sections, categories } from './sections';
import { MenuBar, type MenuBarState } from '../ui/layout/AppShell/MenuBar';
import { ShellFullScreenContext } from '../ui/layout/AppShell/shellContext';
import type { NavItem, NavLeaf } from '../ui/layout/AppShell/navModel';
import type { LocaleKey } from '../intl';
import { useIsNavOverlay } from '../ui/utils/createMediaQuery';
import { MenuIcon } from '../ui/icons';
import { ThemeToggle } from '../ui/elements/buttons/ThemeToggle';
import styles from './ShowcaseApp.module.css';

/*
 * Storybook shell: the REAL MenuBar (dogfooding the library's main menu — one
 * expandable section per category from the registry) beside a main column of
 * header strip + active section panel. Everything in src/ui-showcase/ is demo
 * scaffolding — the reusable library (src/ui/) and the app never import from
 * here; the ONLY entry is the dev-only #/showcase branch in src/index.tsx,
 * which is dead-code-eliminated from production builds (see README.md here).
 *
 * The active section lives in the URL hash (#/showcase/buttons) so views are
 * linkable — the MenuBar's onSelect just writes the hash and a hashchange
 * listener owns the state, no routing library (the app's real router is not
 * in play here; see kdd/showcase-harness).
 */

/* The showcase's nav model: one expandable section per category. MenuBar
 * resolves labelKey through t(), which falls back to the key itself for
 * unknown keys — so passing our literal section labels as "keys" renders
 * them verbatim. Dev-only scaffolding; the cast stays contained here. */
const showcaseNav: NavItem[] = categories.map(c => ({
  id: c.id,
  labelKey: c.label as LocaleKey,
  to: `/showcase/${c.id}`,
  icon: c.icon,
  children: sections
    .filter(s => s.category === c.id)
    .map(s => ({
      id: s.id,
      labelKey: s.label as LocaleKey,
      to: `/showcase/${s.id}`,
    })),
}));

const sectionFromHash = () => {
  const id = window.location.hash.replace(/^#\/?showcase\/?/, '');
  return sections.some(s => s.id === id) ? id : sections[0].id;
};

export function ShowcaseApp() {
  const [activeId, setActiveId] = createSignal(sectionFromHash());

  const onHashChange = () => setActiveId(sectionFromHash());
  window.addEventListener('hashchange', onHashChange);
  onCleanup(() => window.removeEventListener('hashchange', onHashChange));

  const active = () => sections.find(s => s.id === activeId())!;

  // The MenuBar is controlled by its host — the same state block AppShell
  // keeps for the real app (rail collapse, overlay open/close).
  const [railCollapsed, setRailCollapsed] = createSignal(false);
  const [overlayOpen, setOverlayOpen] = createSignal(false);
  const [fullScreen, setFullScreen] = createSignal(false);
  const isOverlay = useIsNavOverlay();
  const nav: MenuBarState = {
    railCollapsed,
    toggleRail: () => setRailCollapsed(c => !c),
    overlayOpen,
    openOverlay: () => setOverlayOpen(true),
    closeOverlay: () => setOverlayOpen(false),
  };
  createEffect(() => {
    if (!isOverlay()) setOverlayOpen(false);
  });

  // The hash stays the single source of truth: selecting a menu item writes
  // it, and the hashchange listener above updates the view.
  const select = (leaf: NavLeaf) => {
    window.location.hash = `#/showcase/${leaf.id}`;
  };

  return (
    // Provide the same shell-level full-screen context the real AppShell does, so a
    // section that's a real page (Table) full-screens properly — the showcase chrome
    // (menu + header strip) hides and the page's footer/pagination/selection stay.
    <ShellFullScreenContext.Provider
      value={{ isFullScreen: fullScreen, setFullScreen }}
    >
      <div class={styles.shell}>
        <Show when={!fullScreen()}>
          <MenuBar
            nav={nav}
            isOverlay={isOverlay()}
            upper={showcaseNav}
            selectedId={activeId()}
            onSelect={select}
          />
        </Show>
        <div class={styles.main}>
          <Show when={!fullScreen()}>
            <header class={styles.header}>
              {/* No library Header here (that's a page-region component), so
                  the shell renders its own overlay hamburger. */}
              <Show when={isOverlay()}>
                <button
                  type="button"
                  class={styles.hamburger}
                  onClick={nav.openOverlay}
                  aria-label="Open section menu"
                  aria-expanded={overlayOpen()}
                >
                  <MenuIcon />
                </button>
              </Show>
              <h1 class={styles.title}>Open mSupply — UI library</h1>
              <ThemeToggle />
            </header>
          </Show>
          <main
            class={`${styles.panel} ${active().fill ? styles.panelFill : ''}`}
          >
            {/* A fill section (e.g. Table) is a real full-height page that owns the whole
                region — no section title, no panel padding/scroll. */}
            <Show when={!active().fill}>
              <h2 class={styles.sectionTitle}>{active().label}</h2>
            </Show>
            <Dynamic component={active().component} />
          </main>
        </div>
      </div>
    </ShellFullScreenContext.Provider>
  );
}
