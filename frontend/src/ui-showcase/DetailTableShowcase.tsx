import { createMemo, createSignal, Show } from 'solid-js';
import { t } from '../intl';
import {
  DataTable,
  type CardGroup,
  type Column,
  type SortState,
} from '../ui/elements/table/DataTable';
import { getCellDefinition } from '../ui/elements/table/tableHelpers';
import {
  dateToIsoDate,
  localDayToUtc,
} from '../ui/elements/inputs/dateTimeConvert';
import {
  resolveTableConfig,
  type Band,
  type LayeredConfig,
  type TableConfig,
  type TableConfigKey,
} from '../ui/elements/table/tableConfig';
import { createMediaQuery } from '../ui/utils/createMediaQuery';
import { mediaQuery } from '../ui/styles/breakpoints';
import { Page } from '../ui/layout/Page/Page';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { HeaderToolbar } from '../ui/layout/Header/HeaderToolbar';
import { Tabs, TabList, TabPanel, type TabDef } from '../ui/elements/tabs/Tabs';
import {
  SidePanelSection,
  SidePanelActions,
} from '../ui/layout/SidePanel/SidePanel';
import { ContentFooter } from '../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../ui/elements/buttons/Button';
import { CheckboxButton } from '../ui/elements/buttons/CheckboxButton';
import { LineEditModal, type EditItem } from './LineEditModal';
import { SplitButton } from '../ui/elements/buttons/SplitButton';
import { Alert } from '../ui/elements/feedback/Alert';
import { ConfirmDialog } from '../ui/elements/feedback/ConfirmDialog';
import {
  StatusIndicator,
  type StatusStep,
} from '../ui/elements/feedback/StatusIndicator';
import { TextField } from '../ui/elements/inputs/TextField';
import { TextArea } from '../ui/elements/inputs/TextArea';
import { FieldRow } from '../ui/elements/inputs/FieldRow';
import { Select } from '../ui/elements/selectors/Select';
import { ColourTagPicker } from '../ui/elements/selectors/ColourTag';
import { DateField } from '../ui/elements/inputs/DateField';
import {
  ArrowRightIcon,
  CopyIcon,
  PlusCircleIcon,
  PrinterIcon,
  SidebarIcon,
  TrashIcon,
  TruckIcon,
} from '../ui/icons';
// Dev-only import of the REAL line row type from the inbound-shipments vertical
// — this page is a faithful mock of the actual detail-view line table, so its
// rows conform to the generated InboundLineFragment (kdd/type-safety). Showcase
// scaffolding is DCE'd from prod; the app never imports back the other way.
import type { InboundLineFragment } from '../sections/inbound-shipments/detail/inboundShipmentDetail.generated';

// The Detail-view-table demo: the SAME assembly as the details tab of the real
// InboundShipmentDetailView — a tabbed Page whose body is the shared DataTable
// of stock lines, with a selection footer. This models a MANUAL shipment with
// default store preferences, so it renders exactly the columns the real page
// would in that case (the PO-line / VVM / doses / auth-status / donor columns
// are preference- or kind-gated and don't apply here). No backend: sort /
// pagination / selection run over a static ~50-line dataset.
type Line = InboundLineFragment;

// The columns that carry a `sortKey` (a header click can sort by these).
type SortKey =
  | 'itemCode'
  | 'itemName'
  | 'batch'
  | 'expiryDate'
  | 'packSize'
  | 'locationName';

// Card-view grouping for the list card: the item NAME is the card title
// (headerPosition 'primary') and the pack quantity its badge; Code / Batch /
// Expiry / Unit form the always-shown default group (no cardGroup), and every
// remaining column drops into one collapsed "More details" disclosure so a
// list card stays scannable. Only one body group is declared — the rest is the
// default group. No labelKey → the disclosure header falls back to "More
// details".
type GroupKey = 'more';
const CARD_GROUPS: CardGroup<Line, GroupKey>[] = [
  { key: 'more', disclosure: 'closed' },
];

// The status footer's lifecycle steps — the MANUAL inbound flow
// (New → Delivered → Received → Verified). Reached stages carry the datetime
// they were hit, for the StatusIndicator's history popover.
const STATUS_STEPS: StatusStep[] = [
  { label: 'New', date: '2026-05-15' },
  { label: 'Delivered', date: '2026-05-18' },
  { label: 'Received', date: '2026-05-19' },
  { label: 'Verified' },
];

// Mirrors isPlaceholderLine in the real vertical (detail/inboundShipmentUpdate)
// — a stock-in line with nothing received and nothing shipped. Reproduced here
// (a 3-line pure predicate) so the dev-only showcase doesn't pull in the
// vertical's mutation module. The detail table de-emphasises these in the info
// tone (spec AC-V3).
const isPlaceholderLine = (
  line: Pick<Line, 'type' | 'numberOfPacks' | 'shippedNumberOfPacks'>
): boolean =>
  line.type === 'STOCK_IN' &&
  line.numberOfPacks === 0 &&
  !line.shippedNumberOfPacks;

const ITEMS = [
  { code: 'AMOX500', name: 'Amoxicillin 500mg capsules', unitName: 'Capsule' },
  { code: 'PARA500', name: 'Paracetamol 500mg tablets', unitName: 'Tablet' },
  { code: 'IBU200', name: 'Ibuprofen 200mg tablets', unitName: 'Tablet' },
  { code: 'MET850', name: 'Metformin 850mg tablets', unitName: 'Tablet' },
  { code: 'SALB100', name: 'Salbutamol 100mcg inhaler', unitName: 'Inhaler' },
  { code: 'OME20', name: 'Omeprazole 20mg capsules', unitName: 'Capsule' },
  { code: 'CEFT1G', name: 'Ceftriaxone 1g injection', unitName: 'Vial' },
  { code: 'ORS-SACHET', name: 'Oral rehydration salts', unitName: 'Sachet' },
];
const MANUFACTURERS = ['Cipla', 'Teva', 'Sun Pharma', 'Aurobindo', null, null];
const LOCATIONS: ({ code: string; name: string } | null)[] = [
  { code: 'A.01', name: 'Aisle A · Bay 01' },
  { code: 'A.02', name: 'Aisle A · Bay 02' },
  { code: 'COLD.1', name: 'Cold room · Shelf 1' },
  { code: 'B.11', name: 'Aisle B · Bay 11' },
  null,
];
const CAMPAIGNS = ['Measles 2026', 'COVID booster', null, null, null];
const NOTES = ['Check seal on arrival', 'Short-dated stock', '', '', ''];
const PACK_SIZES = [1, 10, 20, 24, 30, 50, 100];

// Supplier options for the header's editable "Supplier name" select.
const SUPPLIERS = [
  { value: 'acme', label: 'Acme Pharma' },
  { value: 'medicorp', label: 'MediCorp Wholesale' },
  { value: 'global', label: 'Global Meds Ltd' },
  { value: 'carepoint', label: 'CarePoint Distribution' },
];

// A stored instant for the given local calendar day, via the shared
// conversion — so the mock rows display the intended day in any timezone.
const isoDay = (month: number, day: number, year: number): string =>
  localDayToUtc(dateToIsoDate(new Date(year, month - 1, day)));

// Expiry dates are generated RELATIVE to today so the near-expiry error tone
// (getExpiryDateCell: ≤3 months out, past included) always has live examples
// no matter when the showcase is opened. `day` stays 1–28, so every month is
// safe.
const monthsFromNow = (months: number, day: number): string => {
  const now = new Date();
  const m = now.getMonth() + months;
  const year = now.getFullYear() + Math.floor(m / 12);
  return isoDay((((m % 12) + 12) % 12) + 1, day, year);
};

// A deterministic ~50-line dataset exercising every cell type: numbers,
// currency, dates, wrapping names, blank cells, placeholder (info-tone) rows,
// and a couple of transfer-linked lines whose code reads in the error tone.
const DATA: Line[] = Array.from({ length: 52 }, (_, i): Line => {
  const item = ITEMS[i % ITEMS.length];
  const placeholder = i % 16 === 9;
  const packSize = PACK_SIZES[i % PACK_SIZES.length];
  const numberOfPacks = placeholder ? 0 : ((i * 7) % 48) + 1;
  const shipped =
    i % 3 === 0 && !placeholder
      ? Math.max(0, numberOfPacks + ((i % 5) - 2))
      : null;
  const cost = Number((((i * 17) % 480) / 100 + 0.4).toFixed(2));
  const sell = Number((cost * 1.35).toFixed(2));
  const loc = LOCATIONS[i % LOCATIONS.length];
  const man = MANUFACTURERS[i % MANUFACTURERS.length];
  const camp = CAMPAIGNS[i % CAMPAIGNS.length];
  const month = (i % 12) + 1;
  const day = (i % 27) + 1;
  // A few lines already expired (2–3 months ago), a few inside the ≤3-month
  // warning window (0–2 months out — a 0 with an earlier day reads as just
  // expired), the rest safely 6–29 months out.
  const expiryMonths =
    i % 13 === 2 ? -((i % 3) + 1) : i % 9 === 5 ? (i % 7) % 3 : (i % 24) + 6;
  return {
    id: `line-${i + 1}`,
    type: 'STOCK_IN',
    itemId: `item-${i}`,
    itemName: item.name,
    itemCode: item.code,
    batch: i % 7 === 3 ? null : `BN${2000 + i * 3}`,
    expiryDate: i % 11 === 4 ? null : monthsFromNow(expiryMonths, day),
    manufactureDate: i % 5 === 0 ? isoDay(month, day, 2025) : null,
    packSize,
    numberOfPacks,
    shippedNumberOfPacks: shipped,
    shippedPackSize: shipped != null ? packSize : null,
    costPricePerPack: cost,
    sellPricePerPack: sell,
    foreignCurrencyPriceBeforeTax: null,
    totalBeforeTax: placeholder ? 0 : Number((cost * numberOfPacks).toFixed(2)),
    totalAfterTax: placeholder
      ? 0
      : Number((cost * numberOfPacks * 1.1).toFixed(2)),
    taxPercentage: 10,
    note: NOTES[i % NOTES.length] || null,
    volumePerPack: Number(((i % 5) * 0.25 + 0.1).toFixed(2)),
    status: null,
    // A line that arrived via another store's transfer can't be independently
    // deleted; its code flags in the error tone (spec AC-E9).
    linkedInvoiceId: i % 24 === 7 ? `inv-${i}` : null,
    locationId: loc ? `loc-${i}` : null,
    location: loc ? { id: `loc-${i}`, code: loc.code, name: loc.name } : null,
    vvmStatusId: null,
    vvmStatus: null,
    stockLine: placeholder
      ? null
      : {
          id: `sl-${i}`,
          availableNumberOfPacks: numberOfPacks,
          totalNumberOfPacks: numberOfPacks,
        },
    item: {
      id: `item-${i}`,
      code: item.code,
      name: item.name,
      unitName: item.unitName,
      isVaccine: false,
      doses: 1,
      defaultPackSize: packSize,
    },
    donor: null,
    manufacturer: man ? { id: `man-${i}`, name: man } : null,
    reasonOption: null,
    campaign: camp ? { id: `camp-${i}`, name: camp } : null,
    program: null,
    itemVariant: null,
    purchaseOrderLine: null,
  };
});

// A line the last bulk operation failed on — reads in the error tone (spec S8);
// error wins over the placeholder info tone.
const ERROR_IDS = new Set(['line-4']);

const sortValue = (l: Line, key: SortKey): string | number => {
  switch (key) {
    case 'itemCode':
      return l.itemCode;
    case 'itemName':
      return l.itemName;
    case 'batch':
      return l.batch ?? '';
    case 'expiryDate':
      return l.expiryDate ?? '';
    case 'packSize':
      return l.packSize;
    case 'locationName':
      return l.location?.name ?? '';
  }
};

// The real page's default column config: the base table hides Manufacture date,
// Manufacturer, Note and Pack sell price (inbound-shipment-detail defaults).
const DEFAULT_CONFIG: LayeredConfig = {
  base: {
    // Pin the spec's ⭐ default density. Left unset, the DataTable falls back to
    // the nav-overlay responsive default (spacious below 1024px), which trips
    // in a narrower/embedded browser; the demo should open at comfortable.
    viewDensity: 'comfortable',
    columnVisibility: {
      manufactureDate: false,
      manufacturer: false,
      note: false,
      sellPricePerPack: false,
    },
  },
};

const TABS: TabDef[] = [
  { value: 'details', label: t('label.details') },
  { value: 'documents', label: t('label.documents') },
  { value: 'log', label: t('label.log') },
];

// A minimal placeholder for the non-table tabs (Documents / Log) — out of scope
// for a table-focused demo, but present so the tab strip behaves like the real
// page.
const OutOfScopePanel = (props: { label: string }) => (
  <div
    style={{
      padding: 'var(--space-6)',
      color: 'var(--text-secondary)',
      'text-align': 'center',
    }}
  >
    The {props.label} tab is out of scope for this table demo.
  </div>
);

export const DetailTableShowcase = () => {
  const [activeTab, setActiveTab] = createSignal('details');
  const [sort, setSort] = createSignal<SortState<SortKey>>({
    key: 'itemName',
    desc: false,
  });
  const [offset, setOffset] = createSignal(0);
  const [pageSize, setPageSize] = createSignal(20);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);

  // The line the Line Edit modal is open on (a row click), or null when closed.
  // The real page opens the batch editor here; the showcase mirrors it.
  const [editItem, setEditItem] = createSignal<EditItem | null>(null);
  const [editorOpen, setEditorOpen] = createSignal(false);
  // Open the line editor on a row (UPDATE) or from "Add item" (ADD — null item,
  // active selector).
  const openEditor = (item: EditItem | null) => {
    setEditItem(item);
    setEditorOpen(true);
  };

  // The side panel (opened from the header's More button, closed from its own
  // header — the Page frame owns the panel chrome; the page owns only this
  // boolean).
  const [sidePanelOpen, setSidePanelOpen] = createSignal(false);

  // The status footer's On-hold toggle. Toggling confirms first (like the real
  // inbound footer), so the CheckboxButton opens a ConfirmDialog rather than
  // flipping directly.
  const [onHold, setOnHold] = createSignal(false);
  const [holdConfirm, setHoldConfirm] = createSignal(false);

  // Editable header fields (Supplier name, Their reference) + the side panel's
  // editable Colour / Comment. Live local state; a real vertical would flush
  // these to the update mutation.
  const [supplier, setSupplier] = createSignal('acme');
  const [reference, setReference] = createSignal('DEL-2231');
  const [colour, setColour] = createSignal<string | null>(null);
  const [comment, setComment] = createSignal('');

  // Local column config, standing in for createTableConfig (see the List-page
  // demo for the rationale). DEFAULT_CONFIG seeds the real detail table's
  // starting visibility; the DataTable's column settings menu writes the user
  // layer via setConfig.
  const [layered, setLayered] = createSignal<LayeredConfig>({});
  const isCompact = createMediaQuery(mediaQuery.compact);
  const activeBand = (): Band => (isCompact() ? 'compact' : 'base');
  const tableConfig = () =>
    resolveTableConfig(activeBand(), {
      default: DEFAULT_CONFIG,
      user: layered(),
    });
  const setBandConfig = <K extends TableConfigKey>(
    band: Band,
    key: K,
    value: TableConfig[K]
  ) =>
    setLayered(current => ({
      ...current,
      [band]: { ...current[band], [key]: value },
    }));
  const setConfig = <K extends TableConfigKey>(key: K, value: TableConfig[K]) =>
    setBandConfig(activeBand(), key, value);
  // Local stand-in for createTableConfig's isConfigDefault: no user overrides
  // at the current band (`== null` counts the table Reset's explicit
  // `undefined` writes as cleared) → the Settings popover's Reset disables.
  const isConfigDefault = (): boolean => {
    const bandConfig = layered()[activeBand()];
    return (
      !bandConfig || Object.values(bandConfig).every(value => value == null)
    );
  };

  // Stand in for the server: sort the whole dataset, then slice the page.
  const sorted = createMemo(() => {
    const { key, desc } = sort();
    return [...DATA].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return desc ? -cmp : cmp;
    });
  });
  const rows = () => sorted().slice(offset(), offset() + pageSize());

  const onSort = (key: SortKey, desc: boolean) => {
    setSort({ key, desc });
    setOffset(0);
  };

  const columns = (): Column<Line, SortKey, GroupKey>[] => [
    {
      c: { accessor: line => line.itemCode, id: 'itemCode' },
      sortKey: 'itemCode',
      header: () => t('label.code'),
      ...getCellDefinition<Line>('itemCode'),
      cell: info => {
        const line = info.row.original;
        return (
          <span
            style={
              line.linkedInvoiceId ? { color: 'var(--error-main)' } : undefined
            }
          >
            {line.itemCode}
          </span>
        );
      },
    },
    {
      c: { key: 'itemName' },
      sortKey: 'itemName',
      header: () => t('label.name'),
      ...getCellDefinition<Line>('itemName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
    },
    {
      c: { key: 'batch' },
      sortKey: 'batch',
      header: () => t('label.batch'),
      ...getCellDefinition<Line>('batch'),
    },
    {
      c: { key: 'expiryDate' },
      sortKey: 'expiryDate',
      header: () => t('label.expiry'),
      ...getCellDefinition<Line>('expiryDate'),
    },
    {
      c: { accessor: line => line.location?.code ?? '', id: 'location' },
      sortKey: 'locationName',
      header: () => t('label.location'),
      cardGroup: 'more',
      ...getCellDefinition<Line>('location'),
    },
    {
      c: { accessor: line => line.item?.unitName ?? '', id: 'unitName' },
      header: () => t('label.unit'),
      ...getCellDefinition<Line>('unitName'),
    },
    {
      c: { key: 'packSize' },
      sortKey: 'packSize',
      header: () => t('label.pack-size'),
      cardGroup: 'more',
      ...getCellDefinition<Line>('packSize'),
    },
    {
      c: { key: 'numberOfPacks' },
      header: () => t('label.pack-quantity'),
      // Badge cells drop their label by default; keep it so the card's chip
      // reads "Num. of packs: 12", not a bare number.
      ...getCellDefinition<Line>('numberOfPacks', {
        headerPosition: 'badge',
        showLabel: true,
      }),
    },
    {
      // Difference — shipped minus received; blank when nothing shipped.
      c: {
        accessor: line =>
          line.shippedNumberOfPacks != null
            ? line.shippedNumberOfPacks - line.numberOfPacks
            : '',
        id: 'difference',
      },
      header: () => t('label.difference'),
      cardGroup: 'more',
      ...getCellDefinition<Line>('difference'),
    },
    {
      c: {
        accessor: line => line.packSize * line.numberOfPacks,
        id: 'unitQuantity',
      },
      header: () => t('label.unit-quantity'),
      cardGroup: 'more',
      ...getCellDefinition<Line>('unitQuantity'),
    },
    {
      c: { key: 'costPricePerPack' },
      header: () => t('label.pack-cost-price'),
      cardGroup: 'more',
      ...getCellDefinition<Line>('costPricePerPack'),
    },
    {
      c: { key: 'sellPricePerPack' },
      header: () => t('label.pack-sell-price'),
      cardGroup: 'more',
      ...getCellDefinition<Line>('sellPricePerPack'),
    },
    {
      c: {
        accessor: line => (isPlaceholderLine(line) ? null : line.totalAfterTax),
        id: 'total',
      },
      header: () => t('label.total'),
      cardGroup: 'more',
      ...getCellDefinition<Line>('total'),
    },
    {
      c: {
        accessor: line => line.manufacturer?.name ?? '',
        id: 'manufacturer',
      },
      header: () => t('label.manufacturer'),
      cardGroup: 'more',
      ...getCellDefinition<Line>('manufacturer'),
    },
    {
      c: { key: 'manufactureDate' },
      header: () => t('label.manufacture-date'),
      cardGroup: 'more',
      ...getCellDefinition<Line>('manufactureDate'),
    },
    {
      c: {
        accessor: line => line.campaign?.name ?? line.program?.name ?? '',
        id: 'campaignProgram',
      },
      header: () => t('label.campaign'),
      cardGroup: 'more',
    },
    {
      c: { key: 'note' },
      header: () => t('label.note'),
      cardGroup: 'more',
      ...getCellDefinition<Line>('note'),
    },
  ];

  return (
    <Tabs value={activeTab()} onValueChange={setActiveTab}>
      <Page
        fillBody
        sidePanelOpen={sidePanelOpen()}
        sidePanelTitle={t('heading.details')}
        onSidePanelClose={() => setSidePanelOpen(false)}
        sidePanelContent={
          // The detail side panel (spec S3): the additional-info / related-docs
          // / charges sections + a record-action cluster, each a titled,
          // collapsible SidePanelSection. In the narrow drawer, label-LEFT
          // FieldRows are the right call (unlike the header, which is wide);
          // read-only facts are plain values, editable ones the real inputs.
          <>
            <SidePanelSection
              value="additional-info"
              title="Additional info"
              collapsible
            >
              <FieldRow label="Edited by">
                <span>Developer</span>
              </FieldRow>
              <FieldRow label="Created">
                <span>19/05/2026</span>
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
            <SidePanelSection
              value="related-documents"
              title="Related documents"
              collapsible
            >
              <span>No related documents</span>
            </SidePanelSection>
            <SidePanelSection value="charges" title="Charges" collapsible>
              <FieldRow label="Sub-total">
                <span>$1,284.50</span>
              </FieldRow>
              <FieldRow label="Tax (10%)">
                <span>$128.45</span>
              </FieldRow>
              <FieldRow label="Grand total">
                <strong>$1,412.95</strong>
              </FieldRow>
            </SidePanelSection>
            <SidePanelSection value="actions" title="Actions">
              <SidePanelActions>
                <Button variant="secondary" icon={<CopyIcon />}>
                  Duplicate
                </Button>
                <Button variant="secondary" icon={<CopyIcon />}>
                  Copy to clipboard
                </Button>
              </SidePanelActions>
            </SidePanelSection>
          </>
        }
        header={
          <Header>
            <Breadcrumb
              icon={<TruckIcon />}
              crumbs={[{ label: t('inbound-shipment') }, { label: '27' }]}
            />
            <HeaderButtons>
              <SplitButton
                icon={<PlusCircleIcon />}
                value="item"
                menuLabel={t('button.add-item')}
                options={[
                  { value: 'item', label: t('button.add-item') },
                  {
                    value: 'masterList',
                    label: t('label.add-from-master-list'),
                  },
                ]}
                // Both options open the editor in ADD mode (no master-list
                // flow in the showcase) — an active item search, empty until an
                // item is picked.
                onAction={() => openEditor(null)}
              />
              <Button variant="secondary" icon={<PrinterIcon />}>
                {t('button.export-or-print')}
              </Button>
              {/* More — the side-panel reopen affordance, shown only while the
                  panel is closed (its own header carries the close). */}
              <Show when={!sidePanelOpen()}>
                <Button
                  variant="secondary"
                  icon={<SidebarIcon />}
                  onClick={() => setSidePanelOpen(true)}
                >
                  {t('button.more')}
                </Button>
              </Show>
            </HeaderButtons>
            {/* The header field cluster via HeaderToolbar (Carl 2026-07-27):
                fields flow into its FormRow (equal shares at a 10rem min by
                default — a field whose data needs a different share wraps in a
                FormRowItem — growing to fill and wrapping as a unit); the
                compact Alert goes
                to the `alert` prop, rendered as a content-hugging chip pinned to
                the bottom baseline. Fields take width="full" to fill the share. */}
            <HeaderToolbar
              alert={
                <Alert severity="info" compact>
                  Created manually; status won't update automatically.
                </Alert>
              }
            >
              <Select
                label={t('label.supplier-name')}
                size="small"
                width="full"
                options={SUPPLIERS}
                value={supplier()}
                onValueChange={setSupplier}
              />
              <TextField
                label={t('label.reference')}
                size="small"
                width="full"
                value={reference()}
                onInput={e => setReference(e.currentTarget.value)}
              />
              <DateField
                label={t('label.received')}
                size="small"
                width="full"
                format="dd MMM yyyy"
                value="2026-05-19"
                disabled
              />
            </HeaderToolbar>
            <TabList tabs={TABS} />
          </Header>
        }
        contentFooter={
          // The inbound-shipment status footer (mirrors the real detail view):
          // the On-hold toggle (confirm before toggling), the lifecycle
          // StatusIndicator (history on hover), and the status-change action.
          <ContentFooter>
            <CheckboxButton
              checked={onHold()}
              onChange={() => setHoldConfirm(true)}
            >
              {t('label.hold')}
            </CheckboxButton>
            <StatusIndicator steps={STATUS_STEPS} current={2} />
            <ContentFooterActions>
              <SplitButton
                icon={<ArrowRightIcon />}
                value="verified"
                menuLabel={t('label.status')}
                options={[
                  {
                    value: 'verified',
                    label: `${t('button.confirm')} Verified`,
                  },
                ]}
                onAction={() => {}}
              />
            </ContentFooterActions>
            {/* Toggling hold confirms first, like the real inbound footer. */}
            <ConfirmDialog
              open={holdConfirm()}
              onClose={() => setHoldConfirm(false)}
              title={t('heading.are-you-sure')}
              message={
                onHold()
                  ? t('messages.off-hold-confirmation')
                  : t('messages.on-hold-confirmation')
              }
              onConfirm={() => {
                setOnHold(v => !v);
                setHoldConfirm(false);
              }}
            />
          </ContentFooter>
        }
      >
        <TabPanel value="details">
          <DataTable
            columns={columns()}
            cardGroups={CARD_GROUPS}
            rows={rows()}
            rowKey={line => line.id}
            sort={sort()}
            onSort={onSort}
            // Offer the card ⇄ table toggle above the compact band (below 600px
            // the list is card-only). Card view surfaces the Sort control.
            showCardToggle
            // The real page opens the line-edit modal on row click; the
            // showcase opens the Line Edit modal on the clicked line's item.
            onRowClick={line =>
              openEditor({
                id: line.itemId,
                code: line.itemCode,
                name: line.itemName,
                unitName: line.item?.unitName ?? null,
              })
            }
            // A failed-bulk-op line reads in the error tone; an untouched
            // placeholder in the info tone. Error wins when both hold.
            rowTone={line =>
              ERROR_IDS.has(line.id)
                ? 'error'
                : isPlaceholderLine(line)
                  ? 'info'
                  : undefined
            }
            emptyMessage={t('error.no-inbound-items')}
            enableSelection
            selectedIds={selectedIds()}
            onSelectionChange={setSelectedIds}
            // The bulk action for the table's selection footer (the table
            // adds the count + Clear and swaps its pager for the bar while
            // lines are selected). Inert (demo only).
            selectionActions={
              <Button variant="danger" icon={<TrashIcon />}>
                Delete
              </Button>
            }
            config={tableConfig()}
            setConfig={setConfig}
            configIsDefault={isConfigDefault()}
            pagination={{
              offset: offset(),
              pageSize: pageSize(),
              total: DATA.length,
              onOffsetChange: setOffset,
              onPageSizeChange: size => {
                setPageSize(size);
                setOffset(0);
              },
            }}
          />
          <LineEditModal
            open={editorOpen()}
            item={editItem()}
            // The clicked item's batches — grouped by item CODE (the showcase's
            // itemId is unique per row; the code repeats), so opening a row
            // shows all that item's batch cards.
            lines={DATA.filter(l => l.itemCode === editItem()?.code)}
            onClose={() => setEditorOpen(false)}
          />
        </TabPanel>
        <TabPanel value="documents">
          <OutOfScopePanel label="Documents" />
        </TabPanel>
        <TabPanel value="log">
          <OutOfScopePanel label="Log" />
        </TabPanel>
      </Page>
    </Tabs>
  );
};
