import { createSignal, onCleanup, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { sections } from "./showcase/sections";
import { ThemeToggle } from "./components/ThemeToggle/ThemeToggle";
import { ShowcaseLauncher } from "./showcase/ShowcaseLauncher";
import styles from "./App.module.css";

/*
 * Storybook shell: header + section nav + active section panel. The active
 * section lives in the URL hash (#/buttons) so views are linkable — plain
 * anchors + a hashchange listener, no routing library (routing is an
 * undecided item; see DECISIONS.md conventions carried from the prototype).
 *
 * Two rendering modes, chosen by the section's `kind`:
 *   - 'component' (default): renders inside the padded panel below the nav.
 *   - 'page': renders full-bleed so a whole-page layout (e.g. the app shell,
 *     with its own sidebar/header) owns the real viewport — the point being to
 *     resize/device-test it without competing chrome. The ShowcaseLauncher
 *     floats over it as the escape hatch back to the menu.
 */
const sectionFromHash = () => {
  const id = window.location.hash.replace(/^#\/?/, "");
  return sections.some((s) => s.id === id) ? id : sections[0].id;
};

function App() {
  const [activeId, setActiveId] = createSignal(sectionFromHash());

  const onHashChange = () => setActiveId(sectionFromHash());
  window.addEventListener("hashchange", onHashChange);
  onCleanup(() => window.removeEventListener("hashchange", onHashChange));

  const active = () => sections.find((s) => s.id === activeId())!;

  return (
    <Show
      when={active().kind === "page"}
      fallback={
        <div class={styles.shell}>
          <header class={styles.header}>
            <h1 class={styles.title}>Open mSupply — UI library</h1>
            <ThemeToggle />
          </header>
          <nav class={styles.nav} aria-label="Component sections">
            <ul class={styles.navList}>
              <For each={sections}>
                {(s) => (
                  <li>
                    <a href={`#/${s.id}`} aria-current={activeId() === s.id ? "page" : undefined}>
                      {s.label}
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </nav>
          <main class={styles.main}>
            <h2 class={styles.sectionTitle}>{active().label}</h2>
            <Dynamic component={active().component} />
          </main>
        </div>
      }
    >
      <div class={styles.pageCanvas}>
        <Dynamic component={active().component} />
      </div>
      <ShowcaseLauncher activeId={activeId()} />
    </Show>
  );
}

export default App;
