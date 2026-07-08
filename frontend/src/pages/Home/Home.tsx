import { createSignal, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { AppShell } from '../../components/layout/AppShell/AppShell'
import { findNavParent, type NavLeaf } from '../../components/layout/AppShell/navModel'
import { Header } from '../../components/layout/Header/Header'
import { Breadcrumb, type Crumb } from '../../components/layout/Header/Breadcrumb'
import { HeaderButtons } from '../../components/layout/Header/HeaderButtons'
import { Toolbar } from '../../components/layout/Header/Toolbar'
import { Button } from '../../components/ui/Button'
import { HomeIcon, PlusCircleIcon, DownloadIcon } from '../../components/icons'
import styles from './Home.module.css'

/*
 * The real app's home page scaffold: the AppShell layout element with a plain
 * body — no showcase scaffolding, and the model for how pages are built
 * (src/pages/ imports from the library, never from src/showcase/). The page
 * composes its own <Header> and hands it to the shell; the header content is
 * realistic placeholder until the real home page is designed. Until routing
 * is decided (see DECISIONS.md) the page owns nav selection AND derives the
 * crumb trail from it; a router takes both over later.
 */
const HOME: NavLeaf = { id: 'home', label: 'Home', to: '/' }

export const Home = () => {
  const [selected, setSelected] = createSignal<NavLeaf>(HOME)
  const parent = () => findNavParent(selected().id)
  const crumbs = (): Crumb[] => {
    const leaf = { label: selected().label }
    const p = parent()
    return p ? [{ label: p.label }, leaf] : [leaf]
  }
  // The nav section's icon once you navigate; the house on Home itself.
  const crumbIcon = (): JSX.Element => {
    const p = parent()
    if (p) return <Dynamic component={p.icon} />
    return selected().id === HOME.id ? <HomeIcon /> : undefined
  }

  return (
    <AppShell
      selected={selected()}
      onNavigate={setSelected}
      header={
        <Header>
          <Breadcrumb icon={crumbIcon()} crumbs={crumbs()} />
          <HeaderButtons>
            <Button icon={<PlusCircleIcon />}>New order</Button>
            <Button icon={<DownloadIcon />}>Export</Button>
          </HeaderButtons>
          <Toolbar>
            <span class={styles.toolbarStub}>Toolbar</span>
          </Toolbar>
        </Header>
      }
    >
      <div class={styles.empty}>
        <p class={styles.emptyText}>{selected().label} — nothing here yet.</p>
      </div>
    </AppShell>
  )
}
