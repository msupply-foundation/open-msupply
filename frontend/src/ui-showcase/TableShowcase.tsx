import { createMemo, createSignal, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { t } from '../intl';
import {
  DataTable,
  type Column,
  type SortState,
} from '../ui/elements/table/DataTable';
import {
  getCommentCell,
  getCurrencyCell,
  getDateCell,
  getNumberCell,
} from '../ui/elements/table/tableHelpers';
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
import { Button } from '../ui/elements/buttons/Button';
import { StatusChip } from '../ui/elements/feedback/StatusChip';
import {
  ColourTagPicker,
  TAG_COLOURS,
} from '../ui/elements/selectors/ColourTag';
import { FilterBar } from '../ui/elements/selectors/FilterBar';
import {
  CopyIcon,
  DownloadIcon,
  HomeIcon,
  PlusCircleIcon,
  TrashIcon,
  TruckIcon,
} from '../ui/icons';
// Dev-only imports from the REAL inbound-shipments vertical. This page is a
// faithful mock of the actual list (spec S1), so it reuses the generated row
// type, the real filter definitions and the pure status / linked-order helpers
// rather than forking lookalikes — the brand-critical bits (status → the
// --status-* tokens, PO/IO link colours) then stay defined in exactly one
// place. Showcase scaffolding is dead-code-eliminated from prod; the app never
// imports back the other way. See src/ui-showcase/README.md.
import type { InboundRowFragment } from '../sections/inbound-shipments/list/inboundShipments.generated';
import {
  filterFields,
  type InboundListFilter,
  type OriginKind,
} from '../sections/inbound-shipments/list/listFilters';
import {
  statusColour,
  statusLabel,
  supplierIsStore,
} from '../sections/inbound-shipments/detail/inboundShipmentStatus';
import { linkedOrderOf } from '../sections/inbound-shipments/linkedOrder';

// The List-page demo: the SAME assembly as the real InboundShipmentsList — a
// Page frame with a header (breadcrumb + New shipment), and the shared
// DataTable filling the body as the composition root of its own chrome
// (ui-standards § tables): the FilterBar in the table's toolbar, and the ONE
// footer bar that shows the pager by default and swaps to the selection
// action bar while rows are selected. No backend: filter / sort / pagination
// / selection run over a static 120-row dataset, filtered + sorted + sliced
// here to stand in for the server contract (the DataTable stays
// manual-sorting — it renders whatever page of rows it's handed). Rows
// conform to the generated InboundRowFragment (kdd/type-safety — state bound
// for the table IS the GraphQL type, never a parallel one).
type Row = InboundRowFragment;

// Only the columns that carry a `sortKey` — a header click can sort by these.
type SortKey =
  | 'otherPartyName'
  | 'status'
  | 'invoiceNumber'
  | 'createdDatetime'
  | 'deliveredDatetime'
  | 'theirReference';

// External suppliers read as a truck; the store suppliers (another store in the
// system) read as a house — the list's column-1 kind icon.
const EXTERNAL_SUPPLIERS = [
  'Acme Pharma',
  'MediCorp Wholesale',
  'Global Meds Ltd',
  'CarePoint Distribution',
  'BioSupply International',
  'Zenith Healthcare',
];
const STORE_SUPPLIERS = [
  'Central Warehouse',
  'Regional Hub — North',
  'District Store 4',
];
const STATUSES: Row['status'][] = [
  'NEW',
  'SHIPPED',
  'DELIVERED',
  'RECEIVED',
  'VERIFIED',
  'PICKED',
];
const COMMENTS = [
  'Urgent — cold chain',
  'Partial delivery expected',
  'Awaiting customs clearance',
  'Donation batch',
  '',
  '',
];
const REFERENCES = ['PO-4471', 'INV-9920', 'REF-0032', 'DEL-118', '', ''];
const COLOURS = TAG_COLOURS.map(c => c.value);

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (month: number, day: number, year = 2026) =>
  `${year}-${pad(month)}-${pad(day)}T09:30:00.000Z`;

// A deterministic 120-row dataset — enough to paginate and to exercise every
// cell type (status chips across the lifecycle, PO/IO links, colour swatches,
// blank vs present comment/reference/delivered, a spread of totals).
const DATA: Row[] = Array.from({ length: 120 }, (_, i): Row => {
  const isStore = i % 3 === 0;
  const supplier = isStore
    ? STORE_SUPPLIERS[i % STORE_SUPPLIERS.length]
    : EXTERNAL_SUPPLIERS[i % EXTERNAL_SUPPLIERS.length];
  const status = STATUSES[i % STATUSES.length];
  const delivered =
    status === 'DELIVERED' || status === 'RECEIVED' || status === 'VERIFIED';
  const origin = i % 4; // 0,1 → manual · 2 → purchase order · 3 → internal order
  const hasPo = origin === 2;
  const hasIo = origin === 3;
  const month = (i % 12) + 1;
  const day = (i % 27) + 1;
  return {
    id: `inb-${i + 1}`,
    invoiceNumber: 1200 - i,
    otherPartyName: supplier,
    otherPartyId: `party-${i}`,
    customFields: null,
    otherParty: { store: isStore ? { id: `store-${i}` } : null },
    status,
    onHold: i % 9 === 0,
    inboundType: hasPo
      ? 'FROM_PURCHASE_ORDER'
      : hasIo
        ? 'FROM_REQUISITION'
        : isStore
          ? 'MANUAL_INTERNAL'
          : 'MANUAL_EXTERNAL',
    colour: i % 5 === 0 ? COLOURS[i % COLOURS.length] : null,
    comment: COMMENTS[i % COMMENTS.length] || null,
    theirReference: REFERENCES[i % REFERENCES.length] || null,
    createdDatetime: isoDay(month, day),
    deliveredDatetime: delivered ? isoDay(month, Math.min(28, day + 3)) : null,
    purchaseOrderId: hasPo ? `po-${i}` : null,
    requisition: hasIo ? { id: `req-${i}`, requisitionNumber: 90 + i } : null,
    purchaseOrder: hasPo ? { id: `po-${i}`, number: 11 + i } : null,
    pricing: { totalAfterTax: Number((((i * 37) % 5000) + 12.5).toFixed(2)) },
  };
});

// The origin (Type) of a row, reconstructed the way the real query would — a PO
// link wins, then a requisition (internal order), else manual.
const originOf = (r: Row): OriginKind =>
  r.purchaseOrder
    ? 'fromPurchaseOrder'
    : r.requisition
      ? 'fromInternalOrder'
      : 'manual';

// Client-side stand-in for the server's filtering: honours the FilterBar fields
// the real list exposes (name, invoiceNumber, Type, status, reference, linked
// order number, created / delivered date ranges).
const matchesFilter = (r: Row, f: InboundListFilter): boolean => {
  const name = f.otherPartyName?.like;
  if (name && !r.otherPartyName.toLowerCase().includes(name.toLowerCase()))
    return false;
  const num = f.invoiceNumber?.equalTo;
  if (num != null && r.invoiceNumber !== num) return false;
  if (f.kind && originOf(r) !== f.kind) return false;
  const statuses = f.status?.equalAny;
  if (statuses && statuses.length && !statuses.map(String).includes(r.status))
    return false;
  const ref = f.theirReference?.like;
  if (
    ref &&
    !(r.theirReference ?? '').toLowerCase().includes(ref.toLowerCase())
  )
    return false;
  const linked = f.linkedOrderNumber?.equalTo;
  if (
    linked != null &&
    r.purchaseOrder?.number !== linked &&
    r.requisition?.requisitionNumber !== linked
  )
    return false;
  const cFrom = f.createdDatetime?.afterOrEqualTo;
  if (cFrom && r.createdDatetime < cFrom) return false;
  const cTo = f.createdDatetime?.beforeOrEqualTo;
  if (cTo && r.createdDatetime > cTo) return false;
  const dFrom = f.deliveredDatetime?.afterOrEqualTo;
  if (dFrom && (!r.deliveredDatetime || r.deliveredDatetime < dFrom))
    return false;
  const dTo = f.deliveredDatetime?.beforeOrEqualTo;
  if (dTo && (!r.deliveredDatetime || r.deliveredDatetime > dTo)) return false;
  return true;
};

const sortValue = (r: Row, key: SortKey): string | number => {
  switch (key) {
    case 'invoiceNumber':
      return r.invoiceNumber;
    case 'otherPartyName':
      return r.otherPartyName;
    case 'status':
      return r.status;
    case 'createdDatetime':
      return r.createdDatetime;
    case 'deliveredDatetime':
      return r.deliveredDatetime ?? '';
    case 'theirReference':
      return r.theirReference ?? '';
  }
};

// The real page's default column config: the base table hides Delivered /
// Reference / Total, and below 600px the list flips to card view and also drops
// the comment column (inboundShipments list createTableConfig defaults).
const DEFAULT_CONFIG: LayeredConfig = {
  base: {
    columnVisibility: {
      deliveredDatetime: false,
      theirReference: false,
      total: false,
    },
  },
  compact: {
    viewMode: 'card',
    columnVisibility: {
      deliveredDatetime: false,
      theirReference: false,
      total: false,
      comment: false,
    },
  },
};

export const TableShowcase = () => {
  const [sort, setSort] = createSignal<SortState<SortKey>>({
    key: 'invoiceNumber',
    desc: true,
  });
  const [filter, setFilter] = createSignal<InboundListFilter>({});
  const [offset, setOffset] = createSignal(0);
  const [pageSize, setPageSize] = createSignal(20);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);

  // The supplier colour swatch is editable inline (spec S1 column 1). No
  // backend: overrides live in a local store seeded from the dataset, so
  // picking a colour updates only that row's cell.
  const [colours, setColours] = createStore<Record<string, string | null>>(
    Object.fromEntries(DATA.map(r => [r.id, r.colour]))
  );

  // Local column config, standing in for createTableConfig (which needs store
  // context the standalone showcase doesn't have). The DataTable's own column
  // settings menu writes the `user` layer via setConfig; DEFAULT_CONFIG seeds
  // the real page's starting visibility, resolved per band against the actual
  // viewport (resize below 600px → the compact card layout).
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

  // Stand in for the server: filter, sort the whole dataset, then slice the
  // current page.
  const filtered = createMemo(() =>
    DATA.filter(r => matchesFilter(r, filter()))
  );
  const sorted = createMemo(() => {
    const { key, desc } = sort();
    return [...filtered()].sort((a, b) => {
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
  const total = () => filtered().length;

  const onSort = (key: SortKey, desc: boolean) => {
    setSort({ key, desc });
    setOffset(0);
  };
  const onFilterChange = (next: InboundListFilter) => {
    setFilter(next);
    setOffset(0);
    setSelectedIds([]);
  };

  // Footer gating, mirroring the real page: delete only while every selected
  // row is New; make-a-copy only for a single selection.
  const selectedRows = () => DATA.filter(r => selectedIds().includes(r.id));
  const allSelectedNew = () =>
    selectedRows().length > 0 && selectedRows().every(r => r.status === 'NEW');
  const singleSelected = () => selectedIds().length === 1;

  const columns = (): Column<Row, SortKey>[] => [
    {
      // Supplier — inline colour swatch + kind icon (house = another store,
      // truck = external supplier) + name.
      c: { accessor: row => row.otherPartyName, id: 'otherPartyName' },
      sortKey: 'otherPartyName',
      header: t('label.name'),
      meta: { card: { region: 'primary' } },
      cell: info => {
        const row = info.row.original;
        return (
          <span
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              gap: 'var(--space-2)',
            }}
          >
            {/* Stop the swatch's clicks opening the row (it edits in place). */}
            <span onClick={e => e.stopPropagation()}>
              <ColourTagPicker
                colour={colours[row.id]}
                onSelect={colour => setColours(row.id, colour)}
              />
            </span>
            {supplierIsStore(row) ? (
              <HomeIcon style={{ color: 'var(--primary-main)' }} />
            ) : (
              <TruckIcon style={{ color: 'var(--secondary-main)' }} />
            )}
            <span>{row.otherPartyName}</span>
          </span>
        );
      },
    },
    {
      c: { key: 'status' },
      sortKey: 'status',
      header: t('label.status'),
      cell: info => {
        const status = info.getValue<Row['status']>();
        return (
          <StatusChip
            label={statusLabel(status)}
            colour={statusColour(status)}
          />
        );
      },
      meta: { card: { region: 'badge' } },
    },
    {
      c: { key: 'invoiceNumber' },
      sortKey: 'invoiceNumber',
      header: '#',
      ...getNumberCell(),
    },
    {
      // Linked order — PO-<n> (secondary colour) or IO-<n> (primary colour),
      // blank otherwise. A plain anchor here (the standalone showcase has no
      // router); the real page uses the router's <A>.
      c: {
        accessor: row => linkedOrderOf('demo', row)?.label ?? '',
        id: 'linkedOrder',
      },
      header: t('label.linked-order'),
      cell: info => {
        const linked = linkedOrderOf('demo', info.row.original);
        return (
          <Show when={linked}>
            {l => (
              <a
                href={l().href}
                onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                style={{ color: l().colour, 'font-weight': 500 }}
              >
                {l().label}
              </a>
            )}
          </Show>
        );
      },
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: t('label.created'),
      ...getDateCell(),
    },
    {
      c: { key: 'deliveredDatetime' },
      sortKey: 'deliveredDatetime',
      header: t('label.delivered'),
      ...getDateCell(),
    },
    {
      c: { key: 'comment' },
      header: t('label.comment'),
      ...getCommentCell(),
    },
    {
      c: { key: 'theirReference' },
      sortKey: 'theirReference',
      header: t('label.reference'),
    },
    {
      c: { accessor: row => row.pricing.totalAfterTax, id: 'total' },
      header: t('label.total'),
      ...getCurrencyCell(),
    },
  ];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb
            crumbs={[
              { label: t('replenishment') },
              { label: t('inbound-shipment') },
            ]}
          />
          <HeaderButtons>
            <Button icon={<PlusCircleIcon />} disabled title="Demo only">
              {t('button.new-shipment')}
            </Button>
            <Button
              variant="secondary"
              icon={<DownloadIcon />}
              disabled
              title="Demo only"
            >
              {t('button.export')}
            </Button>
          </HeaderButtons>
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={r => r.id}
        // Filters live in the table's own toolbar (ui-standards § tables →
        // filtering), matching the real page.
        filters={
          <FilterBar
            filters={filterFields()}
            filter={filter()}
            onChange={onFilterChange}
          />
        }
        sort={sort()}
        onSort={onSort}
        // The real page navigates to the detail route on row click; a no-op
        // here so the click-to-open row affordance (hover / pointer) still
        // shows.
        onRowClick={() => {}}
        // Demo mapping so every semantic row state renders for review (a
        // real page derives these from its own domain gates — e.g. disabled
        // from its read-only lifecycle check; the tint always pairs with
        // the row's status badge). SHIPPED rows show the always-on disabled
        // grey; SELECT a VERIFIED/PICKED row to see its green/amber tint —
        // states tint only while selected, replacing the selection blue.
        rowState={row =>
          row.status === 'VERIFIED'
            ? 'verified'
            : row.status === 'PICKED'
              ? 'warning'
              : row.status === 'SHIPPED'
                ? 'disabled'
                : undefined
        }
        emptyMessage={t('error.no-inbound-shipments')}
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        // The bulk actions for the table's selection footer (the table adds
        // the count + Clear and swaps its pager for the bar while rows are
        // selected), carrying the same gating as the real page: delete only
        // while every selected row is New, make-a-copy only for a single
        // selection. Inert here (demo only).
        selectionActions={
          <>
            <span
              title={
                allSelectedNew()
                  ? undefined
                  : 'Only New shipments can be deleted'
              }
            >
              <Button
                variant="danger"
                icon={<TrashIcon />}
                disabled={!allSelectedNew()}
              >
                Delete
              </Button>
            </span>
            <span
              title={
                singleSelected()
                  ? undefined
                  : 'Select a single shipment to copy'
              }
            >
              <Button
                variant="secondary"
                icon={<CopyIcon />}
                disabled={!singleSelected()}
              >
                Duplicate
              </Button>
            </span>
          </>
        }
        config={tableConfig()}
        setConfig={setConfig}
        configIsDefault={isConfigDefault()}
        pagination={{
          offset: offset(),
          pageSize: pageSize(),
          total: total(),
          onOffsetChange: setOffset,
          onPageSizeChange: size => {
            setPageSize(size);
            setOffset(0);
          },
        }}
      />
    </Page>
  );
};
