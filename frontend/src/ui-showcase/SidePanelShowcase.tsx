import { createSignal, type JSX } from 'solid-js'
import { SidePanel, SidePanelSection } from '../ui/layout/SidePanel/SidePanel'
import { Button } from '../ui/elements/buttons/Button'
import { useIsNavOverlay } from '../ui/utils/createMediaQuery'
import styles from './SidePanelShowcase.module.css'

const Card = (props: {
  title: string
  lead: JSX.Element
  children: JSX.Element
}) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>{props.lead}</p>
      {props.children}
    </div>
  </section>
)

export const SidePanelShowcase = () => {
  const [open, setOpen] = createSignal(false)
  // Below the nav-overlay breakpoint the component itself doesn't render
  // (its known skeleton-stage gap), so the toggle would move nothing —
  // disable it rather than animate empty space.
  const isOverlay = useIsNavOverlay()

  return (
    <div class={styles.stack}>
      <Card
        title="Details panel — slide it out over the page"
        lead={
          <>
            The detail-view right-hand panel (the current app's DetailPanel):
            additional info, related documents, comments.{' '}
            <code>&lt;SidePanel&gt;</code> is pure layout with zero state — a
            real page composes <code>&lt;SidePanelSection&gt;</code>s (field
            rows are a plain <code>&lt;dl&gt;</code> of dt/dd pairs, free text
            a <code>&lt;p&gt;</code>) and docks it in the Page frame's{' '}
            <code>sidePanel</code> slot — see the Outbound Shipments detail
            page for the real assembly. The button slides it out over the page
            from the inline-end edge, full viewport height — demo rigging
            around the panel, previewing the toggled-drawer behaviour that
            arrives with the Feedback/Drawer work (which adds the scrim, focus
            trap and Escape). Known gap: below the nav-overlay breakpoint
            (1024px) the panel doesn't render at all — on a narrow viewport
            the button is disabled.
          </>
        }
      >
        <Button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open()}
          disabled={isOverlay()}
        >
          {open() ? 'Close side panel' : 'Open side panel'}
        </Button>
        <div class={styles.panelHolder} data-open={open() ? 'true' : 'false'}>
          <SidePanel label="Shipment details">
            <SidePanelSection title="Additional info">
              <dl>
                <dt>Status</dt>
                <dd>New</dd>
                <dt>Entered</dt>
                <dd>2026-07-08</dd>
                <dt>Customer</dt>
                <dd>Médecins Sans Frontières</dd>
                <dt>Their reference</dt>
                <dd>(none)</dd>
              </dl>
            </SidePanelSection>
            <SidePanelSection title="Related documents">
              <dl>
                <dt>Requisition</dt>
                <dd>RQ-0042</dd>
              </dl>
            </SidePanelSection>
            <SidePanelSection title="Comment">
              <p>Placeholder — comments land with the Feedback work.</p>
            </SidePanelSection>
          </SidePanel>
        </div>
      </Card>
    </div>
  )
}
