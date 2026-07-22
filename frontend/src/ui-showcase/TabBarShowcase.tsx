import { createSignal } from 'solid-js';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../ui/layout/Header/Toolbar';
import { Tabs, TabList, TabPanel, type TabDef } from '../ui/elements/tabs/Tabs';
import { Button } from '../ui/elements/buttons/Button';
import { TruckIcon, PlusCircleIcon } from '../ui/icons';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Lead, PageFrame, ToolbarStub } from './common';
import styles from './TabBarShowcase.module.css';

const PAGE_TABS: TabDef[] = [
  { value: 'general', label: 'General' },
  { value: 'items', label: 'Items' },
  { value: 'transport', label: 'Transport' },
  { value: 'log', label: 'Log' },
];

const KEYBOARD_TABS: TabDef[] = [
  { value: 'arrows', label: 'Arrow keys' },
  { value: 'ends', label: 'Home / End' },
  { value: 'panel', label: 'Into the panel' },
];

export const TabBarShowcase = () => {
  const [pageTab, setPageTab] = createSignal('general');

  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <DashboardCard title="Tab bar — the header's bottom edge">
          <Lead>
            The demo's tab strip: centred labels with a single underline that{' '}
            <em>slides</em> between them. <code>&lt;Tabs&gt;</code> (the state
            root) wraps header and panels together; <code>&lt;TabList&gt;</code>{' '}
            rendered as the header's last child claims its bottom edge — the
            strip's border becomes the header's, running edge to edge.{' '}
            <code>&lt;TabPanel&gt;</code>s live in the page body; inactive
            panels are unmounted. Squeeze the window — the underline re-tracks
            its label as the strip reflows.
          </Lead>
          <PageFrame>
            <Tabs value={pageTab()} onValueChange={setPageTab}>
              <Header>
                <Breadcrumb
                  icon={<TruckIcon />}
                  crumbs={[
                    { label: 'Outbound Shipments', to: '#/tab-bar' },
                    { label: 'OS-001024' },
                  ]}
                />
                <HeaderButtons>
                  <Button icon={<PlusCircleIcon />}>Add item</Button>
                </HeaderButtons>
                <Toolbar>
                  <ToolbarStub>Toolbar</ToolbarStub>
                </Toolbar>
                <TabList tabs={PAGE_TABS} />
              </Header>
              <div class={styles.panelBody}>
                <TabPanel value="general">
                  <p class={styles.panelText}>
                    General — the shipment's status, customer and dates.
                  </p>
                </TabPanel>
                <TabPanel value="items">
                  <p class={styles.panelText}>
                    Items — the data table lands here (Table section, coming
                    soon).
                  </p>
                </TabPanel>
                <TabPanel value="transport">
                  <p class={styles.panelText}>
                    Transport — carrier and reference details.
                  </p>
                </TabPanel>
                <TabPanel value="log">
                  <p class={styles.panelText}>
                    Log — the shipment's audit trail.
                  </p>
                </TabPanel>
              </div>
            </Tabs>
          </PageFrame>
        </DashboardCard>

        <DashboardCard title="Keyboard contract, standalone strip">
          <Lead>
            Outside a header the strip keeps its own bottom border. The
            behaviour is Kobalte's WAI-ARIA tabs pattern — the part we buy: the
            tablist is <strong>one</strong> tab stop (roving tabindex), ←/→ move
            between tabs and select as they go (automatic activation,
            direction-aware in RTL), Home/End jump to the first/last tab, and
            pressing Tab moves into the active panel — which is only itself
            focusable when it contains nothing tabbable. Uncontrolled here (
            <code>defaultValue</code>); the demo above is controlled.
          </Lead>
          <Tabs defaultValue="arrows">
            <TabList tabs={KEYBOARD_TABS} />
            <TabPanel value="arrows">
              <p class={styles.panelText}>
                Focus the tablist, then use ← and → — focus and selection move
                together, wrapping is off per the pattern.
              </p>
            </TabPanel>
            <TabPanel value="ends">
              <p class={styles.panelText}>
                Home selects the first tab, End the last — from anywhere in the
                strip.
              </p>
            </TabPanel>
            <TabPanel value="panel">
              <p class={styles.panelText}>
                This panel has no tabbable child, so it takes focus itself —
                with a visible ring (the prototype hid it; we don't).
              </p>
            </TabPanel>
          </Tabs>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};
