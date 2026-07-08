import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { sections, categories } from "./sections";
import { MenuBar, type MenuBarState } from "../components/layout/AppShell/MenuBar";
import type { NavItem, NavLeaf } from "../components/layout/AppShell/navModel";
import { useIsNavOverlay } from "../hooks/createMediaQuery";
import { MenuIcon } from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle/ThemeToggle";
import styles from "./ShowcaseApp.module.css";

/*
 * Storybook shell: the REAL MenuBar (dogfooding the library's main menu — one
 * expandable section per category from the registry) beside a main column of
 * header strip + active section panel. Everything in src/showcase/ is demo
 * scaffolding — the reusable library (src/components/, src/hooks/, src/styles/)
 * and real pages (src/pages/) never import from here. index.tsx mounts this
 * while the library is the app; the real app will take over the entry point
 * later.
 *
 * The active section lives in the URL hash (#/buttons) so views are linkable —
 * the MenuBar's onSelect just writes the hash and a hashchange listener owns
 * the state, no routing library (routing is an undecided item; see DECISIONS.md
 * conventions carried from the prototype).
 *
 * Two rendering modes, chosen by the section's `kind`:
 *   - 'component' (default): renders inside the padded panel beside the menu.
 *   - 'app': full-bleed with no showcase chrome at all — a real app page
 *     (src/pages/) exactly as a build would ship it, owning the real viewport
 *     so it can be resized/device-tested without competing chrome. Browser
 *     Back returns to the showcase.
 */

/* The showcase's nav model: one expandable section per category. */
const showcaseNav: NavItem[] = categories.map((c) => ({
  id: c.id,
  label: c.label,
  to: `/${c.id}`,
  icon: c.icon,
  children: sections
    .filter((s) => s.category === c.id)
    .map((s) => ({ id: s.id, label: s.label, to: `/${s.id}` })),
}));

const sectionFromHash = () => {
  const id = window.location.hash.replace(/^#\/?/, "");
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
  // it, and the hashchange listener above updates the view.
  const select = (leaf: NavLeaf) => {
    window.location.hash = `#/${leaf.id}`;
  };

  return (
    <Show
      when={active().kind === "app"}
      fallback={
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
      }
    >
      <div class={styles.pageCanvas}>
        <Dynamic component={active().component} />
      </div>
    </Show>
  );
}
