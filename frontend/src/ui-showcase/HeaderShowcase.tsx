import { createSignal } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../ui/layout/Header/Toolbar';
import { HeaderToolbar } from '../ui/layout/Header/HeaderToolbar';
import { Select } from '../ui/elements/selectors/Select';
import { TextField } from '../ui/elements/inputs/TextField';
import { DateField } from '../ui/elements/inputs/DateField';
import { ToggleSwitch } from '../ui/elements/inputs/ToggleSwitch';
import { LabelledValue } from '../ui/elements/typography/LabelledValue';
import { Alert } from '../ui/elements/feedback/Alert';
import { StatusChip } from '../ui/elements/feedback/StatusChip';
import { Button } from '../ui/elements/buttons/Button';
import { SplitButton } from '../ui/elements/buttons/SplitButton';
import {
  TruckIcon,
  PlusCircleIcon,
  DownloadIcon,
  PrinterIcon,
} from '../ui/icons';
import { Lead, PageBody, PageFrame, SectionTOC, ToolbarStub } from './common';
import type { PageMetadata } from './metadata';

const EXPORT_OPTIONS = [
  { value: 'csv', label: 'Export CSV' },
  { value: 'excel', label: 'Export Excel' },
];

// Supplier options for the Toolbar demo's editable "Supplier name" select.
const SUPPLIERS = [
  { value: 'acme', label: 'Acme Pharma' },
  { value: 'medicorp', label: 'MediCorp Wholesale' },
  { value: 'global', label: 'Global Meds Ltd' },
  { value: 'carepoint', label: 'CarePoint Distribution' },
];

// Prominent custom field promoted into the inbound header cluster — the
// Category options the error variant's fourth field offers.
const CATEGORIES = [
  { value: 'routine', label: 'Routine' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'donation', label: 'Donation' },
];

// Internal-order variant: the locked supplier store + months-of-stock options
// for the reorder-threshold / target selects.
const STORE_OPTIONS = [{ value: 'android', label: 'Android Store' }];
const MOS_OPTIONS = [
  { value: '1', label: '1 month' },
  { value: '2', label: '2 months' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
];

/*
 * The first page converted to the dogfooded chrome pattern (2026-07-23, now
 * showcase-wide — see kdd/showcase-harness): page column is ContentContainer
 * + app Stack, demo sections are the app's DashboardCard with a <Lead> child.
 */
// The section TOC renders at the top now the page carries several sections
// (Carl 2026-07-27; previously omitted while it was short).
export const headerMetadata: PageMetadata = {
  id: 'header',
  title: 'Header',
  searchTerms: ['page header', 'top bar', 'title'],
  items: [
    {
      id: 'header-page',
      title: 'Page header',
      searchTerms: ['title', 'actions', 'outbound'],
    },
    {
      id: 'header-toolbar',
      title: 'Toolbar fields',
      searchTerms: ['toolbar', 'fields', 'filters', 'alert', 'form row'],
    },
    {
      id: 'header-toolbar-error',
      title: 'Toolbar fields · error',
      searchTerms: [
        'error',
        'invalid',
        'validation',
        'date',
        'rejected',
        'inbound',
      ],
    },
    {
      id: 'header-toolbar-settings',
      title: 'Toolbar fields · toggle',
      searchTerms: [
        'toggle',
        'switch',
        'months of stock',
        'mos',
        'internal order',
        'requisition',
      ],
    },
    {
      id: 'header-breadcrumb',
      title: 'Trail links',
      searchTerms: ['breadcrumb', 'crumbs', 'navigation'],
    },
  ],
};

export const HeaderShowcase = () => {
  // Interactive fields for the Toolbar field-cluster demo below.
  const [supplier, setSupplier] = createSignal('acme');
  const [reference, setReference] = createSignal('DEL-2231');
  // The error variant's own copies, so editing it doesn't move the demo above.
  // `received` starts on a date the (pretend) server refused, which is why the
  // field below opens showing its rejection.
  const [errorSupplier, setErrorSupplier] = createSignal('acme');
  const [errorReference, setErrorReference] = createSignal('DEL-2231');
  const [received, setReceived] = createSignal<string | null>('2025-11-02');
  const [category, setCategory] = createSignal('routine');
  // Stands in for the server's verdict on a backdated received date (the real
  // header surfaces the rejection the same way): anything before 2026 is
  // outside the store's backdating window.
  const receivedError = () => {
    const value = received();
    return value && value < '2026-01-01'
      ? 'This date is too far in the past'
      : undefined;
  };
  // Interactive fields for the second Toolbar demo (internal-order variant).
  const [reorderMos, setReorderMos] = createSignal('1');
  const [targetMos, setTargetMos] = createSignal('1');
  const [hideOverMin, setHideOverMin] = createSignal(false);

  return (
    <ContentContainer size="wide" align="start">
      <Stack gap="lg">
        <SectionTOC page={headerMetadata} />
        <DashboardCard
          id="header-page"
          title="Page header — the Outbound Shipments demo"
        >
          <Lead>
            The core page-layout atom, reproducing last week's demo.{' '}
            <code>&lt;Header&gt;</code> is pure layout with zero state — the
            page supplies its three parts as children:{' '}
            <code>&lt;Breadcrumb&gt;</code> (the trail data, later derived from
            the route), <code>&lt;HeaderButtons&gt;</code> (the page's actions —
            library Button / SplitButton, handlers owned by the page), and a
            per-page <code>&lt;Toolbar&gt;</code> on its own full-width row
            (stubbed here; the field cluster is the next section).
          </Lead>
          <PageFrame>
            <Header>
              <Breadcrumb
                icon={<TruckIcon />}
                crumbs={[{ label: 'Outbound Shipments' }]}
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
                <ToolbarStub>Toolbar</ToolbarStub>
              </Toolbar>
            </Header>
            <PageBody />
          </PageFrame>
        </DashboardCard>

        <DashboardCard
          id="header-toolbar"
          title="Toolbar fields — the header field cluster"
        >
          <Lead>
            The page-header field cluster via <code>&lt;HeaderToolbar&gt;</code>{' '}
            — a specialisation of <code>&lt;Toolbar&gt;</code> that wraps its
            children in a <code>&lt;FormRow&gt;</code> (equal shares at a 10rem
            min, growing to fill and packing as-many-per-row-as-fit) and takes
            an optional compact <code>&lt;Alert&gt;</code> via its{' '}
            <code>alert</code> prop — a content-hugging chip pinned to the
            bottom baseline. Three field kinds are shown: editable inputs
            (Supplier, Reference), a conditionally-locked <em>disabled</em>{' '}
            input (Received), and a never-editable read-only{' '}
            <code>&lt;LabelledValue&gt;</code> (Status). It rides one row while
            it fits and wraps intrinsically when it doesn't — squeeze the window
            to watch the Alert drop to its own line.
          </Lead>
          <PageFrame>
            <Header>
              <Breadcrumb
                icon={<TruckIcon />}
                crumbs={[{ label: 'Inbound Shipments' }, { label: '27' }]}
              />
              <HeaderButtons>
                <Button icon={<PlusCircleIcon />}>Add item</Button>
                <Button variant="secondary" icon={<PrinterIcon />}>
                  Export/Print
                </Button>
              </HeaderButtons>
              <HeaderToolbar
                alert={
                  <Alert severity="info" compact>
                    Created manually; status won't update automatically.
                  </Alert>
                }
              >
                <Select
                  label="Supplier name"
                  size="small"
                  width="full"
                  options={SUPPLIERS}
                  value={supplier()}
                  onValueChange={setSupplier}
                />
                <TextField
                  label="Reference"
                  size="small"
                  width="full"
                  value={reference()}
                  onInput={e => setReference(e.currentTarget.value)}
                />
                <DateField
                  label="Received"
                  size="small"
                  width="full"
                  format="dd MMM yyyy"
                  value="2026-05-19"
                  disabled
                />
                <LabelledValue label="Status" variant="field" size="small">
                  <StatusChip
                    label="Received"
                    colour="var(--status-received)"
                  />
                </LabelledValue>
              </HeaderToolbar>
            </Header>
            <PageBody />
          </PageFrame>
        </DashboardCard>

        <DashboardCard
          id="header-toolbar-error"
          title="Toolbar fields — a field carrying an error"
        >
          <Lead>
            The inbound shipment's real header, field for field (Supplier name,
            Reference, Received, and a promoted <em>Category</em> custom field),
            with the Received date <strong>editable</strong> and reporting a
            rejected save. The message is the <code>&lt;DateField&gt;</code>'s
            own <code>error</code> — inside the field, not a sibling Alert — so
            the cluster's row stays a row of fields: the error text extends its
            own field downward and leaves the other three, and the compact
            Alert, exactly where they were. Pick a date in 2026 to clear it,
            2025 or earlier to bring it back.
          </Lead>
          <PageFrame>
            <Header>
              <Breadcrumb
                icon={<TruckIcon />}
                crumbs={[{ label: 'Inbound Shipments' }, { label: '34' }]}
              />
              <HeaderButtons>
                <Button icon={<PlusCircleIcon />}>Add item</Button>
                <Button variant="secondary" icon={<PrinterIcon />}>
                  Export/Print
                </Button>
              </HeaderButtons>
              <HeaderToolbar
                alert={
                  <Alert severity="info" compact>
                    This shipment was created manually; its delivery status will
                    not update automatically.
                  </Alert>
                }
              >
                <Select
                  label="Supplier name"
                  size="small"
                  width="full"
                  options={SUPPLIERS}
                  value={errorSupplier()}
                  onValueChange={setErrorSupplier}
                />
                <TextField
                  label="Reference"
                  size="small"
                  width="full"
                  value={errorReference()}
                  onInput={e => setErrorReference(e.currentTarget.value)}
                />
                <DateField
                  label="Received"
                  size="small"
                  width="full"
                  format="dd MMM yyyy"
                  value={received()}
                  error={receivedError()}
                  onChange={setReceived}
                />
                <Select
                  label="Category"
                  size="small"
                  width="full"
                  options={CATEGORIES}
                  value={category()}
                  onValueChange={setCategory}
                />
              </HeaderToolbar>
            </Header>
            <PageBody />
          </PageFrame>
        </DashboardCard>

        <DashboardCard
          id="header-toolbar-settings"
          title="Toolbar fields — a settings row (selects + a toggle)"
        >
          <Lead>
            The same pattern with a different field mix — an internal order's
            header. Two locked facts (disabled Supplier name / reference), two
            editable <code>&lt;Select&gt;</code>s (reorder / target months of
            stock), and a <code>&lt;ToggleSwitch&gt;</code>. The four inputs
            share the <code>&lt;HeaderToolbar&gt;</code> row; the toggle hugs
            its content and — like the Alert in the section above — sits on the
            bottom baseline, so the input labels still line up along the top. No
            Alert here: the pattern doesn't require one.
          </Lead>
          <PageFrame>
            <Header>
              <Breadcrumb
                icon={<TruckIcon />}
                crumbs={[{ label: 'Internal Orders' }, { label: 'IN-0014' }]}
              />
              <HeaderButtons>
                <Button icon={<PlusCircleIcon />}>Add item</Button>
              </HeaderButtons>
              <HeaderToolbar>
                <Select
                  label="Supplier name"
                  size="small"
                  width="full"
                  options={STORE_OPTIONS}
                  value="android"
                  disabled
                />
                <TextField
                  label="Supplier reference"
                  size="small"
                  width="full"
                  value=""
                  disabled
                />
                <Select
                  label="Reorder threshold MOS"
                  size="small"
                  width="full"
                  options={MOS_OPTIONS}
                  value={reorderMos()}
                  onValueChange={setReorderMos}
                />
                <Select
                  label="Target MOS"
                  size="small"
                  width="full"
                  options={MOS_OPTIONS}
                  value={targetMos()}
                  onValueChange={setTargetMos}
                />
                {/* The toggle hugs its content and bottom-aligns (like the
                    compact Alert), so the four input labels line up on top
                    while it sits on the control baseline. */}
                <div style={{ flex: '0 1 auto', 'align-self': 'flex-end' }}>
                  <ToggleSwitch
                    label="Hide stock over minimum"
                    checked={hideOverMin()}
                    onChange={setHideOverMin}
                  />
                </div>
              </HeaderToolbar>
            </Header>
            <PageBody />
          </PageFrame>
        </DashboardCard>

        <DashboardCard
          id="header-breadcrumb"
          title="Trail links, omission, intrinsic wrap"
        >
          <Lead>
            A deeper trail on a detail page: ancestor crumbs with a{' '}
            <code>to</code> render as real links, and the current page renders
            as the page's <code>&lt;h1&gt;</code> (styled as just another
            crumb), marked <code>aria-current="page"</code>. Every part is
            optional — this one omits the <code>&lt;Toolbar&gt;</code>. Squeeze
            the window to watch the buttons wrap below the breadcrumb
            intrinsically; no breakpoints involved. Inside the app shell, the
            narrow-viewport hamburger slots into this strip automatically (see
            the App shell section).
          </Lead>
          <PageFrame>
            <Header>
              <Breadcrumb
                icon={<TruckIcon />}
                crumbs={[
                  { label: 'Outbound Shipments', to: '#/header' },
                  { label: 'OS-001024' },
                ]}
              />
              <HeaderButtons>
                <Button icon={<PlusCircleIcon />}>Add item</Button>
                <SplitButton
                  icon={<DownloadIcon />}
                  options={EXPORT_OPTIONS}
                  menuLabel="Export options"
                />
              </HeaderButtons>
            </Header>
            <PageBody />
          </PageFrame>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};
