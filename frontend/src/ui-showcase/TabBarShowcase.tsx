import { For, createSignal } from 'solid-js';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../ui/layout/Header/Toolbar';
import {
  Tabs,
  TabList,
  TabPanel,
  type StepMark,
  type TabDef,
} from '../ui/elements/tabs/Tabs';
import { Button } from '../ui/elements/buttons/Button';
import { RadioGroup } from '../ui/elements/inputs/RadioGroup';
import { Checkbox } from '../ui/elements/inputs/Checkbox';
import { StatusBadge } from '../ui/elements/feedback/StatusBadge';
import { ProgressList } from '../ui/sync/ProgressList';
import { TruckIcon, PlusCircleIcon, FileIcon, PrinterIcon } from '../ui/icons';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Lead, Note, PageFrame, ToolbarStub } from './common';
import type { PageMetadata } from './metadata';
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

/*
 * The step-tabs demo: a tender's page tabs (spec/procurement/ui-surface.md
 * S1). The marks are worked out from the status here, as the tender page
 * will; at Negotiation & Award the spec has yet to say whether Award or
 * Purchase is current, so the demo marks Award.
 */
const TENDER_STEPS = [
  { value: 'plan', label: 'Plan' },
  { value: 'items', label: 'Items' },
  { value: 'source', label: 'Source' },
  { value: 'evaluate', label: 'Evaluate' },
  { value: 'award', label: 'Award' },
  { value: 'purchase', label: 'Purchase' },
];

const TENDER_STATUSES = [
  { value: 'planning', label: 'Planning', current: 0 },
  { value: 'advertised', label: 'Advertised', current: 2 },
  { value: 'evaluation', label: 'Evaluation', current: 3 },
  { value: 'award', label: 'Negotiation & Award', current: 4 },
  // Past the last step: every step is done.
  { value: 'finalised', label: 'Finalised', current: TENDER_STEPS.length },
];

// The prototype's notes for a tender in Planning that can't yet be confirmed.
const PLANNING_NOTES: Record<string, string> = {
  items: '2 items are missing a quantity or pack size',
  source: 'No suppliers invited',
};

const markFor = (index: number, current: number): StepMark =>
  index < current ? 'done' : index === current ? 'current' : 'notStarted';

const tenderTabs = (
  current: number,
  notes: Record<string, string> = {}
): TabDef[] => [
  { value: 'summary', label: 'Summary' },
  ...TENDER_STEPS.map((step, index) => ({
    ...step,
    step: { mark: markFor(index, current), attention: notes[step.value] },
  })),
  { value: 'log', label: 'Log' },
];

const PLAIN_TENDER_TABS: TabDef[] = [
  { value: 'summary', label: 'Summary' },
  ...TENDER_STEPS,
  { value: 'log', label: 'Log' },
];

const StepTabsDemo = () => {
  const [status, setStatus] = createSignal('advertised');
  const [flagSource, setFlagSource] = createSignal(false);
  const [openTab, setOpenTab] = createSignal('plan');

  const statusDef = () => TENDER_STATUSES.find(s => s.value === status())!;
  const tabs = () => {
    const notes: Record<string, string> =
      status() === 'planning' ? { ...PLANNING_NOTES } : {};
    if (flagSource()) notes.source = 'Incoterm not filled in';
    return tenderTabs(statusDef().current, notes);
  };

  return (
    <>
      <RadioGroup
        label="Tender status"
        orientation="horizontal"
        options={TENDER_STATUSES}
        value={status()}
        onChange={setStatus}
      />
      <Checkbox
        label="Flag Source as needing attention (Incoterm not filled in)"
        checked={flagSource()}
        onChange={setFlagSource}
      />
      <PageFrame>
        <Tabs value={openTab()} onValueChange={setOpenTab}>
          <Header>
            <Breadcrumb
              icon={<FileIcon />}
              crumbs={[
                { label: 'Procurement', to: '#/tab-bar' },
                { label: 'Gloves and surgical drapes 2027' },
              ]}
              status={<StatusBadge label={statusDef().label} tone="info" />}
            />
            <HeaderButtons>
              <Button icon={<PrinterIcon />}>Export/Print</Button>
            </HeaderButtons>
            <TabList tabs={tabs()} />
          </Header>
          <div class={styles.panelBody}>
            <For each={tabs()}>
              {tab => (
                <TabPanel value={tab.value}>
                  <p class={styles.panelText}>
                    {tab.label} — the tender's {tab.label.toLowerCase()} tab.
                  </p>
                </TabPanel>
              )}
            </For>
          </div>
        </Tabs>
      </PageFrame>
    </>
  );
};

const CompareDemo = () => {
  const [railStep, setRailStep] = createSignal(0);
  const advertised = 2;
  return (
    <Stack gap="lg">
      <div>
        <Note>
          Page tabs: switch the page's content and keep the open tab in the URL,
          but can't show how far the tender has got.
        </Note>
        <Tabs defaultValue="plan">
          <TabList tabs={PLAIN_TENDER_TABS} />
        </Tabs>
      </div>
      <div>
        <Note>
          Progress stepper (wizard rail): shows done, current and not started,
          and its steps can be pressed — but it isn't tabs. It doesn't sit on
          the header, has no Summary or Log, isn't kept in the URL and doesn't
          move with the arrow keys. Last step pressed: {railStep() + 1}.
        </Note>
        <ProgressList
          onStepSelect={setRailStep}
          steps={TENDER_STEPS.map((step, index) => ({
            label: step.label,
            started: index <= advertised,
            finished: index < advertised,
            navigable: true,
          }))}
        />
      </div>
      <div>
        <Note>
          Step tabs: page tabs whose steps show their marks, with plain tabs
          either side.
        </Note>
        <Tabs defaultValue="plan">
          <TabList tabs={tenderTabs(advertised)} />
        </Tabs>
      </div>
    </Stack>
  );
};

// No TOC is rendered for this page (Carl: hide it), but the metadata is still
// exported + registered so Search indexes the tab-bar sections.
export const tabBarMetadata: PageMetadata = {
  id: 'tab-bar',
  title: 'Tab bar',
  searchTerms: ['tabs', 'navigation'],
  items: [
    {
      id: 'tab-bar-header-edge',
      title: "Header's bottom edge",
      searchTerms: ['tab', 'header', 'underline'],
    },
    {
      id: 'tab-bar-keyboard',
      title: 'Keyboard contract',
      searchTerms: ['arrow keys', 'a11y', 'accessibility'],
    },
    {
      id: 'tab-bar-steps',
      title: 'Steps — tabs that show progress',
      searchTerms: [
        'stepper',
        'page-level stepper',
        'done',
        'current',
        'not started',
        'attention',
        'tender',
      ],
    },
    {
      id: 'tab-bar-steps-compare',
      title: 'Compared with the existing components',
      searchTerms: ['progress stepper', 'wizard rail', 'comparison'],
    },
  ],
};

export const TabBarShowcase = () => {
  const [pageTab, setPageTab] = createSignal('general');

  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <DashboardCard
          id="tab-bar-header-edge"
          title="Tab bar — the header's bottom edge"
        >
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

        <DashboardCard
          id="tab-bar-keyboard"
          title="Keyboard contract, standalone strip"
        >
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

        <DashboardCard
          id="tab-bar-steps"
          title="Steps — tabs that show progress"
        >
          <Lead>
            For a record that moves through a fixed sequence of steps, a tab can
            carry a <code>step</code>: a marker showing whether the step is{' '}
            <strong>done</strong> (a tick), <strong>current</strong> (the number
            on a solid disc) or <strong>not started</strong> (the number in a
            ring), worked out by the page from the record's status. A step may
            also carry an <strong>attention</strong> note, shown under its label
            and read out with its name. Tabs without a step — Summary, Log — sit
            either side. Every step can be opened whatever its mark, and the
            open tab keeps the underline, so Plan can be open while the tender
            is at Source. Everything else is the tab bar above: the header's
            bottom edge, the arrow keys, and the open tab kept in the URL by the
            page (<code>useSearchParams</code>, as the purchase order page
            does). Narrow the window: the strip scrolls sideways and keeps the
            open tab in view.
          </Lead>
          <StepTabsDemo />
        </DashboardCard>

        <DashboardCard
          id="tab-bar-steps-compare"
          title="Compared with the existing components"
        >
          <Lead>The same six steps of a tender at Advertised, three ways.</Lead>
          <CompareDemo />
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};
