import { createSignal, For, Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Page } from '../../ui/layout/Page/Page'
import { Header } from '../../ui/layout/Header/Header'
import { Breadcrumb, type Crumb } from '../../ui/layout/Header/Breadcrumb'
import { HeaderButtons } from '../../ui/layout/Header/HeaderButtons'
import { Toolbar } from '../../ui/layout/Header/Toolbar'
import { ContentFooter } from '../../ui/layout/ContentFooter/ContentFooter'
import { ContentFooterActions } from '../../ui/layout/ContentFooter/ContentFooterActions'
import { findNavParent } from '../../ui/layout/AppShell/navModel'
import { Button } from '../../ui/elements/buttons/Button'
import { SplitButton } from '../../ui/elements/buttons/SplitButton'
import { FilterBar, type FilterField, type FilterValues } from '../../ui/elements/selectors/FilterBar'
import { Table } from '../../ui/elements/table/Table'
import { EmptyState } from '../../ui/elements/feedback/EmptyState'
import { StatusChip } from '../../ui/elements/feedback/StatusChip'
import { PlusCircleIcon, DownloadIcon, TrashIcon, MinusCircleIcon } from '../../ui/icons'
import {
  SHIPMENTS,
  SHIPMENT_STATUSES,
  statusColour,
  statusLabel,
  type ShipmentRow,
} from './demoData'

const FILTER_FIELDS: FilterField[] = [
  { key: 'customer', name: 'Customer', type: 'text', placeholder: 'Customer name' },
  { key: 'status', name: 'Status', type: 'enum', options: SHIPMENT_STATUSES },
  { key: 'theirReference', name: 'Their reference', type: 'text' },
]

const EXPORT_OPTIONS = [
  { value: 'csv', label: 'Export CSV' },
  { value: 'excel', label: 'Export Excel' },
]

export interface ListViewProps {
  /** Open a shipment's detail view — the host (a router later) navigates. */
  onOpen: (reference: string) => void
}

/*
 * Outbound Shipments ListView — THE LIST-PAGE RECIPE (see DECISIONS.md
 * 2026-07-08): a <Page> frame with a Header (breadcrumb / actions / FilterBar
 * toolbar), a Table body, and a contextual ContentFooter that only exists
 * while rows are selected. No side panel — list pages don't have one, and the
 * slot simply collapses. The page composes library components and owns NO
 * CSS; all state is page-local signals (a data layer and router take over
 * rows/filters/navigation later). New list pages start as a copy of this
 * file; if the assembly proves genuinely identical after a few real ones, a
 * ListPage shorthand gets extracted THEN (rule of three), not before.
 */
export const ListView = (props: ListViewProps) => {
  const [rows, setRows] = createSignal<ShipmentRow[]>(SHIPMENTS)
  const [filters, setFilters] = createSignal<FilterValues>({})
  const [picked, setPicked] = createSignal<ReadonlySet<string>>(new Set())

  // FilterBar's controlled values applied to the placeholder rows — the same
  // object a table engine will consume directly (and a router will hold in
  // URL params) later.
  const visible = () => {
    const f = filters()
    const customer = (f.customer as string | undefined)?.toLowerCase()
    const theirRef = (f.theirReference as string | undefined)?.toLowerCase()
    const statuses = f.status as string[] | undefined
    return rows().filter(
      (r) =>
        (!customer || r.customer.toLowerCase().includes(customer)) &&
        (!theirRef || r.theirReference.toLowerCase().includes(theirRef)) &&
        (!statuses || statuses.includes(r.status)),
    )
  }

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

  const parent = findNavParent('outbound')
  const crumbs: Crumb[] = [
    { label: parent?.label ?? 'Distribution' },
    { label: 'Outbound Shipments' },
  ]

  return (
    <Page
      header={
        <Header>
          <Breadcrumb
            icon={parent && <Dynamic component={parent.icon} />}
            crumbs={crumbs}
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
            <FilterBar fields={FILTER_FIELDS} values={filters()} onChange={setFilters} />
          </Toolbar>
        </Header>
      }
      contentFooter={
        <Show when={picked().size > 0}>
          <ContentFooter>
            <strong>{picked().size} selected</strong>
            <ContentFooterActions>
              <Button variant="secondary" icon={<TrashIcon />} onClick={deletePicked}>
                Delete
              </Button>
              <Button variant="secondary" icon={<MinusCircleIcon />} onClick={clearPicked}>
                Clear selection
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        </Show>
      }
    >
      <Show
        when={visible().length > 0}
        fallback={<EmptyState message="No shipments match the current filters." />}
      >
        <Table label="Outbound shipments">
          <thead>
            <tr>
              <th data-check aria-label="Selected" />
              <th>Reference</th>
              <th>Customer</th>
              <th>Status</th>
              <th data-numeric>Items</th>
              <th>Their reference</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <For each={visible()}>
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
                  <td data-mono>
                    <button
                      type="button"
                      data-row-link
                      onClick={() => props.onOpen(row.reference)}
                    >
                      {row.reference}
                    </button>
                  </td>
                  <td>{row.customer}</td>
                  <td>
                    <StatusChip
                      label={statusLabel(row.status)}
                      colour={statusColour(row.status)}
                    />
                  </td>
                  <td data-numeric>{row.items}</td>
                  <td data-muted>{row.theirReference}</td>
                  <td data-muted>{row.created}</td>
                </tr>
              )}
            </For>
          </tbody>
        </Table>
      </Show>
    </Page>
  )
}
