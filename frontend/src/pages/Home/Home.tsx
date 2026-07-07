import { createSignal } from 'solid-js'
import { AppShell } from '../../components/layout/AppShell/AppShell'
import type { NavLeaf } from '../../components/layout/AppShell/navModel'
import styles from './Home.module.css'

/*
 * The real app's home page scaffold: the AppShell layout element with a plain
 * body — no showcase scaffolding, and the model for how pages are built
 * (src/pages/ imports from the library, never from src/showcase/). Until
 * routing is decided (see DECISIONS.md) the page owns nav selection itself, so
 * sidebar picks update the shell's breadcrumb; a router takes this over later.
 */
const HOME: NavLeaf = { id: 'home', label: 'Home', to: '/' }

export const Home = () => {
  const [selected, setSelected] = createSignal<NavLeaf>(HOME)

  return (
    <AppShell selected={selected()} onNavigate={setSelected}>
      <div class={styles.empty}>
        <p class={styles.emptyText}>{selected().label} — nothing here yet.</p>
      </div>
    </AppShell>
  )
}
