import { createSignal } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../ui/layout/Header/Toolbar';
import { HeaderToolbar } from '../ui/layout/Header/HeaderToolbar';
import { FormRowItem } from '../ui/layout/Form/FormRowItem';
import { Select } from '../ui/elements/selectors/Select';
import { Combobox } from '../ui/elements/selectors/Combobox';
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
  UserIcon,
} from '../ui/icons';
import {
  Lead,
  Note,
  PageBody,
  PageFrame,
  SectionTOC,
  ToolbarStub,
} from './common';
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

// Weighted variant: the prescription header's field mix — two person-name
// pickers, a program and a prominent custom field around a fixed-format date —
// the mix the weights exist for (#782): the date's text ("30 Jul 2026") asks
// for ~74px and can never grow, while a 26-character patient name needs ~220px
// of value room before it stops truncating. The pickers are the real header's
// control — a Combobox, whose magnifier / clear / chevron chrome eats ~90px of
// the slot before any name renders.
const PATIENTS = [
  'MOHAMED, DJIBRIL ABDULLAHI',
  'ADAMS, Cerys',
  'NDIAYE, Tomas',
];
const CLINICIANS = ['Dr Amina Garcia-Okonkwo', 'Dr Wei Liu'];
const PROGRAMS = ['HIV Care', 'TB Programme', 'Immunisation'];
// A prominent `option` custom field promoted into that same cluster.
const PRIORITIES = ['Routine', 'Urgent', 'Follow-up'];

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
      id: 'header-toolbar-weighted',
      title: 'Toolbar fields · weighted',
      searchTerms: [
        'weight',
        'form row item',
        'fr',
        'min width',
        'shares',
        'prescription',
      ],
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
  // The weighted variant's own fields (each demo owns its state, so editing one
  // never moves another). The pickers are Comboboxes over plain strings, so a
  // field's value IS its label; undefined is "nothing selected".
  const [patient, setPatient] = createSignal<string | undefined>(PATIENTS[0]);
  const [clinician, setClinician] = createSignal<string | undefined>(
    CLINICIANS[0]
  );
  const [prescribed, setPrescribed] = createSignal<string | null>('2026-05-19');
  const [program, setProgram] = createSignal<string | undefined>(PROGRAMS[0]);
  const [priority, setPriority] = createSignal<string | undefined>(
    PRIORITIES[0]
  );
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
            to watch the Alert drop to its own line. Its four fields carry data
            of comparable length, so equal shares are right here; a cluster
            whose data isn't — a person's name beside a formatted date —
            declares its shares instead, the next card.
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
                  options={SUPPLIERS}
                  value={supplier()}
                  onValueChange={setSupplier}
                />
                <TextField
                  label="Reference"
                  size="small"
                  value={reference()}
                  onInput={e => setReference(e.currentTarget.value)}
                />
                <DateField
                  label="Received"
                  size="small"
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
          id="header-toolbar-weighted"
          title="Toolbar fields — weighted shares, sized by the data"
        >
          <Lead>
            A prescription header, where the field mix makes the shares worth
            declaring: two person-name pickers and a program around a
            fixed-format date. A field's column is sized by its{' '}
            <strong>data</strong>, never by its count — so the equal shares of
            the card above only hold while every field carries comparably long
            data.
          </Lead>
          <Lead>
            <code>&lt;FormRowItem&gt;</code> wraps one item of the row and gives
            it three numbers: <code>weight</code>, its share of the whole row
            (the design standard's <code>fr</code>); <code>minWidth</code>, the
            floor it never shrinks below; and <code>maxWidth</code>, the ceiling
            it never grows past. A ceiling is for a field with no use for more
            room — its surplus flows on to the name fields instead, and if it
            wraps to a line of its own it stops stretching across the whole of
            it.
          </Lead>
          <Lead>
            The shipped numbers: Patient <code>1.9</code> from{' '}
            <code>11rem</code> and Clinician <code>1.55</code> hold person names
            (MOHAMED, DJIBRIL ABDULLAHI is 26 characters), Program{' '}
            <code>1.2</code>, a prominent custom field of kind option / number /
            date <code>0.9</code> between <code>9.5rem</code> and{' '}
            <code>14rem</code>, and the Date <code>{'weight={0}'}</code> —
            pinned to the <code>9rem</code> its fixed format can never outgrow,
            so every spare pixel goes to its siblings. Anything left unwrapped
            keeps the equal share; a compact <code>&lt;Alert&gt;</code> is never
            wrapped, or it loses the bottom-hug it gets as a direct child of the
            row.
          </Lead>
          <Lead>
            Squeeze the panel: the row still wraps as a unit, at the same width
            it wrapped unweighted. That's the floors' second job — they set the
            wrap point as well as the shrink order, so a cluster's floors must
            sum to no more than the unweighted row's would:{' '}
            <code>11 + 10 + 9 + 10 + 9.5 = 49.5rem</code> against five ×{' '}
            <code>10rem</code>.
          </Lead>
          <PageFrame>
            <Header>
              <Breadcrumb
                icon={<UserIcon />}
                crumbs={[{ label: 'Prescriptions' }, { label: 'P-000012' }]}
              />
              <HeaderButtons>
                <Button icon={<PlusCircleIcon />}>Add item</Button>
                <Button variant="secondary" icon={<PrinterIcon />}>
                  Export/Print
                </Button>
              </HeaderButtons>
              <HeaderToolbar>
                <FormRowItem weight={1.9} minWidth="11rem">
                  <Combobox<string>
                    label="Patient"
                    size="small"
                    items={PATIENTS}
                    itemToString={name => name}
                    value={patient()}
                    onChange={name => setPatient(name ?? undefined)}
                  />
                </FormRowItem>
                {/* Clinician and Program name no floor, so they inherit the
                    row's own 10rem. */}
                <FormRowItem weight={1.55}>
                  <Combobox<string>
                    label="Clinician"
                    size="small"
                    items={CLINICIANS}
                    itemToString={name => name}
                    value={clinician()}
                    onChange={name => setClinician(name ?? undefined)}
                  />
                </FormRowItem>
                <FormRowItem weight={0} minWidth="9rem">
                  <DateField
                    label="Date"
                    size="small"
                    format="dd MMM yyyy"
                    value={prescribed()}
                    onChange={setPrescribed}
                  />
                </FormRowItem>
                <FormRowItem weight={1.2}>
                  <Combobox<string>
                    label="Program"
                    size="small"
                    items={PROGRAMS}
                    itemToString={name => name}
                    value={program()}
                    onChange={name => setProgram(name ?? undefined)}
                  />
                </FormRowItem>
                {/* A prominent custom field, on the narrower share the cluster
                    gives an option / number / date one — and the ceiling that
                    keeps it from filling a line of its own once it wraps. */}
                <FormRowItem weight={0.9} minWidth="9.5rem" maxWidth="14rem">
                  <Combobox<string>
                    label="Priority"
                    size="small"
                    items={PRIORITIES}
                    itemToString={name => name}
                    value={priority()}
                    onChange={name => setPriority(name ?? undefined)}
                  />
                </FormRowItem>
              </HeaderToolbar>
            </Header>
            <PageBody />
          </PageFrame>
          <Note>
            Measured on the reference store's six-field header (#782): the
            Patient field's value room goes 45 → 87px at a ~1366px window and 57
            → 127px at ~1440px, and the full 26-character name fits from ~1680px
            up — it never fitted before. The two option fields give up 89 →
            66px, the trade the standard asks for, and the header's height and
            wrap point are unchanged at every width.
          </Note>
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
                  options={SUPPLIERS}
                  value={errorSupplier()}
                  onValueChange={setErrorSupplier}
                />
                <TextField
                  label="Reference"
                  size="small"
                  value={errorReference()}
                  onInput={e => setErrorReference(e.currentTarget.value)}
                />
                <DateField
                  label="Received"
                  size="small"
                  format="dd MMM yyyy"
                  value={received()}
                  error={receivedError()}
                  onChange={setReceived}
                />
                <Select
                  label="Category"
                  size="small"
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
                  options={STORE_OPTIONS}
                  value="android"
                  disabled
                />
                <TextField
                  label="Supplier reference"
                  size="small"
                  value=""
                  disabled
                />
                <Select
                  label="Reorder threshold MOS"
                  size="small"
                  options={MOS_OPTIONS}
                  value={reorderMos()}
                  onValueChange={setReorderMos}
                />
                <Select
                  label="Target MOS"
                  size="small"
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
