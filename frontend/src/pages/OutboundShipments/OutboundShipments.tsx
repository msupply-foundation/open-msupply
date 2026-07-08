import { createSignal, Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { AppShell } from '../../components/layout/AppShell/AppShell'
import { findNavParent, type NavLeaf } from '../../components/layout/AppShell/navModel'
import { Page } from '../../components/layout/Page/Page'
import { Header } from '../../components/layout/Header/Header'
import { Breadcrumb, type Crumb } from '../../components/layout/Header/Breadcrumb'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListView } from './ListView'
import { DetailView } from './DetailView'

const OUTBOUND: NavLeaf = {
  id: 'outbound',
  label: 'Outbound Shipments',
  to: '/distribution/outbound-shipment',
}

/*
 * Host for the outbound-shipment pages — the router stand-in, and the answer
 * to "where does the main menu live?": NOT in the pages. ONE AppShell
 * (menu bar + orange app footer) mounts for the whole flow; navigating
 * list ↔ detail — or to any other menu leaf — swaps only the <Page>
 * inside it, so the menu never remounts and its state (rail collapse,
 * overlay) persists across navigation. When routing is decided this host
 * dissolves into a root layout route (owning AppShell + selected/onNavigate)
 * with the pages as child routes; ListView/DetailView don't change.
 */

/* Menu leaves with no page yet — the same scaffold as pages/Home. */
const StubPage = (props: { leaf: NavLeaf }) => {
  const parent = () => findNavParent(props.leaf.id)
  const crumbs = (): Crumb[] => {
    const leaf = { label: props.leaf.label }
    const p = parent()
    return p ? [{ label: p.label }, leaf] : [leaf]
  }

  return (
    <Page
      header={
        <Header>
          <Breadcrumb
            icon={parent() && <Dynamic component={parent()!.icon} />}
            crumbs={crumbs()}
          />
        </Header>
      }
    >
      <EmptyState message={`${props.leaf.label} — nothing here yet.`} />
    </Page>
  )
}

export const OutboundShipments = () => {
  const [selected, setSelected] = createSignal<NavLeaf>(OUTBOUND)
  const [detailReference, setDetailReference] = createSignal<string>()

  // Opening another menu leaf also closes any open detail.
  const navigate = (leaf: NavLeaf) => {
    setDetailReference(undefined)
    setSelected(leaf)
  }

  return (
    <AppShell selected={selected()} onNavigate={navigate}>
      <Show
        when={selected().id === OUTBOUND.id}
        fallback={<StubPage leaf={selected()} />}
      >
        <Show
          when={detailReference()}
          fallback={<ListView onOpen={setDetailReference} />}
        >
          {(reference) => (
            <DetailView
              reference={reference()}
              onBack={() => setDetailReference(undefined)}
            />
          )}
        </Show>
      </Show>
    </AppShell>
  )
}
