import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { sections, categories, pagesGroup } from "./sections";
import { MenuBar, type MenuBarState } from "../ui/layout/AppShell/MenuBar";
import type { NavItem, NavLeaf } from "../ui/layout/AppShell/navModel";
import { useIsNavOverlay } from "../ui/utils/createMediaQuery";
import { MenuIcon } from "../ui/icons";
import { ThemeToggle } from "../ui/elements/buttons/ThemeToggle";
import styles from "./ShowcaseApp.module.css";

/*
 * Storybook shell: the REAL MenuBar (dogfooding the library's main menu — one
 * expandable section per category from the registry) beside a main column of
 * header strip + active section panel. Everything in src/ui-showcase/ is demo
 * scaffolding — the reusable library (src/ui/) and real pages (src/pages/)
 * never import from here, and the app only reaches it through the lazy
 * #/showcase route in src/App.tsx, so none of this ships in the app's main
 * bundle (see README.md here).
 *
 * The active section lives in the URL hash (#/showcase/buttons) so views are
 * linkable — the MenuBar's onSelect just writes the hash and a hashchange
 * listener owns the state, no routing library (routing is an undecided item;
 * see docs/DECISIONS.md conventions carried from the prototype). The "Full
 * page" group's items are top-level routes (#/home …): picking one leaves the
 * showcase for the real app; browser Back returns.
 */

/* The showcase's nav model: one expandable section per category, plus the
 * Full page group linking out to the real app's routes. */
const showcaseNav: NavItem[] = [
  ...categories.map((c) => ({
    id: c.id,
    label: c.label,
    to: `/showcase/${c.id}`,
    icon: c.icon,
    children: sections
      .filter((s) => s.category === c.id)
      .map((s) => ({ id: s.id, label: s.label, to: `/showcase/${s.id}` })),
  })),
  {
    id: pagesGroup.id,
    label: pagesGroup.label,
    to: `/${pagesGroup.links[0].id}`,
    icon: pagesGroup.icon,
    children: pagesGroup.links.map((p) => ({ id: p.id, label: p.label, to: `/${p.id}` })),
  },
];

const sectionFromHash = () => {
  const id = window.location.hash.replace(/^#\/?showcase\/?/, "");
  return sections.some((s) => s.id === id) ? id : sections[0].id;
};

export function ShowcaseApp() {
  const [activeId, setActiveId] = createSignal(sectionFromHash());

  const onHashChange = () => setActiveId(sectionFromHash());
  window.addEventListener("hashchange", onHashChange);
  onCleanup(() => window.removeEventListener("hashchange", onHashChange));

  const active = () => sections.find((s) => s.id === activeId())!;

  // The MenuBar is controlled by its host — the same state block AppShell
  // keeps for the real app (rail collapse, overlay open/close).
  const [railCollapsed, setRailCollapsed] = createSignal(false);
  const [overlayOpen, setOverlayOpen] = createSignal(false);
  const isOverlay = useIsNavOverlay();
  const nav: MenuBarState = {
    railCollapsed,
    toggleRail: () => setRailCollapsed((c) => !c),
    overlayOpen,
    openOverlay: () => setOverlayOpen(true),
    closeOverlay: () => setOverlayOpen(false),
  };
  createEffect(() => {
    if (!isOverlay()) setOverlayOpen(false);
  });

  // The hash stays the single source of truth: selecting a menu item writes
  // it, and the hashchange listener above updates the view. A Full page item
  // writes a top-level route — the app unmounts the showcase and renders the
  // real page.
  const select = (leaf: NavLeaf) => {
    const isPage = pagesGroup.links.some((p) => p.id === leaf.id);
    window.location.hash = isPage ? `#/${leaf.id}` : `#/showcase/${leaf.id}`;
  };

  return (
    <div class={styles.shell}>
      <MenuBar
        nav={nav}
        isOverlay={isOverlay()}
        upper={showcaseNav}
        selectedId={activeId()}
        onSelect={select}
      />
      <div class={styles.main}>
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
        <main class={styles.panel}>
          <h2 class={styles.sectionTitle}>{active().label}</h2>
          <Dynamic component={active().component} />
        </main>
      </div>
    </div>
  );
}
