import { createSignal, For, Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { AppShell } from '../components/layout/AppShell/AppShell'
import { findNavParent, type NavLeaf } from '../components/layout/AppShell/navModel'
import { Page } from '../components/layout/Page/Page'
import { Header } from '../components/layout/Header/Header'
import { Breadcrumb, type Crumb } from '../components/layout/Header/Breadcrumb'
import { HeaderButtons } from '../components/layout/Header/HeaderButtons'
import { Toolbar } from '../components/layout/Header/Toolbar'
import { ContentFooter } from '../components/layout/ContentFooter/ContentFooter'
import { ContentFooterActions } from '../components/layout/ContentFooter/ContentFooterActions'
import { Button } from '../components/ui/Button'
import { SplitButton } from '../components/ui/SplitButton'
import { Table } from '../components/ui/Table'
import {
  PlusCircleIcon,
  DownloadIcon,
  ClockIcon,
  CopyIcon,
  MinusCircleIcon,
  SaveIcon,
  TrashIcon,
  XCircleIcon,
} from '../components/icons'
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
 * Demonstrates the AppShell + Page layout elements as a full page — the
 * Outbound Shipments demo. It's rendered full-bleed by the showcase (kind:
 * 'page'); resize the window to watch the docked menu bar become a hamburger
 * overlay at the navOverlay breakpoint (the hamburger appears inside the
 * page header, via ShellNavContext). AppShell is the app-level container
 * (menu bar + orange footer); the page content is a <Page> frame whose
 * header / contentFooter slots hold the composed regions — the same
 * assembly as the real skeleton pages (pages/OutboundShipments), which are
 * the canonical recipes. The showcase owns the demo's nav selection
 * (AppShell is controlled) and derives the header breadcrumb from it — in
 * the real app a router plays both roles. The header buttons and toolbar
 * stay the Outbound Shipments set while you navigate; a real app swaps the
 * whole page. The pinned ContentFooter is contextual by composition: tick
 * table rows and its children swap from the detail actions to the selection
 * actions — page-local signals, no store (see DECISIONS.md 2026-07-08).
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

  // Row data + selection are signals so the footer's Delete really deletes —
  // the closest hand-rolled stand-in for the table engine that arrives later.
  const [rows, setRows] = createSignal(ROWS)
  const [picked, setPicked] = createSignal<ReadonlySet<string>>(new Set())
  const togglePicked = (reference: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(reference)) next.delete(reference)
      else next.add(reference)
      return next
    })
  const clearPicked = () => setPicked(new Set<string>())
  const deletePicked = () => {
    setRows((rs) => rs.filter((r) => !picked().has(r.reference)))
    clearPicked()
  }

  return (
    <AppShell selected={selected()} onNavigate={setSelected}>
      <Page
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
                  {rows().length} {selected().label.toLowerCase()}
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
        contentFooter={
          <ContentFooter>
            <Show
              when={picked().size > 0}
              fallback={
                <>
                  <Button color="blue" icon={<ClockIcon />}>
                    History
                  </Button>
                  <ContentFooterActions>
                    <Button color="blue" icon={<XCircleIcon />}>
                      Cancel
                    </Button>
                    <Button color="blue" icon={<SaveIcon />}>
                      Save
                    </Button>
                  </ContentFooterActions>
                </>
              }
            >
              <strong>{picked().size} selected</strong>
              <ContentFooterActions>
                <Button color="blue" icon={<TrashIcon />} onClick={deletePicked}>
                  Delete
                </Button>
                <Button color="blue" icon={<CopyIcon />}>
                  Make a copy
                </Button>
                <Button
                  color="blue"
                  icon={<MinusCircleIcon />}
                  onClick={clearPicked}
                >
                  Clear selection
                </Button>
              </ContentFooterActions>
            </Show>
          </ContentFooter>
        }
      >
        <div class={styles.page}>
          <p class={styles.note}>
            Whole-page layout demo. Resize the window (or use the device toolbar) —
            the docked menu bar becomes a hamburger overlay below 1024px (the
            hamburger slots into the page header), and the whole UI shrinks below
            600px. Pick a menu item to see the header breadcrumb update. Tick
            rows to watch the pinned content footer swap to the selection
            actions.
          </p>

          <Table label="Outbound shipments">
            <thead>
              <tr>
                <th data-check aria-label="Selected" />
                <th>Status</th>
                <th>Reference</th>
                <th>Customer</th>
                <th data-numeric>Items</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              <For each={rows()}>
                {(row) => (
                  <tr data-selected={picked().has(row.reference) ? '' : undefined}>
                    <td data-check>
                      <input
                        type="checkbox"
                        checked={picked().has(row.reference)}
                        onChange={() => togglePicked(row.reference)}
                        aria-label={`Select ${row.reference}`}
                      />
                    </td>
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
                    <td data-mono>{row.reference}</td>
                    <td>{row.customer}</td>
                    <td data-numeric>{row.items}</td>
                    <td data-muted>{row.created}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </Table>
        </div>
      </Page>
    </AppShell>
  )
}
