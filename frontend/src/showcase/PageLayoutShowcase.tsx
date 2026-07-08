import { createSignal, For } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { AppShell } from '../components/layout/AppShell/AppShell'
import { findNavParent, type NavLeaf } from '../components/layout/AppShell/navModel'
import { Header } from '../components/layout/Header/Header'
import { Breadcrumb, type Crumb } from '../components/layout/Header/Breadcrumb'
import { HeaderButtons } from '../components/layout/Header/HeaderButtons'
import { Toolbar } from '../components/layout/Header/Toolbar'
import { Button } from '../components/ui/Button'
import { SplitButton } from '../components/ui/SplitButton'
import { PlusCircleIcon, DownloadIcon } from '../components/icons'
import styles from './PageLayoutShowcase.module.css'

/* Deterministic placeholder rows — enough to make the body scroll. */
const STATUSES = [
  { label: 'New', color: 'var(--gray-main)' },
  { label: 'Picked', color: 'var(--color-warning)' },
  { label: 'Shipped', color: 'var(--secondary-main)' },
  { label: 'Delivered', color: 'var(--primary-main)' },
]
const CUSTOMERS = [
  'Buka Rural Hospital',
  'Arawa Health Centre',
  'Kokopo District Store',
  'Wewak Provincial Hospital',
  'Mount Hagen Clinic',
  'Lae Urban Aid Post',
]

const ROWS = Array.from({ length: 16 }, (_, i) => ({
  reference: `OS-${(1024 + i).toString().padStart(6, '0')}`,
  customer: CUSTOMERS[i % CUSTOMERS.length],
  status: STATUSES[i % STATUSES.length],
  items: 3 + ((i * 7) % 22),
  created: `2026-07-${(1 + (i % 28)).toString().padStart(2, '0')}`,
}))

const EXPORT_OPTIONS = [
  { value: 'csv', label: 'Export CSV' },
  { value: 'excel', label: 'Export Excel' },
]

/*
 * Demonstrates the AppShell layout element as a full page — the Outbound
 * Shipments demo. It's rendered full-bleed by the showcase (kind: 'page');
 * resize the window to watch the docked sidebar become a hamburger overlay
 * at the navOverlay breakpoint (the hamburger appears inside the page
 * header, via ShellNavContext). The showcase owns the demo's nav selection
 * (AppShell is controlled) and derives the header breadcrumb from it — in
 * the real app a router plays both roles (see pages/Home for the
 * showcase-free usage). The header buttons and toolbar stay the Outbound
 * Shipments set while you navigate; a real app swaps the whole Header per
 * page.
 */
const DEMO_START: NavLeaf = {
  id: 'outbound',
  label: 'Outbound Shipments',
  to: '/distribution/outbound-shipment',
}

export const PageLayoutShowcase = () => {
  const [selected, setSelected] = createSignal<NavLeaf>(DEMO_START)
  const parent = () => findNavParent(selected().id)
  const crumbs = (): Crumb[] => {
    const leaf = { label: selected().label }
    const p = parent()
    return p ? [{ label: p.label }, leaf] : [leaf]
  }

  return (
    <AppShell
      selected={selected()}
      onNavigate={setSelected}
      header={
        <Header>
          <Breadcrumb
            icon={parent() && <Dynamic component={parent()!.icon} />}
            crumbs={crumbs()}
          />
          <HeaderButtons>
            <Button icon={<PlusCircleIcon />}>New shipment</Button>
            <SplitButton
              icon={<DownloadIcon />}
              options={EXPORT_OPTIONS}
              menuLabel="Export options"
            />
          </HeaderButtons>
          <Toolbar>
            <div class={styles.toolbar}>
              <span class={styles.count}>
                {ROWS.length} {selected().label.toLowerCase()}
              </span>
              <div class={styles.filters}>
                <For each={STATUSES}>
                  {(s) => (
                    <button type="button" class={styles.filterPill}>
                      <span
                        class={styles.dot}
                        style={{ background: s.color }}
                        aria-hidden="true"
                      />
                      {s.label}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Toolbar>
        </Header>
      }
    >
      <div class={styles.page}>
        <p class={styles.note}>
          Whole-page layout demo. Resize the window (or use the device toolbar) —
          the docked sidebar becomes a hamburger overlay below 1024px (the
          hamburger slots into the page header), and the whole UI shrinks below
          600px. Pick a sidebar item to see the header breadcrumb update.
        </p>

        <div class={styles.tableWrap}>
          <table class={styles.table}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Reference</th>
                <th>Customer</th>
                <th class={styles.numeric}>Items</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              <For each={ROWS}>
                {(row) => (
                  <tr>
                    <td>
                      <span class={styles.status}>
                        <span
                          class={styles.dot}
                          style={{ background: row.status.color }}
                          aria-hidden="true"
                        />
                        {row.status.label}
                      </span>
                    </td>
                    <td class={styles.mono}>{row.reference}</td>
                    <td>{row.customer}</td>
                    <td class={styles.numeric}>{row.items}</td>
                    <td class={styles.muted}>{row.created}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
