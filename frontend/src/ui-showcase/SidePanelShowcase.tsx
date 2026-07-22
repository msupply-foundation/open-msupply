import { createSignal } from 'solid-js';
import {
  SidePanel,
  SidePanelActions,
  SidePanelSection,
} from '../ui/layout/SidePanel/SidePanel';
import { Button } from '../ui/elements/buttons/Button';
import { CopyIcon, TrashIcon } from '../ui/icons';
import { useIsNavOverlay } from '../ui/utils/createMediaQuery';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Lead, Row } from './common';
import styles from './SidePanelShowcase.module.css';

export const SidePanelShowcase = () => {
  const [open, setOpen] = createSignal(false);
  // Below the nav-overlay breakpoint the component itself doesn't render
  // (its known skeleton-stage gap), so the toggle would move nothing —
  // disable it rather than animate empty space.
  const isOverlay = useIsNavOverlay();

  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <DashboardCard title="Details panel — slide it out over the page">
          <Lead>
            The detail-view right-hand panel (the current app's DetailPanel):
            additional info, related documents, comments.{' '}
            <code>&lt;SidePanel&gt;</code> is pure layout with zero state — a
            real page composes <code>&lt;SidePanelSection&gt;</code>s (field
            rows are a plain <code>&lt;dl&gt;</code> of dt/dd pairs, free text a{' '}
            <code>&lt;p&gt;</code>) and docks it in the Page frame's{' '}
            <code>sidePanel</code> slot — see the Outbound Shipments detail page
            for the real assembly. The button slides it out over the page from
            the inline-end edge, full viewport height — demo rigging around the
            panel, previewing the toggled-drawer behaviour that arrives with the
            Feedback/Drawer work (which adds the scrim, focus trap and Escape).
            Known gap: below the nav-overlay breakpoint (1024px) the panel
            doesn't render at all — on a narrow viewport the button is disabled.
          </Lead>
          <Row>
            <Button
              onClick={() => setOpen(o => !o)}
              aria-expanded={open()}
              disabled={isOverlay()}
            >
              {open() ? 'Close side panel' : 'Open side panel'}
            </Button>
          </Row>
          <div class={styles.panelHolder} data-open={open() ? 'true' : 'false'}>
            <SidePanel label="Shipment details">
              <SidePanelSection value="additional-info" title="Additional info">
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
              <SidePanelSection
                value="related-documents"
                title="Related documents"
              >
                <dl>
                  <dt>Requisition</dt>
                  <dd>RQ-0042</dd>
                </dl>
              </SidePanelSection>
              <SidePanelSection value="comment" title="Comment">
                <p>Placeholder — comments land with the Feedback work.</p>
              </SidePanelSection>
              <SidePanelSection
                value="related-documents-collapsible"
                title="Related documents (collapsible)"
                collapsible
              >
                <dl>
                  <dt>Requisition</dt>
                  <dd>RQ-0042</dd>
                  <dt>Purchase order</dt>
                  <dd>PO-1042</dd>
                </dl>
              </SidePanelSection>
              <SidePanelSection
                value="history"
                title="History (collapsed by default)"
                collapsible
                defaultOpen={false}
              >
                <p>
                  Opened this section from its heading — the chevron rotates and
                  content expands.
                </p>
              </SidePanelSection>
              {/* Record actions (the registry's record-actions section):
                SidePanelActions stacks them one per row, aligned
                inline-start, each button sized to its label. */}
              <SidePanelSection value="actions" title="Actions">
                <SidePanelActions>
                  <Button
                    variant="danger"
                    icon={<TrashIcon />}
                    onClick={() => {}}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<CopyIcon />}
                    onClick={() => {}}
                  >
                    Make a copy
                  </Button>
                </SidePanelActions>
              </SidePanelSection>
            </SidePanel>
          </div>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};
