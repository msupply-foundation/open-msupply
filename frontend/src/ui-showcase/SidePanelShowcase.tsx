import { createSignal, For, Show, type JSX } from 'solid-js';
import { MemoryRouter, Route } from '@solidjs/router';
import {
  SidePanel,
  SidePanelActions,
  SidePanelSection,
  SidePanelSubheading,
} from '../ui/layout/SidePanel/SidePanel';
import { FieldRow } from '../ui/elements/inputs/FieldRow';
import { TextField } from '../ui/elements/inputs/TextField';
import { TextArea } from '../ui/elements/inputs/TextArea';
import { NumberField } from '../ui/elements/inputs/NumberField';
import { DateField } from '../ui/elements/inputs/DateField';
import { Select } from '../ui/elements/selectors/Select';
import { Button } from '../ui/elements/buttons/Button';
import { IconButton } from '../ui/elements/buttons/IconButton';
import { CopyToClipboardButton } from '../ui/elements/buttons/CopyToClipboardButton';
import { ColourTagPicker } from '../ui/elements/selectors/ColourTag';
import { RecordLink } from '../ui/elements/typography/RecordLink';
import { Text } from '../ui/elements/typography/Text';
import { HStack } from '../ui/layout/Stack/HStack';
import { Popover } from '../ui/elements/feedback/Popover';
import { InfoTooltip } from '../ui/elements/feedback/InfoTooltip';
import { CopyIcon, EditIcon, TrashIcon } from '../ui/icons';
import { useIsNavOverlay } from '../ui/utils/createMediaQuery';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import {
  AnatomyTree,
  Lead,
  Note,
  Row,
  SectionTOC,
  type AnatomyNode,
} from './common';
import type { PageMetadata } from './metadata';
import styles from './SidePanelShowcase.module.css';

export const sidePanelMetadata: PageMetadata = {
  id: 'side-panel',
  title: 'Side panel',
  searchTerms: ['drawer', 'details', 'detail panel'],
  items: [
    {
      id: 'side-panel-inbound',
      title: 'Inbound shipment panel',
      searchTerms: ['detail panel', 'charges', 'transport', 'supplier'],
    },
    {
      id: 'side-panel-outbound',
      title: 'Outbound shipment panel',
      searchTerms: ['detail panel', 'invoice', 'customer', 'requisition'],
    },
    {
      id: 'side-panel-anatomy',
      title: 'Anatomy',
      searchTerms: ['nesting', 'structure', 'parts'],
    },
    {
      id: 'side-panel-building-blocks',
      title: 'Building blocks',
      searchTerms: [
        'components',
        'section',
        'subheading',
        'field row',
        'actions',
      ],
    },
  ],
};

/* How the parts nest — the visual companion to the composition contract
 * (src/ui/docs/SIDE_PANEL.md). One node per building block, noted with the one
 * job it owns; keep it in step with the real panels' assembly. */
const ANATOMY: AnatomyNode[] = [
  {
    name: 'SidePanel',
    note: 'the docked <aside>: sticky header (label + close) and its own scroll',
    children: [
      {
        name: 'SidePanelSection',
        note: 'a titled <h2>, usually collapsible — sections stack top to bottom',
        children: [
          {
            name: 'FieldRow',
            note: 'a label : value / control row — values share one aligned column',
          },
          {
            name: 'SidePanelSubheading',
            note: 'a bold ruled <h3> grouping rows; optional inline-end action',
          },
        ],
      },
      {
        name: 'SidePanelSection value="actions"',
        note: 'the last section, pinned at the panel foot',
        children: [
          {
            name: 'SidePanelActions',
            note: 'the record-action cluster — labelled buttons, one per row',
          },
        ],
      },
    ],
  },
];

// A plain home-currency formatter for the demo — the real panels format via
// the intl currency layer; here static representative values are enough.
const money = (value: number): string =>
  `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// A group sub-heading's content with a trailing info bubble — the icon sits
// AFTER the heading text (InfoTooltip's own wrapper supplies the gap). The
// bold weight comes from SidePanelSubheading's <h3>; the popover's own text
// stays regular (Popover panel sets its own weight).
const withInfo = (label: string, info: string): JSX.Element => (
  <span style={{ display: 'inline-flex', 'align-items': 'center' }}>
    {label}
    <InfoTooltip text={info} label={label} placement="bottom-start" />
  </span>
);

// A value with an inline action button (donor, currency): the value sits
// inline-start, the button justified to the far inline-end of the row.
const valueAction = (value: JSX.Element, action: JSX.Element): JSX.Element => (
  <span
    style={{
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'space-between',
      gap: 'var(--space-2)',
      'inline-size': '100%',
    }}
  >
    {value}
    {action}
  </span>
);

/*
 * Inbound shipment side panel — the sections top to bottom from the real
 * vertical (src/sections/inbound-shipments/detail/InboundShipmentSidePanel):
 * Additional info · Related documents · Charges (stock / service / foreign
 * currency / grand total) · Transport details (transfers only) · Actions.
 * Populated with representative static data for a transfer awaiting receipt.
 */
const InboundPanelContent = () => {
  const [colour, setColour] = createSignal('#05a660');
  const [comment, setComment] = createSignal(
    'Cold-chain vaccines — verify temperature logs before receiving.'
  );
  const [stockTax, setStockTax] = createSignal(15);
  const [serviceTax, setServiceTax] = createSignal(5);

  const stockSubtotal = 12450;
  const serviceLines = [
    { itemName: 'Freight', totalBeforeTax: 320 },
    { itemName: 'Insurance', totalBeforeTax: 85 },
  ];
  const serviceSubtotal = 405;
  const currencyRate = 1.62;

  const stockTaxAmount = () => (stockSubtotal * stockTax()) / 100;
  const stockTotal = () => stockSubtotal + stockTaxAmount();
  const serviceTaxAmount = () => (serviceSubtotal * serviceTax()) / 100;
  const serviceTotal = () => serviceSubtotal + serviceTaxAmount();
  const grandTotal = () => stockTotal() + serviceTotal();
  const foreignTotal = () => grandTotal() * currencyRate;

  return (
    <>
      {/* Additional info --------------------------------------------------- */}
      <SidePanelSection
        value="additional-info"
        title="Additional info"
        collapsible
      >
        <FieldRow label="Donor">
          {valueAction(
            <span>The Global Fund</span>,
            <IconButton
              bordered
              size="small"
              icon={<EditIcon />}
              label="Edit donor"
              onClick={() => {}}
            />
          )}
        </FieldRow>
        <FieldRow label="Edited by">
          <span>b.mwangi</span>
        </FieldRow>
        <FieldRow label="Created">
          <span>24 Jul 2026</span>
        </FieldRow>
        <FieldRow label="Colour">
          <ColourTagPicker colour={colour()} onSelect={setColour} />
        </FieldRow>
        <FieldRow label="Comment">
          <TextArea
            label="Comment"
            hideLabel
            width="full"
            value={comment()}
            onInput={e => setComment(e.currentTarget.value)}
          />
        </FieldRow>
      </SidePanelSection>

      {/* Related documents ------------------------------------------------- */}
      <SidePanelSection
        value="related-documents"
        title="Related documents"
        collapsible
      >
        <FieldRow label="Purchase order">
          <RecordLink href="/demo" kind="po">
            PO-000384
          </RecordLink>
        </FieldRow>
        <FieldRow label="Internal order">
          <RecordLink href="/demo" kind="io">
            IO-000112
          </RecordLink>
        </FieldRow>
      </SidePanelSection>

      {/* Charges ----------------------------------------------------------- */}
      <SidePanelSection value="charges" title="Charges" collapsible>
        <SidePanelSubheading>Stock charges</SidePanelSubheading>
        <FieldRow label="Sub-total">
          <span>{money(stockSubtotal)}</span>
        </FieldRow>
        <FieldRow label="Tax">
          {/* Trial: the calculated tax amount as the input's helper text
              (below the field) instead of a value off to its right. */}
          <NumberField
            label="Stock tax"
            hideLabel
            size="small"
            value={stockTax()}
            min={0}
            max={100}
            decimalLimit={2}
            endAdornment="%"
            helperText={money(stockTaxAmount())}
            onChange={value => setStockTax(value ?? 0)}
          />
        </FieldRow>
        <FieldRow label="Total">
          <span>{money(stockTotal())}</span>
        </FieldRow>

        <SidePanelSubheading
          action={
            <IconButton
              bordered
              size="small"
              icon={<EditIcon />}
              label="Edit service charges"
              onClick={() => {}}
            />
          }
        >
          Service charges
        </SidePanelSubheading>
        <For each={serviceLines}>
          {line => (
            <FieldRow label={line.itemName}>
              <span>{money(line.totalBeforeTax)}</span>
            </FieldRow>
          )}
        </For>
        <FieldRow label="Sub-total">
          <span>{money(serviceSubtotal)}</span>
        </FieldRow>
        <FieldRow label="Tax">
          <NumberField
            label="Service tax"
            hideLabel
            size="small"
            value={serviceTax()}
            min={0}
            max={100}
            decimalLimit={2}
            endAdornment="%"
            helperText={money(serviceTaxAmount())}
            onChange={value => setServiceTax(value ?? 0)}
          />
        </FieldRow>
        <FieldRow label="Total">
          <span>{money(serviceTotal())}</span>
        </FieldRow>

        <FieldRow label="Currency">
          {valueAction(
            <span>NZD @ {currencyRate}</span>,
            <IconButton
              bordered
              size="small"
              icon={<EditIcon />}
              label="Change currency"
              onClick={() => {}}
            />
          )}
        </FieldRow>
        <FieldRow label="Foreign currency total">
          <span>{money(foreignTotal())}</span>
        </FieldRow>

        <FieldRow label={<strong>Grand total</strong>}>
          <strong>{money(grandTotal())}</strong>
        </FieldRow>
      </SidePanelSection>

      {/* Transport details (transfers only) -------------------------------- */}
      <SidePanelSection
        value="transport-details"
        title="Transport details"
        collapsible
      >
        <FieldRow label="Shipping method">
          <span>Air freight</span>
        </FieldRow>
        <FieldRow label="Expected delivery date">
          <span>05 Aug 2026</span>
        </FieldRow>
        <FieldRow label="Transport reference">
          <span>TRN-88213</span>
        </FieldRow>
      </SidePanelSection>

      {/* Actions ----------------------------------------------------------- */}
      <SidePanelSection value="actions" title="Actions">
        <SidePanelActions>
          <Button variant="danger" icon={<TrashIcon />} onClick={() => {}}>
            Delete
          </Button>
          <Button variant="secondary" icon={<CopyIcon />} onClick={() => {}}>
            Make a copy
          </Button>
          <CopyToClipboardButton
            load={() => ({
              invoiceNumber: 'INB-000128',
              supplier: 'Gavi Alliance',
              status: 'NEW',
            })}
          />
        </SidePanelActions>
      </SidePanelSection>
    </>
  );
};

/*
 * Outbound shipment side panel — the sections from the real vertical
 * (src/sections/outbound-shipments/detail/OutboundSidePanel): Additional info ·
 * Related documents · Invoice details (service charges / items sell price /
 * grand total / foreign currency) · Transport details · Actions. Populated for
 * a NEW shipment to a customer.
 */
const OutboundPanelContent = () => {
  const [colour, setColour] = createSignal('#004fc4');
  const [comment, setComment] = createSignal(
    'Urgent — dispatch with Friday courier run.'
  );
  const [reference, setReference] = createSignal('OUT-REF-4471');
  const [expectedDelivery, setExpectedDelivery] = createSignal<string | null>(
    '2026-08-05'
  );
  const [pickedDate, setPickedDate] = createSignal<string | null>(null);
  const [shippingMethod, setShippingMethod] = createSignal('road');
  const [stockTax, setStockTax] = createSignal(10);

  const serviceLines = [{ itemName: 'Handling', totalBeforeTax: 45 }];
  const serviceSubtotal = 45;
  const serviceAfterTax = 47.25;
  const serviceTaxAmount = serviceAfterTax - serviceSubtotal;
  const serviceEffectivePct = (serviceTaxAmount / serviceSubtotal) * 100;
  const itemsSubtotal = 8920;

  const itemsTaxAmount = () => (itemsSubtotal * stockTax()) / 100;
  const itemsTotal = () => itemsSubtotal + itemsTaxAmount();
  const grandTotal = () => serviceAfterTax + itemsTotal();

  return (
    <>
      {/* Additional info --------------------------------------------------- */}
      <SidePanelSection
        value="additional-info"
        title="Additional info"
        collapsible
      >
        <FieldRow label="Entered by">
          <HStack gap="sm">
            <Text variant="body" as="span">
              a.patel
            </Text>
            <InfoTooltip
              text="a.patel@ministryofhealth.gov"
              label="a.patel@ministryofhealth.gov"
            />
          </HStack>
        </FieldRow>
        <FieldRow label="Created">
          <Text variant="body">22 Jul 2026</Text>
        </FieldRow>
        <FieldRow label="Picked date">
          <DateField
            label="Picked date"
            hideLabel
            size="small"
            width="compact"
            format="dd/MM/yyyy"
            value={pickedDate()}
            onChange={setPickedDate}
          />
        </FieldRow>
        <FieldRow label="Colour">
          <ColourTagPicker
            colour={colour()}
            variant="field"
            onSelect={setColour}
          />
        </FieldRow>
        <FieldRow label="Comment">
          <TextArea
            label="Comment"
            hideLabel
            width="full"
            value={comment()}
            onInput={e => setComment(e.currentTarget.value)}
          />
        </FieldRow>
      </SidePanelSection>

      {/* Related documents ------------------------------------------------- */}
      <SidePanelSection
        value="related-documents"
        title="Related documents"
        collapsible
      >
        <Text variant="body">
          <Popover trigger="Requisition" openOnHover placement="top">
            <p>Customer requisition created on 20 Jul 2026 by a.patel</p>
          </Popover>{' '}
          <RecordLink href="/demo" kind="io">
            #IO-000098
          </RecordLink>
        </Text>
      </SidePanelSection>

      {/* Invoice details --------------------------------------------------- */}
      <SidePanelSection
        value="invoice-details"
        title="Invoice details"
        collapsible
      >
        <SidePanelSubheading
          action={
            <IconButton
              bordered
              size="small"
              icon={<EditIcon />}
              label="Edit service charges"
              onClick={() => {}}
            />
          }
        >
          {withInfo(
            'Service charges',
            'Charges for services such as freight, handling or insurance.'
          )}
        </SidePanelSubheading>
        <For each={serviceLines}>
          {line => (
            <FieldRow label={line.itemName}>
              <Text variant="body">{money(line.totalBeforeTax)}</Text>
            </FieldRow>
          )}
        </For>
        <FieldRow label="Sub-total">
          <Text variant="body">{money(serviceSubtotal)}</Text>
        </FieldRow>
        <FieldRow label={`Tax (${serviceEffectivePct.toFixed(2)}%)`}>
          <Text variant="body">{money(serviceTaxAmount)}</Text>
        </FieldRow>
        <FieldRow label="Total">
          <Text variant="body">{money(serviceAfterTax)}</Text>
        </FieldRow>

        <SidePanelSubheading>
          {withInfo(
            'Item sell price',
            'The sell price charged to the customer for the stock lines.'
          )}
        </SidePanelSubheading>
        <FieldRow label="Sub-total">
          <Text variant="body">{money(itemsSubtotal)}</Text>
        </FieldRow>
        <FieldRow label={`Tax (${stockTax().toFixed(2)}%)`}>
          <NumberField
            label="Tax"
            hideLabel
            size="small"
            min={0}
            max={100}
            decimalLimit={2}
            value={stockTax()}
            helperText={money(itemsTaxAmount())}
            onChange={value => setStockTax(value ?? 0)}
          />
        </FieldRow>
        <FieldRow label="Total">
          <Text variant="body">{money(itemsTotal())}</Text>
        </FieldRow>

        <FieldRow
          label={
            <span style={{ 'font-weight': 'var(--weight-bold)' }}>
              Grand total
            </span>
          }
        >
          <Text variant="body">{money(grandTotal())}</Text>
        </FieldRow>

        <SidePanelSubheading
          action={
            <IconButton
              bordered
              size="small"
              icon={<EditIcon />}
              label="Change currency"
              onClick={() => {}}
            />
          }
        >
          Foreign currency
        </SidePanelSubheading>
        <FieldRow label="Code">
          <Text variant="body">USD</Text>
        </FieldRow>
        <FieldRow label="Rate">
          <Text variant="body">1</Text>
        </FieldRow>
        <FieldRow label="Total">
          <Text variant="body">—</Text>
        </FieldRow>
      </SidePanelSection>

      {/* Transport details ------------------------------------------------- */}
      <SidePanelSection
        value="transport-details"
        title="Transport details"
        collapsible
      >
        <FieldRow label="Shipping method">
          <Select
            label="Shipping method"
            hideLabel
            size="small"
            width="compact"
            value={shippingMethod()}
            onValueChange={setShippingMethod}
            options={[
              { value: 'road', label: 'Road' },
              { value: 'air', label: 'Air freight' },
              { value: 'sea', label: 'Sea freight' },
            ]}
          />
        </FieldRow>
        <FieldRow label="Expected delivery date">
          <DateField
            label="Expected delivery date"
            hideLabel
            size="small"
            width="compact"
            format="dd/MM/yyyy"
            value={expectedDelivery()}
            onChange={setExpectedDelivery}
          />
        </FieldRow>
        <FieldRow label="Reference">
          <TextField
            label="Reference"
            hideLabel
            size="small"
            width="full"
            value={reference()}
            onInput={e => setReference(e.currentTarget.value)}
          />
        </FieldRow>
      </SidePanelSection>

      {/* Actions ----------------------------------------------------------- */}
      <SidePanelSection value="actions" title="Actions">
        <SidePanelActions>
          <Button variant="danger" icon={<TrashIcon />} onClick={() => {}}>
            Delete
          </Button>
          <Button variant="secondary" icon={<CopyIcon />} onClick={() => {}}>
            Make a copy
          </Button>
          <CopyToClipboardButton
            load={() => ({
              invoiceNumber: 'OUT-000265',
              customer: 'Ministry of Health — Central Store',
              status: 'NEW',
            })}
          />
        </SidePanelActions>
      </SidePanelSection>
    </>
  );
};

type OpenPanel = 'inbound' | 'outbound' | null;

export const SidePanelShowcase = () => {
  const [open, setOpen] = createSignal<OpenPanel>(null);
  // Below the nav-overlay breakpoint the component itself doesn't render
  // (its known skeleton-stage gap), so the launch buttons would move nothing —
  // disable them rather than animate empty space.
  const isOverlay = useIsNavOverlay();

  return (
    // MemoryRouter: the RecordLinks in the related-documents sections need a
    // router context to render; here they resolve and are clickable but
    // navigate nowhere (the standalone showcase has no app router).
    <MemoryRouter>
      <Route
        path="*"
        component={() => (
          <ContentContainer size="form" align="start">
            <Stack gap="lg">
              <SectionTOC page={sidePanelMetadata} />
              <DashboardCard
                id="side-panel-inbound"
                title="Inbound shipment — detail panel"
              >
                <Lead>
                  The inbound-shipment detail panel, populated as a transfer
                  awaiting receipt: additional info (donor, colour, comment),
                  related documents, charges (stock / service / foreign currency
                  / grand total), and the transfer-only transport details, with
                  the record actions pinned at the panel's end.{' '}
                  <code>&lt;SidePanel&gt;</code> is pure layout — the page
                  composes <code>&lt;SidePanelSection&gt;</code>s of{' '}
                  <code>&lt;FieldRow&gt;</code>s. The button slides it out over
                  the page from the inline-end edge, full viewport height. Known
                  gap: below the nav-overlay breakpoint (1024px) the panel
                  doesn't render, so the button is disabled there.
                </Lead>
                <Row>
                  <Button
                    onClick={() =>
                      setOpen(o => (o === 'inbound' ? null : 'inbound'))
                    }
                    aria-expanded={open() === 'inbound'}
                    disabled={isOverlay()}
                  >
                    {open() === 'inbound'
                      ? 'Close inbound panel'
                      : 'Open inbound panel'}
                  </Button>
                </Row>
              </DashboardCard>

              <DashboardCard
                id="side-panel-outbound"
                title="Outbound shipment — detail panel"
              >
                <Lead>
                  The outbound-shipment detail panel, populated for a new
                  shipment to a customer: additional info (entered-by with email
                  tooltip, picked date, colour, comment), the originating
                  customer requisition, invoice details (service charges / item
                  sell price / grand total / foreign currency), and transport
                  details. Same layout primitives as the inbound panel — the
                  sections and pricing groups differ per vertical.
                </Lead>
                <Row>
                  <Button
                    onClick={() =>
                      setOpen(o => (o === 'outbound' ? null : 'outbound'))
                    }
                    aria-expanded={open() === 'outbound'}
                    disabled={isOverlay()}
                  >
                    {open() === 'outbound'
                      ? 'Close outbound panel'
                      : 'Open outbound panel'}
                  </Button>
                </Row>
              </DashboardCard>

              {/* The dev cheat sheet — anatomy + what each block is. The
                  binding rules (which block to reach for, input sizing,
                  helper-text figures, action placement) live in the
                  composition contract: src/ui/docs/SIDE_PANEL.md. */}
              <DashboardCard
                id="side-panel-anatomy"
                title="Anatomy — how the parts nest"
              >
                <Lead>
                  A panel is a stack of <code>&lt;SidePanelSection&gt;</code>s
                  inside a <code>&lt;SidePanel&gt;</code>; each section holds{' '}
                  <code>&lt;FieldRow&gt;</code>s, optionally grouped under a{' '}
                  <code>&lt;SidePanelSubheading&gt;</code>, and the last section
                  pins the record actions to the foot. The panel's own CSS owns
                  the look (alignment, spacing, sub-heading rule, helper-text
                  colour) — you compose the parts, you don't style them.
                </Lead>
                <AnatomyTree nodes={ANATOMY} />
              </DashboardCard>

              <DashboardCard
                id="side-panel-building-blocks"
                title="Building blocks"
              >
                <Lead>
                  What each part is and the one job it owns — the two panels
                  above are the live reference. For the <em>rules</em> (which
                  block to use where, input sizing, calculated figures, action
                  placement) follow the binding contract in{' '}
                  <code>src/ui/docs/SIDE_PANEL.md</code>.
                </Lead>
                <dl class={styles.blocks}>
                  <dt>
                    <code>&lt;SidePanel&gt;</code>
                  </dt>
                  <dd>
                    The docked <code>&lt;aside&gt;</code>. Pure layout with no
                    state of its own — takes a <code>label</code> (its heading +
                    accessible name) and an <code>onClose</code>; the page owns
                    the open/close boolean and composes the sections inside.
                  </dd>
                  <dt>
                    <code>&lt;SidePanelSection&gt;</code>
                  </dt>
                  <dd>
                    One titled group, rendered as an <code>&lt;h2&gt;</code>.
                    Needs a semantic <code>value</code> (kebab-case, stamped as
                    the <code>panel-section-*</code> testid) and a{' '}
                    <code>title</code>; add <code>collapsible</code> to make the
                    heading a disclosure. The final section (
                    <code>value="actions"</code>) is pinned to the panel foot.
                  </dd>
                  <dt>
                    <code>&lt;SidePanelSubheading&gt;</code>
                  </dt>
                  <dd>
                    A bold ruled <code>&lt;h3&gt;</code> that groups a set of
                    rows within a section (the pricing groups above). Optional{' '}
                    <code>action</code> slot pins a group-level control (an edit
                    button) to the inline-end.
                  </dd>
                  <dt>
                    <code>&lt;FieldRow&gt;</code>
                  </dt>
                  <dd>
                    A <code>label</code> : value/control row (from{' '}
                    <code>ui/elements/inputs</code>, not panel-specific). Inside
                    a panel every row shares one aligned label column and tight
                    rhythm — values line up whatever the label length.
                  </dd>
                  <dt>
                    <code>&lt;SidePanelActions&gt;</code>
                  </dt>
                  <dd>
                    The record-action cluster for the last section: labelled
                    buttons stacked one per row, inline-start (Delete · Make a
                    copy · Copy to clipboard). The one place labelled buttons
                    belong — everywhere else an inline action is a small
                    icon-only button.
                  </dd>
                </dl>
                <Note>
                  Everything visual — value alignment, row spacing, the
                  sub-heading rule, non-muted helper text, popover weight — is
                  enforced by <code>SidePanel.module.css</code>, so a panel
                  can't drift on the look. The contract only has to police the
                  handful of composition choices CSS can't make.
                </Note>
              </DashboardCard>
            </Stack>

            {/* One shared slide-out holder renders whichever panel is open. */}
            <div
              class={styles.panelHolder}
              data-open={open() ? 'true' : 'false'}
            >
              <Show when={open() === 'inbound'}>
                <SidePanel
                  label="Inbound shipment INB-000128"
                  onClose={() => setOpen(null)}
                >
                  <InboundPanelContent />
                </SidePanel>
              </Show>
              <Show when={open() === 'outbound'}>
                <SidePanel
                  label="Outbound shipment OUT-000265"
                  onClose={() => setOpen(null)}
                >
                  <OutboundPanelContent />
                </SidePanel>
              </Show>
            </div>
          </ContentContainer>
        )}
      />
    </MemoryRouter>
  );
};
