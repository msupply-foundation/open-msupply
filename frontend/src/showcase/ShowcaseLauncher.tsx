import { createSignal, For, onCleanup, Show } from 'solid-js'
import { sections } from './sections'
import { ThemeToggle } from '../components/ThemeToggle/ThemeToggle'
import styles from './ShowcaseLauncher.module.css'

/*
 * The escape hatch for full-bleed page sections. A page owns the whole viewport
 * (no surrounding showcase chrome), so this floating control is how you get back
 * to the component sections, jump between pages, and reach the theme toggle.
 * Deliberately looks like dev-tool chrome, not part of the page it floats over.
 */
export const ShowcaseLauncher = (props: { activeId: string }) => {
  const [open, setOpen] = createSignal(false)

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
  }
  window.addEventListener('keydown', onKey)
  onCleanup(() => window.removeEventListener('keydown', onKey))

  return (
    <div class={styles.root}>
      <Show when={open()}>
        <div class={styles.panel} role="dialog" aria-label="Showcase navigation">
          <div class={styles.panelHead}>
            <span class={styles.brand}>Showcase</span>
            <ThemeToggle />
          </div>
          <ul class={styles.list}>
            <For each={sections}>
              {(s) => (
                <li>
                  <a
                    href={`#/${s.id}`}
                    class={styles.link}
                    aria-current={props.activeId === s.id ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <span>{s.label}</span>
                    <Show when={s.kind === 'page'}>
                      <span class={styles.pageTag}>page</span>
                    </Show>
                  </a>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>

      <button
        type="button"
        class={styles.fab}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open()}
        aria-label="Showcase menu"
      >
        <svg
          class={styles.fabIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Showcase
      </button>
    </div>
  )
}
