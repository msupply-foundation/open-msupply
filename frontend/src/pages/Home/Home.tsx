import { createSignal, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { AppShell } from '../../components/layout/AppShell/AppShell'
import { findNavParent, type NavLeaf } from '../../components/layout/AppShell/navModel'
import { Page } from '../../components/layout/Page/Page'
import { Header } from '../../components/layout/Header/Header'
import { Breadcrumb, type Crumb } from '../../components/layout/Header/Breadcrumb'
import { HeaderButtons } from '../../components/layout/Header/HeaderButtons'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { HomeIcon, PlusCircleIcon, DownloadIcon } from '../../components/icons'

/*
 * The real app's home page scaffold, and the smallest example of the locked
 * page pattern (see DECISIONS.md 2026-07-08): AppShell is the app-level
 * container (menu + app footer), and the page composes a <Page> frame with
 * its regions — no showcase scaffolding, and NO page CSS (pages compose,
 * never style; enforced by scripts/check-page-css.mjs). The header content
 * is realistic placeholder until the real home page is designed. Until
 * routing is decided the page owns nav selection AND derives the crumb trail
 * from it; a router takes both over later (see pages/OutboundShipments for
 * the multi-view version of that role).
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
    <AppShell selected={selected()} onNavigate={setSelected}>
      <Page
        header={
          <Header>
            <Breadcrumb icon={crumbIcon()} crumbs={crumbs()} />
            <HeaderButtons>
              <Button icon={<PlusCircleIcon />}>New order</Button>
              <Button icon={<DownloadIcon />}>Export</Button>
            </HeaderButtons>
          </Header>
        }
      >
        <EmptyState message={`${selected().label} — nothing here yet.`} />
      </Page>
    </AppShell>
  )
}
