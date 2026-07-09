import { createSignal, For, Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Page } from '../../ui/layout/Page/Page'
import { Header } from '../../ui/layout/Header/Header'
import { Breadcrumb, type Crumb } from '../../ui/layout/Header/Breadcrumb'
import { HeaderButtons } from '../../ui/layout/Header/HeaderButtons'
import { ContentFooter } from '../../ui/layout/ContentFooter/ContentFooter'
import { ContentFooterActions } from '../../ui/layout/ContentFooter/ContentFooterActions'
import { SidePanel, SidePanelSection } from '../../ui/layout/SidePanel/SidePanel'
import { findNavParent } from '../../ui/layout/AppShell/navModel'
import { Button } from '../../ui/elements/buttons/Button'
import { Tabs, TabList, TabPanel, type TabDef } from '../../ui/elements/tabs/Tabs'
import { Table } from '../../ui/elements/table/Table'
import { EmptyState } from '../../ui/elements/feedback/EmptyState'
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog'
import { StatusChip } from '../../ui/elements/feedback/StatusChip'
import {
  PlusCircleIcon,
  ClockIcon,
  SaveIcon,
  XCircleIcon,
} from '../../ui/icons'
import { linesFor, SHIPMENTS, statusColour, statusLabel } from './demoData'

const DETAIL_TABS: TabDef[] = [
  { value: 'details', label: 'Details' },
  { value: 'log', label: 'Log' },
]

export interface DetailViewProps {
  /** Which shipment — the host (a router later) owns this. */
  reference: string
  /** Navigate back up to the list (breadcrumb / Cancel). */
  onBack: () => void
}

/*
 * Outbound Shipment DetailView — THE DETAIL-PAGE RECIPE (see DECISIONS.md
 * 2026-07-08): a <Tabs> root wrapping a <Page> frame from outside, so the
 * TabList sits in the Header (becoming its bottom edge) while the panels live
 * in the scrolling body; a SidePanel docked in the frame's sidePanel slot;
 * and a persistent ContentFooter with the detail actions. Same frame as the
 * list view — the side panel slot is simply used here and collapsed there.
 * The page composes library components and owns NO CSS; the breadcrumb's
 * ancestor crumb navigates back via its interim onClick (a router makes it a
 * real href later).
 */
export const DetailView = (props: DetailViewProps) => {
  const [tab, setTab] = createSignal('details')
  const [confirmSave, setConfirmSave] = createSignal(false)
  const shipment = () => SHIPMENTS.find((s) => s.reference === props.reference)
  const lines = () => linesFor(props.reference)

  const parent = findNavParent('outbound')
  const crumbs = (): Crumb[] => [
    { label: parent?.label ?? 'Distribution' },
    { label: 'Outbound Shipments', onClick: props.onBack },
    { label: props.reference },
  ]

  return (
    <Tabs value={tab()} onValueChange={setTab}>
      <Page
        header={
          <Header>
            <Breadcrumb
              icon={parent && <Dynamic component={parent.icon} />}
              crumbs={crumbs()}
            />
            <HeaderButtons>
              <Button icon={<PlusCircleIcon />}>Add item</Button>
            </HeaderButtons>
            <TabList tabs={DETAIL_TABS} />
          </Header>
        }
        sidePanel={
          <SidePanel>
            <SidePanelSection title="Additional info">
              <dl>
                <dt>Status</dt>
                <dd>
                  <Show when={shipment()} fallback="—">
                    {(s) => (
                      <StatusChip
                        label={statusLabel(s().status)}
                        colour={statusColour(s().status)}
                      />
                    )}
                  </Show>
                </dd>
                <dt>Entered</dt>
                <dd>{shipment()?.created}</dd>
                <dt>Customer</dt>
                <dd>{shipment()?.customer}</dd>
                <dt>Their reference</dt>
                <dd>{shipment()?.theirReference || '(none)'}</dd>
              </dl>
            </SidePanelSection>
            <SidePanelSection title="Related documents">
              <dl>
                <dt>Requisition</dt>
                <dd>RQ-{props.reference.slice(-4)}</dd>
              </dl>
            </SidePanelSection>
            <SidePanelSection title="Comment">
              <p>Placeholder — comments land with the Feedback work.</p>
            </SidePanelSection>
          </SidePanel>
        }
        contentFooter={
          <ContentFooter>
            <Button variant="secondary" icon={<ClockIcon />}>
              History
            </Button>
            <ContentFooterActions>
              <Button variant="secondary" icon={<XCircleIcon />} onClick={props.onBack}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                icon={<SaveIcon />}
                onClick={() => setConfirmSave(true)}
              >
                Save
              </Button>
              <ConfirmDialog
                open={confirmSave()}
                onClose={() => setConfirmSave(false)}
                message={`Save changes to ${props.reference}?`}
                onConfirm={() => {
                  /* no data layer yet — the recipe shows the wiring */
                }}
              />
            </ContentFooterActions>
          </ContentFooter>
        }
      >
        <TabPanel value="details">
          <Table label="Shipment lines">
            <thead>
              <tr>
                <th>Code</th>
                <th>Item</th>
                <th data-numeric>Pack size</th>
                <th data-numeric>Quantity</th>
                <th>Batch</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              <For each={lines()}>
                {(line) => (
                  <tr>
                    <td data-mono>{line.code}</td>
                    <td>{line.item}</td>
                    <td data-numeric>{line.packSize}</td>
                    <td data-numeric>{line.quantity}</td>
                    <td>{line.batch}</td>
                    <td data-muted>{line.expiry}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </Table>
        </TabPanel>
        <TabPanel value="log">
          <EmptyState message="Activity log — lands with the data layer." />
        </TabPanel>
      </Page>
    </Tabs>
  )
}
