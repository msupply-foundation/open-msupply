import { createMemo, createSignal, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import {
  dateToIsoDate,
  localDayToUtc,
  utcToLocalDay,
} from '../ui/elements/inputs/dateTimeConvert';
import {
  DataTable,
  type CardGroup,
  type Column,
  type SortState,
} from '../ui/elements/table/DataTable';
import {
  formatCurrencyCell,
  getCellDefinition,
  getNumberCell,
} from '../ui/elements/table/tableHelpers';
import { Pagination } from '../ui/elements/table/Pagination';
import type {
  TableConfig,
  TableConfigKey,
  ViewMode,
} from '../ui/elements/table/tableConfig';
import { remToPx } from '../ui/utils/rem';
import { ShellFullScreenContext } from '../ui/layout/AppShell/shellContext';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { StatusChip } from '../ui/elements/feedback/StatusChip';
import { TextField } from '../ui/elements/inputs/TextField';
import { NumberField } from '../ui/elements/inputs/NumberField';
import { CurrencyField } from '../ui/elements/inputs/CurrencyField';
import { DateField } from '../ui/elements/inputs/DateField';
import { Select } from '../ui/elements/selectors/Select';
import {
  FilterBar,
  FilterCombobox,
  FilterMultiSelect,
  FilterTextInput,
  type Filter,
} from '../ui/elements/selectors/FilterBar';
import { Button } from '../ui/elements/buttons/Button';
import {
  InfoIcon,
  LockIcon,
  MessageSquareIcon,
  StockIcon,
  TrashIcon,
} from '../ui/icons';
import { Text } from '../ui/elements/typography/Text';
import {
  AnatomyTree,
  Intro,
  Lead,
  Note,
  SectionTOC,
  type AnatomyNode,
} from './common';
import type { PageMetadata } from './metadata';

/*
 * The Table & Card anatomy page (Layout Elements) — the interactive companion
 * to docs/CARD_TABLE_MODEL.md. It walks the shared DataTable's ONE model up
 * from the simplest three-prop table to a sophisticated card, one
 * DashboardCard per step. The two ASSEMBLED results — the model composing a
 * real list / detail table — are the Pages demos (#/showcase/table,
 * #/showcase/detail-table), which reuse the real generated row types; this
 * page instead uses a small, clean teaching dataset (below) so each step reads
 * at a glance. The full field reference lives in docs/CARD_TABLE_MODEL.md (+
 * docs/CELL_TYPES.md for the cell presets); keep this page's demos in step
 * with what those docs describe.
 *
 * Dogfooding (kdd/showcase-harness): the demos ARE the real src/ui DataTable —
 * only the page column (ContentContainer + Stack), the demo sections
 * (DashboardCard) and the prose (Intro/Lead/Note/AnatomyTree) are chrome.
 */

// --- The teaching dataset
// A small, self-contained stock list — deliberately NOT a generated GraphQL
// type (unlike the Pages demos): a teaching page wants the fewest, plainest
// fields that still exercise every cell type. Field names match the
// getCellDefinition common keys (code / name / packSize / total / expiryDate /
// comment) so the demo columns read exactly as a real vertical's would;
// `quantity` is the one field that ISN'T a common key, so it uses the explicit
// getNumberCell() helper — the two ways to size a column, side by side.
type StockStatus = 'active' | 'onHold' | 'discontinued';

type StockLine = {
  id: string;
  code: string;
  name: string;
  status: StockStatus;
  quantity: number;
  packSize: number;
  total: number;
  expiryDate: string | null;
  comment: string | null;
};

// Sort keys (the columns a header click can sort by) and card body-group ids.
// One vocabulary shared across every demo so the columns type-check uniformly;
// a given demo only sets the sortKeys / cardGroups it actually uses.
type SortKey =
  'code' | 'name' | 'status' | 'quantity' | 'packSize' | 'total' | 'expiryDate';
type GroupKey = 'details' | 'more';

// status → its label + a --status-* token (colour literals live only in
// tokens.css; the chip tints from the one value). Green / amber / grey read as
// active / on-hold / discontinued.
const STATUS: Record<StockStatus, { label: string; colour: string }> = {
  active: { label: 'Active', colour: 'var(--status-verified)' },
  onHold: { label: 'On hold', colour: 'var(--status-picked)' },
  discontinued: { label: 'Discontinued', colour: 'var(--status-new)' },
};

const StatusCell = (props: { status: StockStatus }) => (
  <StatusChip
    label={STATUS[props.status].label}
    colour={STATUS[props.status].colour}
  />
);

const ITEMS = [
  { code: 'AMOX500', name: 'Amoxicillin 500mg capsules' },
  { code: 'PARA500', name: 'Paracetamol 500mg tablets' },
  { code: 'IBU200', name: 'Ibuprofen 200mg tablets' },
  { code: 'MET850', name: 'Metformin 850mg tablets' },
  { code: 'SALB100', name: 'Salbutamol 100mcg inhaler' },
  { code: 'OME20', name: 'Omeprazole 20mg capsules' },
  { code: 'CEFT1G', name: 'Ceftriaxone 1g injection' },
  { code: 'ORS1', name: 'Oral rehydration salts' },
];
const STATUSES: StockStatus[] = ['active', 'onHold', 'discontinued'];
const COMMENTS: (string | null)[] = [
  'Cold chain',
  null,
  'Short-dated',
  null,
  null,
];
const PACK_SIZES = [1, 10, 20, 30, 50, 100];

// A stored instant for the given local calendar day, via the shared
// conversion — so the mock rows display the intended day in any timezone.
const isoDay = (month: number, day: number, year: number): string =>
  localDayToUtc(dateToIsoDate(new Date(year, month - 1, day)));

// Expiry dates are generated RELATIVE to today so the near-expiry red tone
// (getExpiryDateCell: ≤3 months out, past included) always has live examples
// whenever the showcase is opened. `day` stays 1–28, so every month is safe.
const monthsFromNow = (months: number, day: number): string => {
  const now = new Date();
  const m = now.getMonth() + months;
  const year = now.getFullYear() + Math.floor(m / 12);
  return isoDay((((m % 12) + 12) % 12) + 1, day, year);
};

// A spread of expiry states, arranged so the first three rows (the card demos
// show three) already include one far (black) and one near (red): a blank, a
// near date (≤3mo → red), a just-expired date (→ red), else safely far out.
const expiryMonthsFor = (i: number): number | null =>
  i % 8 === 5 ? null : i % 5 === 1 ? 1 : i % 7 === 3 ? -1 : 8 + (i % 18);

// A deterministic 24-row dataset (no Math.random — stable across reloads).
// The small demos slice the first few rows; the working table paginates all 24.
const DATA: StockLine[] = Array.from({ length: 24 }, (_, i): StockLine => {
  const item = ITEMS[i % ITEMS.length];
  const quantity = ((i * 13) % 90) + 1;
  const packSize = PACK_SIZES[i % PACK_SIZES.length];
  const cost = (i % 9) + 1.5;
  const em = expiryMonthsFor(i);
  const day = (i % 27) + 1;
  return {
    id: `sl-${i + 1}`,
    code: item.code,
    name: item.name,
    status: STATUSES[i % STATUSES.length],
    quantity,
    packSize,
    total: Number((quantity * cost).toFixed(2)),
    expiryDate: em === null ? null : monthsFromNow(em, day),
    comment: COMMENTS[i % COMMENTS.length],
  };
});

// --- Shared column pieces
// The card title + status badge recur across the card demos. Each returns an
// explicit Column literal (not a config the table interprets — kdd/explicit-
// composition), so a demo still spells out the rest of its columns inline.

// The card title: the name as the header's inline-start `primary` cell (header
// cells are unlabelled by default). Structural, so it's kept out of the Columns
// popover. In TABLE view it's just the wide text "sink" column.
const namePrimaryCol = <G extends string = never>(): Column<
  StockLine,
  SortKey,
  G
> => ({
  c: { key: 'name' },
  header: () => 'Name',
  ...getCellDefinition<StockLine>('name', {
    headerPosition: 'primary',
    hideFromColumnSettings: true,
  }),
});

// The status badge: the header's inline-end `badge` cell in card view, a chip
// cell in table view — one column, both faces.
const statusBadgeCol = <G extends string = never>(): Column<
  StockLine,
  SortKey,
  G
> => ({
  c: { key: 'status' },
  header: () => 'Status',
  cell: info => <StatusCell status={info.getValue<StockStatus>()} />,
  meta: { headerPosition: 'badge' },
});

// A minimal stand-in for createTableConfig (which needs store context the
// standalone showcase lacks): a local signal holding the resolved TableConfig,
// and a setConfig that merges one field — enough to drive the card⇄table toggle
// and the Columns popover in a demo. `viewMode` seeds the starting view.
const createViewConfig = (initial: ViewMode) => {
  const [config, setConfig] = createSignal<TableConfig>({ viewMode: initial });
  const set = <K extends TableConfigKey>(key: K, value: TableConfig[K]) =>
    setConfig(current => ({ ...current, [key]: value }));
  return { config, setConfig: set };
};

const CARD_GROUPS_DETAILS: CardGroup<StockLine, GroupKey>[] = [
  // A boxed, captioned body group (kdd caption + icon-as-factory: one node per
  // card, never a shared element).
  {
    key: 'details',
    labelKey: 'label.details',
    icon: () => <StockIcon />,
    panel: true,
  },
];

const CARD_GROUPS_MORE: CardGroup<StockLine, GroupKey>[] = [
  // A collapsed disclosure (secondary content). No labelKey → the header falls
  // back to "More details"; the preview shows the total while it's collapsed.
  {
    key: 'more',
    disclosure: 'closed',
    disclosurePreview: row => <>{formatCurrencyCell(row.total)}</>,
  },
];

// Sort accessor for the working table's client-side sort (stands in for the
// server handing back a pre-ordered page).
const sortValue = (r: StockLine, key: SortKey): string | number => {
  switch (key) {
    case 'code':
      return r.code;
    case 'name':
      return r.name;
    case 'status':
      return r.status;
    case 'quantity':
      return r.quantity;
    case 'packSize':
      return r.packSize;
    case 'total':
      return r.total;
    case 'expiryDate':
      return r.expiryDate ?? '';
  }
};

// ============================================================================
// § Table basics
// ============================================================================

// 1 — The simplest table: three props (columns / rows / rowKey) and columns
// that spell only identity + header. TanStack renders each value as-is over a
// semantic <table>; no toolbar, no footer, no card view.
const BareTable = () => {
  const columns: Column<StockLine, SortKey>[] = [
    { c: { key: 'code' }, header: () => 'Code' },
    { c: { key: 'name' }, header: () => 'Name' },
    { c: { key: 'quantity' }, header: () => 'Quantity' },
  ];
  return (
    <DataTable columns={columns} rows={DATA.slice(0, 5)} rowKey={r => r.id} />
  );
};

// 2 — Cell types & widths: the same rows, now with getCellDefinition presets —
// each key picks a cell's rendering + alignment + default width (Code, the Text
// sink, Number, Currency, the near-expiry-red Expiry, the Comment icon).
// `quantity` isn't a common key, so it takes the explicit getNumberCell() and
// sets its own width — the two sizing routes, side by side.
const CellTypesTable = () => {
  const columns: Column<StockLine, SortKey>[] = [
    {
      c: { key: 'code' },
      header: () => 'Code',
      ...getCellDefinition<StockLine>('code'),
    },
    {
      c: { key: 'name' },
      header: () => 'Name',
      ...getCellDefinition<StockLine>('name'),
    },
    {
      c: { key: 'quantity' },
      header: () => 'Quantity',
      ...getNumberCell<StockLine>(),
      size: remToPx(6),
    },
    {
      c: { key: 'packSize' },
      header: () => 'Pack size',
      ...getCellDefinition<StockLine>('packSize'),
    },
    {
      c: { key: 'total' },
      header: () => 'Total',
      ...getCellDefinition<StockLine>('total'),
    },
    {
      c: { key: 'expiryDate' },
      header: () => 'Expiry',
      ...getCellDefinition<StockLine>('expiryDate'),
    },
    {
      c: { key: 'comment' },
      header: () => 'Comment',
      ...getCellDefinition<StockLine>('comment'),
    },
  ];
  return (
    <DataTable columns={columns} rows={DATA.slice(0, 6)} rowKey={r => r.id} />
  );
};

// The working table's filter, in the same shape a real list uses: a GraphQL-
// native filter object whose keys the FilterBar adds/removes/edits (a key
// present-as-null is an added-but-empty chip). The page reads it straight into
// its client-side predicate below — no flat value model (kdd/type-safety).
type DemoFilter = {
  search?: string | null;
  status?: StockStatus[] | null;
  item?: string | null;
};

// The status options offered in the multi-select, derived from the one STATUS
// map so the labels stay defined in a single place.
const STATUS_OPTIONS: { value: StockStatus; label: string }[] = STATUSES.map(
  s => ({ value: s, label: STATUS[s].label })
);

// The addable filters (FilterBar's `filters`): a stable module const so the
// chip <For> reuses rows across edits (see FilterBar's note). Each field owns
// one key and composes an explicit control (kdd/explicit-composition) — a
// search box over code/name, and a multi-select over the status enum (match
// ANY of the chosen statuses).
const FILTER_FIELDS: Filter<DemoFilter>[] = [
  {
    key: 'search',
    label: () => 'Search',
    render: props => (
      <FilterTextInput
        label="Search"
        placeholder="Code or name"
        testId={props.testId}
        value={props.filter().search ?? ''}
        // Client-side set, so commit every keystroke (debounceMs 0) rather
        // than waiting for a server round-trip.
        debounceMs={0}
        onInput={value => props.setPartialFilter({ search: value || null })}
      />
    ),
  },
  {
    key: 'status',
    label: () => 'Status',
    render: props => (
      <FilterMultiSelect
        label="Status"
        testId={props.testId}
        placeholder="Any"
        values={props.filter().status ?? []}
        options={STATUS_OPTIONS}
        onChange={values =>
          props.setPartialFilter({ status: values.length ? values : null })
        }
      />
    ),
  },
  {
    key: 'item',
    label: () => 'Item',
    render: props => (
      <FilterCombobox
        label="Item"
        placeholder="Item"
        items={ITEMS}
        itemToString={i => `${i.code} — ${i.name}`}
        itemToValue={i => i.code}
        focusTarget={props.focusTarget}
        value={props.filter().item ?? undefined}
        onChange={i => props.setPartialFilter({ item: i?.code ?? null })}
      />
    ),
  },
];

// 3 — A working table: the toolbar/footer features a real list ships, all on
// one table — a filter bar (filters), sortable headers (sort/onSort), a
// selection checkbox + action footer (enableSelection/selectionActions), the
// pager (pagination), and the Settings popover (config/setConfig). Each is one
// optional prop; the page owns the state and hands the table a pre-filtered,
// pre-sorted, pre-sliced page of rows.
const WorkingTable = () => {
  const [sort, setSort] = createSignal<SortState<SortKey>>({
    key: 'name',
    desc: false,
  });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [offset, setOffset] = createSignal(0);
  const [pageSize, setPageSize] = createSignal(10);
  const [filter, setFilter] = createSignal<DemoFilter>({});
  const { config, setConfig } = createViewConfig('table');
  // Reset is offered only when the user has overridden a column (visibility /
  // order / pinning) — mirrors createTableConfig's isConfigDefault.
  const configIsDefault = () => {
    const c = config();
    return !c.columnVisibility && !c.columnOrder && !c.columnPinning;
  };
  // A filter edit resets to the first page, like a real list — the current
  // offset may be past the end of the narrowed result set.
  const onFilterChange = (next: DemoFilter) => {
    setFilter(next);
    setOffset(0);
  };

  // Client-side stand-in for the server's WHERE: search matches code OR name;
  // status matches ANY of the chosen values. A null/empty value (an added-but-
  // empty chip) is ignored — mirrors the page stripping empty keys before it
  // queries.
  const filtered = createMemo(() => {
    const { search, status, item } = filter();
    const needle = search?.trim().toLowerCase();
    return DATA.filter(r => {
      if (item && r.code !== item) return false;
      if (status && status.length && !status.includes(r.status)) return false;
      if (
        needle &&
        !r.code.toLowerCase().includes(needle) &&
        !r.name.toLowerCase().includes(needle)
      )
        return false;
      return true;
    });
  });

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
  const onSort = (key: SortKey, desc: boolean) => {
    setSort({ key, desc });
    setOffset(0);
  };

  const columns = (): Column<StockLine, SortKey>[] => [
    {
      c: { key: 'code' },
      sortKey: 'code',
      header: () => 'Code',
      ...getCellDefinition<StockLine>('code'),
    },
    {
      c: { key: 'name' },
      sortKey: 'name',
      header: () => 'Name',
      ...getCellDefinition<StockLine>('name'),
    },
    {
      c: { key: 'status' },
      sortKey: 'status',
      header: () => 'Status',
      cell: info => <StatusCell status={info.getValue<StockStatus>()} />,
    },
    {
      c: { key: 'quantity' },
      sortKey: 'quantity',
      header: () => 'Quantity',
      ...getNumberCell<StockLine>(),
      size: remToPx(6),
    },
    {
      c: { key: 'packSize' },
      sortKey: 'packSize',
      header: () => 'Pack size',
      ...getCellDefinition<StockLine>('packSize'),
    },
    {
      c: { key: 'total' },
      sortKey: 'total',
      header: () => 'Total',
      ...getCellDefinition<StockLine>('total'),
    },
    {
      c: { key: 'expiryDate' },
      sortKey: 'expiryDate',
      header: () => 'Expiry',
      ...getCellDefinition<StockLine>('expiryDate'),
    },
    {
      c: { key: 'comment' },
      header: () => 'Comment',
      ...getCellDefinition<StockLine>('comment'),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={rows()}
      rowKey={r => r.id}
      // Filters live in the table's own toolbar (ui-standards § tables →
      // filtering); the page owns the filter state, like a real list.
      filters={
        <FilterBar
          filters={FILTER_FIELDS}
          filter={filter()}
          onChange={onFilterChange}
        />
      }
      sort={sort()}
      onSort={onSort}
      enableSelection
      selectedIds={selectedIds()}
      onSelectionChange={setSelectedIds}
      selectionActions={
        <Button variant="danger" icon={<TrashIcon />}>
          Delete
        </Button>
      }
      config={config()}
      setConfig={setConfig}
      configIsDefault={configIsDefault()}
      emptyMessage="No items"
      pagination={{
        offset: offset(),
        pageSize: pageSize(),
        // The pager counts the FILTERED set, so the page total tracks the
        // active filter.
        total: filtered().length,
        onOffsetChange: setOffset,
        onPageSizeChange: size => {
          setPageSize(size);
          setOffset(0);
        },
      }}
    />
  );
};

// Row states & background tints (table view only). Two rows are pre-selected
// so the verified (green) and warning (amber) tints show on load; discontinued
// rows are disabled (grey) always. Selecting / deselecting shows the gating —
// verified / warning are white until selected.
const RowStatesDemo = () => {
  // Stands in for a "this record is read-only / locked" fact (a real page reads
  // its own flag). Read-only wins over status → disabled: grey, always.
  const readOnly = new Set(['sl-6']);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([
    'sl-1',
    'sl-2',
    'sl-3',
  ]);
  const columns = (): Column<StockLine, SortKey>[] => [
    {
      c: { key: 'code' },
      header: () => 'Code',
      ...getCellDefinition<StockLine>('code'),
    },
    {
      c: { key: 'name' },
      header: () => 'Name',
      ...getCellDefinition<StockLine>('name'),
      // A lock marks the read-only row, so its always-grey disabled tint reads
      // as "locked", not broken. The glyph inherits the cell's muted colour.
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
            <Show when={readOnly.has(row.id)}>
              <LockIcon />
            </Show>
            {row.name}
          </span>
        );
      },
    },
    {
      c: { key: 'status' },
      header: () => 'Status',
      cell: info => <StatusCell status={info.getValue<StockStatus>()} />,
    },
    {
      c: { key: 'quantity' },
      header: () => 'Quantity',
      ...getNumberCell<StockLine>(),
      size: remToPx(6),
    },
  ];
  return (
    <DataTable
      columns={columns()}
      rows={DATA.slice(0, 6)}
      rowKey={r => r.id}
      enableSelection
      selectedIds={selectedIds()}
      onSelectionChange={setSelectedIds}
      // The page's ONLY job: map each row to a state. Read-only wins (→
      // disabled, grey always); else active → verified, onHold → warning;
      // anything else — discontinued here — stays plain, so it takes the
      // default blue when selected. The DataTable owns the tints, the
      // selection-gating and the replaces-blue rule.
      rowState={row =>
        readOnly.has(row.id)
          ? 'disabled'
          : row.status === 'active'
            ? 'verified'
            : row.status === 'onHold'
              ? 'warning'
              : undefined
      }
    />
  );
};

// ============================================================================
// § The card model
// ============================================================================

// 4 — One list, two renderings: the SAME columns as a working table, plus
// showCardToggle (needs setConfig). The name declares itself the card title
// and the status a badge; flip the toolbar toggle and the identical Column[]
// renders as cards. Starts in table view so the flip is the demo.
const CardToggleDemo = () => {
  const { config, setConfig } = createViewConfig('table');
  const columns = (): Column<StockLine, SortKey>[] => [
    namePrimaryCol(),
    statusBadgeCol(),
    {
      c: { key: 'quantity' },
      header: () => 'Quantity',
      ...getNumberCell<StockLine>(),
    },
    {
      c: { key: 'packSize' },
      header: () => 'Pack size',
      ...getCellDefinition<StockLine>('packSize'),
    },
    {
      c: { key: 'expiryDate' },
      header: () => 'Expiry',
      ...getCellDefinition<StockLine>('expiryDate'),
    },
  ];
  return (
    <DataTable
      columns={columns()}
      rows={DATA.slice(0, 6)}
      rowKey={r => r.id}
      showCardToggle
      config={config()}
      setConfig={setConfig}
    />
  );
};

// 5 — Card anatomy: the header (inline-start `primary` title + inline-end
// `badge`, both unlabelled) divided by a hairline from the body, whose cells
// are labelled by default (LabelledValue: label above value). Card-only view
// here (config.viewMode 'card', no toggle) so the card is the whole subject.
const CardAnatomyDemo = () => {
  const columns = (): Column<StockLine, SortKey>[] => [
    namePrimaryCol(),
    statusBadgeCol(),
    {
      c: { key: 'quantity' },
      header: () => 'Quantity',
      ...getNumberCell<StockLine>(),
    },
    {
      c: { key: 'packSize' },
      header: () => 'Pack size',
      ...getCellDefinition<StockLine>('packSize'),
    },
    {
      c: { key: 'expiryDate' },
      header: () => 'Expiry',
      ...getCellDefinition<StockLine>('expiryDate'),
    },
    {
      c: { key: 'total' },
      header: () => 'Total',
      ...getCellDefinition<StockLine>('total'),
    },
  ];
  return (
    <DataTable
      columns={columns()}
      rows={DATA.slice(0, 3)}
      rowKey={r => r.id}
      config={{ viewMode: 'card' }}
    />
  );
};

// 6 — Body groups & panels: the body renders the default (ungrouped) group
// first, then each declared group in cardGroups order. A column joins one with
// `cardGroup`; the group's `panel: true` boxes its fields in a captioned tinted
// zone (good for wide cards).
const CardGroupsDemo = () => {
  const columns = (): Column<StockLine, SortKey, GroupKey>[] => [
    namePrimaryCol(),
    statusBadgeCol(),
    {
      c: { key: 'quantity' },
      header: () => 'Quantity',
      ...getNumberCell<StockLine>(),
    },
    {
      c: { key: 'total' },
      header: () => 'Total',
      ...getCellDefinition<StockLine>('total'),
    },
    {
      c: { key: 'packSize' },
      header: () => 'Pack size',
      cardGroup: 'details',
      ...getCellDefinition<StockLine>('packSize'),
    },
    {
      c: { key: 'expiryDate' },
      header: () => 'Expiry',
      cardGroup: 'details',
      ...getCellDefinition<StockLine>('expiryDate'),
    },
    {
      c: { key: 'comment' },
      header: () => 'Comment',
      cardGroup: 'details',
      ...getCellDefinition<StockLine>('comment'),
    },
  ];
  return (
    <DataTable
      columns={columns()}
      cardGroups={CARD_GROUPS_DETAILS}
      rows={DATA.slice(0, 3)}
      rowKey={r => r.id}
      config={{ viewMode: 'card' }}
    />
  );
};

// 7 — Disclosure ("More details"): a group with `disclosure: 'closed'` wraps
// its fields in a collapsed accordion — secondary content, reachable but
// out of the way. `disclosurePreview` shows a row-specific summary (here
// the total) beside the header while collapsed. Primary vs secondary
// content is just: no disclosure vs disclosure 'closed'.
const CardDisclosureDemo = () => {
  const columns = (): Column<StockLine, SortKey, GroupKey>[] => [
    namePrimaryCol(),
    statusBadgeCol(),
    {
      c: { key: 'quantity' },
      header: () => 'Quantity',
      ...getNumberCell<StockLine>(),
    },
    {
      c: { key: 'packSize' },
      header: () => 'Pack size',
      ...getCellDefinition<StockLine>('packSize'),
    },
    {
      c: { key: 'expiryDate' },
      header: () => 'Expiry',
      cardGroup: 'more',
      ...getCellDefinition<StockLine>('expiryDate'),
    },
    {
      c: { key: 'total' },
      header: () => 'Total',
      cardGroup: 'more',
      ...getCellDefinition<StockLine>('total'),
    },
    {
      c: { key: 'comment' },
      header: () => 'Comment',
      cardGroup: 'more',
      ...getCellDefinition<StockLine>('comment'),
    },
  ];
  return (
    <DataTable
      columns={columns()}
      cardGroups={CARD_GROUPS_MORE}
      rows={DATA.slice(0, 3)}
      rowKey={r => r.id}
      config={{ viewMode: 'card' }}
    />
  );
};

// 8 — Fields that differ by view. Two recipes at once: (a) "one value, two
// faces" — the code is a plain Code column in TABLE view (hideOnCard) and a
// second, card-only `primary` cell rendered as "#CODE" in CARD view
// (hideOnTable), distinct ids so TanStack doesn't collide; (b) a card-only
// editable field — a Note input that only exists on the card (hideOnTable),
// sitting alongside the read-only labelled values. Toggle to compare the faces.
const CardAdvancedDemo = () => {
  const { config, setConfig } = createViewConfig('card');
  const [notes, setNotes] = createStore<Record<string, string>>(
    Object.fromEntries(DATA.slice(0, 3).map(r => [r.id, r.comment ?? '']))
  );
  const columns = (): Column<StockLine, SortKey>[] => [
    // Code — TABLE face (a plain Code column, hidden on the card).
    {
      c: { key: 'code' },
      header: () => 'Code',
      ...getCellDefinition<StockLine>('code', {
        hideOnCard: true,
        hideFromColumnSettings: true,
      }),
    },
    // Code — CARD face (a card-only `primary` cell, "#CODE", distinct id).
    {
      c: { id: 'codeCard' },
      header: () => 'Code',
      meta: {
        headerPosition: 'primary',
        hideOnTable: true,
        hideFromColumnSettings: true,
      },
      cell: info => <span>{`#${info.row.original.code}`}</span>,
    },
    namePrimaryCol(),
    statusBadgeCol(),
    {
      c: { key: 'quantity' },
      header: () => 'Quantity',
      ...getNumberCell<StockLine>(),
    },
    // A card-only editable field: its header is the label; the input's own
    // label is hidden (kept for a11y). stopPropagation keeps typing off any
    // row click.
    {
      c: { id: 'note' },
      header: () => 'Note',
      meta: { hideOnTable: true },
      cell: info => {
        const row = info.row.original;
        return (
          <TextField
            label="Note"
            hideLabel
            size="small"
            width="full"
            value={notes[row.id]}
            onInput={e => setNotes(row.id, e.currentTarget.value)}
            onClick={e => e.stopPropagation()}
          />
        );
      },
    },
  ];
  return (
    <DataTable
      columns={columns()}
      rows={DATA.slice(0, 3)}
      rowKey={r => r.id}
      showCardToggle
      config={config()}
      setConfig={setConfig}
    />
  );
};

// ============================================================================
// § Assembled
// ============================================================================

// 9 — A list card, assembled: the shape the real List / Detail-table pages ship
// — a title + status badge, a few always-shown facts, and the rest tucked into
// one "More details" disclosure — now with selection and the card⇄table toggle.
// This is the sophisticated end of the same model; the fully wired versions
// over real data are the Pages demos.
const AssembledCardDemo = () => {
  const { config, setConfig } = createViewConfig('card');
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const columns = (): Column<StockLine, SortKey, GroupKey>[] => [
    namePrimaryCol(),
    statusBadgeCol(),
    {
      c: { key: 'quantity' },
      header: () => 'Quantity',
      ...getNumberCell<StockLine>(),
    },
    {
      c: { key: 'packSize' },
      header: () => 'Pack size',
      ...getCellDefinition<StockLine>('packSize'),
    },
    {
      c: { key: 'expiryDate' },
      header: () => 'Expiry',
      ...getCellDefinition<StockLine>('expiryDate'),
    },
    {
      c: { key: 'total' },
      header: () => 'Total',
      cardGroup: 'more',
      ...getCellDefinition<StockLine>('total'),
    },
    {
      c: { key: 'comment' },
      header: () => 'Comment',
      cardGroup: 'more',
      ...getCellDefinition<StockLine>('comment'),
    },
  ];
  return (
    <DataTable
      columns={columns()}
      cardGroups={CARD_GROUPS_MORE}
      rows={DATA.slice(0, 4)}
      rowKey={r => r.id}
      showCardToggle
      config={config()}
      setConfig={setConfig}
      enableSelection
      selectedIds={selectedIds()}
      onSelectionChange={setSelectedIds}
      onRowClick={() => {}}
    />
  );
};

// ============================================================================
// # A multi-panel card
// ============================================================================

// The richest card: a form-like record whose fields split across boxed,
// captioned "panel" groups — the shape the line-edit modals use (see
// LineEditModal). A small self-contained batch record (the other demos'
// StockLine has no need for these fields); its inputs are editable, buffered in
// a local store.
type Batch = {
  id: string;
  batch: string;
  numberOfPacks: number;
  packSize: number;
  expiryDate: string | null;
  costPrice: number;
  sellPrice: number;
  location: string | null;
  note: string;
};

type BatchGroup = 'batch' | 'pricing' | 'other';

// Three boxed panels: Batch always shown, Pricing / Other collapsed. Each
// carries an icon factory (one node per card, never a shared element).
const BATCH_GROUPS: CardGroup<Batch, BatchGroup>[] = [
  {
    key: 'batch',
    labelKey: 'label.batch',
    icon: () => <StockIcon />,
    panel: true,
  },
  {
    key: 'pricing',
    labelKey: 'label.pricing',
    icon: () => <InfoIcon />,
    panel: true,
    disclosure: 'closed',
  },
  {
    key: 'other',
    labelKey: 'heading.other',
    icon: () => <MessageSquareIcon />,
    panel: true,
    disclosure: 'closed',
  },
];

const BATCH_LOCATIONS = [
  { value: 'A.01', label: 'A.01 · Aisle A · Bay 01' },
  { value: 'COLD.1', label: 'COLD.1 · Cold room · Shelf 1' },
  { value: 'B.11', label: 'B.11 · Aisle B · Bay 11' },
];

// DateField's value is a plain YYYY-MM-DD, so read the instant that
// monthsFromNow returns back to its local day (kept relative to today).
const SAMPLE_BATCHES: Batch[] = [
  {
    id: 'b1',
    batch: 'BN2044',
    numberOfPacks: 12,
    packSize: 100,
    expiryDate: utcToLocalDay(monthsFromNow(14, 12)),
    costPrice: 3.5,
    sellPrice: 4.73,
    location: 'A.01',
    note: 'Cold chain',
  },
  {
    id: 'b2',
    batch: 'BN3120',
    numberOfPacks: 6,
    packSize: 50,
    expiryDate: utcToLocalDay(monthsFromNow(2, 8)),
    costPrice: 5.2,
    sellPrice: 7.02,
    location: 'COLD.1',
    note: '',
  },
];

// 10 — A multi-panel card: card-only, editable inputs grouped into panels. Each
// batch is one card, its code the header identity; the body divides into the
// Batch / Pricing / Other panels. Buffered in a local store — editing a field
// never remounts the row (rowKey by id), so focus is kept.
const MultiPanelCardDemo = () => {
  const [batches, setBatches] = createStore<Batch[]>(
    SAMPLE_BATCHES.map(b => ({ ...b }))
  );
  const update = <F extends keyof Batch>(
    id: string,
    field: F,
    value: Batch[F]
  ) => {
    const index = batches.findIndex(b => b.id === id);
    if (index >= 0) setBatches(index, field, value as never);
  };
  const columns = (): Column<Batch, never, BatchGroup>[] => [
    {
      // The card identity — the batch code as a labelled primary header field.
      c: { key: 'batch' },
      header: () => 'Batch',
      meta: {
        headerPosition: 'primary',
        showLabel: true,
        hideFromColumnSettings: true,
      },
      cell: info => {
        const b = info.row.original;
        return (
          <TextField
            label="Batch"
            hideLabel
            size="small"
            width="compact"
            value={b.batch}
            onInput={e => update(b.id, 'batch', e.currentTarget.value)}
          />
        );
      },
    },
    {
      c: { key: 'numberOfPacks' },
      header: () => 'Quantity',
      cardGroup: 'batch',
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label="Quantity"
            hideLabel
            size="small"
            min={0}
            value={b.numberOfPacks}
            onChange={v => update(b.id, 'numberOfPacks', v ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'packSize' },
      header: () => 'Pack size',
      cardGroup: 'batch',
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label="Pack size"
            hideLabel
            size="small"
            min={0}
            value={b.packSize}
            onChange={v => update(b.id, 'packSize', v ?? 1)}
          />
        );
      },
    },
    {
      c: { key: 'expiryDate' },
      header: () => 'Expiry',
      cardGroup: 'batch',
      cell: info => {
        const b = info.row.original;
        return (
          <DateField
            label="Expiry"
            hideLabel
            value={b.expiryDate}
            onChange={v => update(b.id, 'expiryDate', v)}
          />
        );
      },
    },
    {
      c: { key: 'costPrice' },
      header: () => 'Cost price',
      cardGroup: 'pricing',
      cell: info => {
        const b = info.row.original;
        return (
          <CurrencyField
            label="Cost price"
            hideLabel
            size="small"
            value={b.costPrice}
            onChange={v => update(b.id, 'costPrice', v ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'sellPrice' },
      header: () => 'Sell price',
      cardGroup: 'pricing',
      cell: info => {
        const b = info.row.original;
        return (
          <CurrencyField
            label="Sell price"
            hideLabel
            size="small"
            value={b.sellPrice}
            onChange={v => update(b.id, 'sellPrice', v ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'location' },
      header: () => 'Location',
      cardGroup: 'other',
      cell: info => {
        const b = info.row.original;
        return (
          <Select
            label="Location"
            hideLabel
            value={b.location ?? undefined}
            options={BATCH_LOCATIONS}
            onValueChange={v => update(b.id, 'location', v)}
          />
        );
      },
    },
    {
      c: { key: 'note' },
      header: () => 'Note',
      cardGroup: 'other',
      cell: info => {
        const b = info.row.original;
        return (
          <TextField
            label="Note"
            hideLabel
            size="small"
            value={b.note}
            onInput={e => update(b.id, 'note', e.currentTarget.value)}
          />
        );
      },
    },
  ];
  return (
    <DataTable
      columns={columns()}
      cardGroups={BATCH_GROUPS}
      rows={batches}
      rowKey={b => b.id}
      config={{ viewMode: 'card' }}
    />
  );
};

// --- The card anatomy figure
// The nesting the doc draws as ASCII, here as a real nested list (semantics,
// not art). Keep it in step with the Card anatomy demo's actual placement.
const CARD_ANATOMY: AnatomyNode[] = [
  {
    name: 'Card',
    note: 'one row → one card',
    children: [
      {
        name: 'Header',
        note: 'the top row — cells unlabelled by default',
        children: [
          {
            name: 'primary',
            note: "title, inline-start (meta.headerPosition: 'primary')",
          },
          {
            name: 'badge',
            note: "chip/status, inline-end (meta.headerPosition: 'badge')",
          },
        ],
      },
      {
        name: 'Body',
        note: 'below the hairline — cells labelled by default',
        children: [
          {
            name: 'default group',
            note: 'ungrouped cells, always shown, rendered first',
          },
          {
            name: 'cardGroup',
            note: 'a declared group, placed in cardGroups order',
            children: [
              { name: 'panel', note: 'box the fields in a tinted zone' },
              {
                name: 'disclosure',
                note: "accordion — 'closed' = secondary content",
              },
            ],
          },
        ],
      },
    ],
  },
];

// A standalone Pagination demo — the list footer's pager over a synthetic
// 38-row result. Local signals stand in for the offset/pageSize a real list
// keeps in URL params; a size change resets to the first page.
const PaginationDemo = () => {
  const [offset, setOffset] = createSignal(0);
  const [pageSize, setPageSize] = createSignal(10);
  return (
    <Pagination
      offset={offset()}
      pageSize={pageSize()}
      total={38}
      onOffsetChange={setOffset}
      onPageSizeChange={size => {
        setPageSize(size);
        setOffset(0);
      }}
    />
  );
};

// Mask the shell's full-screen context for this teaching page so every demo
// table's full-screen button falls back to DataTable's standalone path — a
// fixed, viewport-covering overlay (its `.fullScreen` rule) — instead of the
// real app's chrome-hiding mode. That mode needs the table to be the
// flex-grow child of a Page/fillBody region, so it fills the viewport as the
// menu/footer/header hide; here every table is boxed in a DashboardCard
// within a centred, scrolling column, so chrome-hiding would leave the
// tables their boxed size. The overlay isn't the real behaviour, but it
// gives the narrow card demos room when toggled to a table.
export const tableCardMetadata: PageMetadata = {
  id: 'table-card',
  title: 'Table & Card',
  searchTerms: ['data table', 'list', 'rows', 'columns'],
  items: [
    {
      id: 'table-card-basics',
      title: 'Table basics',
      searchTerms: ['cell', 'column', 'width', 'row states', 'tint'],
    },
    {
      id: 'table-card-pagination',
      title: 'Pagination',
      searchTerms: ['pager', 'page', 'rows per page', 'offset', 'footer'],
    },
    {
      id: 'table-card-model',
      title: 'Card model',
      searchTerms: ['anatomy', 'disclosure', 'panel', 'body groups'],
    },
    {
      id: 'table-card-assembled',
      title: 'Assembled',
      searchTerms: ['list card', 'multi panel', 'example'],
    },
  ],
};

export const TableCardShowcase = () => (
  <ShellFullScreenContext.Provider value={undefined}>
    <ContentContainer size="wide" align="start">
      <Stack gap="lg">
        <SectionTOC page={tableCardMetadata} />
        <Intro>
          <strong>One column list, two renderings.</strong> The shared{' '}
          <code>DataTable</code> renders a list of records as a <em>table</em>{' '}
          (rows × columns) or as a <em>card list</em> (one card per row) from a
          single <code>Column[]</code> — each column decides, per view, whether
          it appears and where. This page walks that model up from the simplest
          three-prop table to a sophisticated card. The two <em>assembled</em>{' '}
          results, wired over real data, are the Pages demos (
          <a href="#/showcase/table">List page</a>,{' '}
          <a href="#/showcase/detail-table">Detail table page</a>); the full
          field reference is <code>docs/CARD_TABLE_MODEL.md</code> (
          <code>docs/CELL_TYPES.md</code> for the cell presets).
        </Intro>

        <AnatomyTree nodes={CARD_ANATOMY} />

        <Text variant="heading">Tables</Text>

        <DashboardCard
          id="table-card-basics"
          title="Table basics · The simplest table"
        >
          <Lead>
            Three props — <code>columns</code>, <code>rows</code>,{' '}
            <code>rowKey</code>. Each column spells only its identity (
            <code>c</code>) and a <code>header</code>; TanStack renders the
            value as-is over a real semantic <code>&lt;table&gt;</code>.
            Everything after this is one optional prop at a time.
          </Lead>
          <BareTable />
        </DashboardCard>

        <DashboardCard title="Table basics · Cell types & widths">
          <Lead>
            <code>getCellDefinition(key)</code> maps a common column key to its
            cell type — rendering, alignment and a default width in one spread:{' '}
            <code>code</code> (Code), <code>name</code> (the wide Text sink),{' '}
            <code>packSize</code> (Number), <code>total</code> (Currency),{' '}
            <code>expiryDate</code> (red within 3 months) and{' '}
            <code>comment</code> (an icon + popover). A field that{' '}
            <em>isn't</em> a common key — <code>quantity</code> — uses the
            explicit <code>getNumberCell()</code> and sets its own{' '}
            <code>size</code>. Drag a header edge to resize.
          </Lead>
          <CellTypesTable />
        </DashboardCard>

        <DashboardCard title="Table basics · A working table">
          <Lead>
            The features a real list ships, each one prop: a filter bar (
            <code>filters</code> — add a Search or Status chip), sortable
            headers (<code>sort</code> / <code>onSort</code>), a selection
            checkbox + action footer (<code>enableSelection</code> /{' '}
            <code>selectionActions</code>), the pager (<code>pagination</code>)
            and the Settings popover (<code>config</code> /{' '}
            <code>setConfig</code> — show/hide, reorder, pin). The page owns the
            state; the table is presentation over the page of rows it's handed.
          </Lead>
          <WorkingTable />
        </DashboardCard>

        <DashboardCard title="Table basics · Row states & tints">
          <Lead>
            Row background tints come from one prop — <code>rowState</code>, a
            function mapping each row to <code>'verified'</code>,{' '}
            <code>'warning'</code>, <code>'disabled'</code> or nothing, from its
            own facts. Here active → verified (green), on hold → warning
            (amber); anything else — discontinued included — stays plain. The
            catch: green / amber are <strong>selection-gated</strong> — a row is
            white until you <strong>select</strong> it, then it tints (or shows
            the default blue if it has no state), the status chip carrying the
            meaning at rest. <code>disabled</code> is the exception: a read-only
            / locked row (greyed, with a lock) is grey <em>always</em>, selected
            or not. Three rows are pre-selected; select or deselect any to watch
            it. Full rules are in <code>CARD_TABLE_MODEL.md</code>.
          </Lead>
          <RowStatesDemo />
        </DashboardCard>

        <DashboardCard
          id="table-card-pagination"
          title="Table basics · Pagination"
        >
          <Lead>
            The list footer on its own — the same pager the DataTable mounts
            from its <code>pagination</code> prop (in "A working table" above),
            shown standalone. One inline-end cluster: a rows-per-page{' '}
            <code>Select</code> (omit <code>onPageSizeChange</code> to hide it),
            the quiet range "1–10 of 38", then a fixed-slot pager —{' '}
            <code>[1] ‹ [k] › [N]</code> — so nothing shifts as you page. The
            parent owns <code>offset</code>/<code>pageSize</code> (bound for URL
            params); the component is pure presentation over them and resets to
            the first page on a size change. Below 480px the selector and number
            slots collapse to <code>‹ ›</code> + the range.
          </Lead>
          <PaginationDemo />
        </DashboardCard>

        <Text variant="heading">Cards</Text>

        <DashboardCard
          id="table-card-model"
          title="Card model · One list, two renderings"
        >
          <Lead>
            The same columns as a working table, plus{' '}
            <code>showCardToggle</code>. The name declares itself the card{' '}
            <em>title</em> (<code>headerPosition: 'primary'</code>) and the
            status a <em>badge</em> (<code>'badge'</code>); flip the toolbar
            toggle and the identical <code>Column[]</code> renders as cards.
            Below 600px the table is <em>always</em> cards and the toggle hides.
          </Lead>
          <CardToggleDemo />
        </DashboardCard>

        {/* The card-first demos are capped to the prose measure (~40rem) so
            each reads as a card, not a full-width band; align start keeps
            their left edge flush with the wide table demos above. */}
        <ContentContainer size="prose" align="start">
          <Stack gap="lg">
            <DashboardCard title="Card model · Card anatomy">
              <Lead>
                A card is a <strong>header</strong> — the <code>primary</code>{' '}
                title inline-start, the <code>badge</code> inline-end, both
                unlabelled — over a hairline, then a <strong>body</strong> whose
                cells are labelled by default (label above value, the same field
                grid a form uses). Match this against the figure at the top of
                the page.
              </Lead>
              <CardAnatomyDemo />
            </DashboardCard>

            <DashboardCard title="Card model · Body groups & panels">
              <Lead>
                The body renders the default (ungrouped) group first, then each
                group declared in <code>cardGroups</code>, in order. A column
                joins one with <code>cardGroup</code>; the group's{' '}
                <code>panel: true</code> boxes its fields in a captioned, tinted
                zone (with an optional <code>icon</code>) — good for wide cards,
                off for small list cards.
              </Lead>
              <CardGroupsDemo />
            </DashboardCard>

            <DashboardCard title="Card model · Disclosure — More details">
              <Lead>
                A group with <code>disclosure: 'closed'</code> wraps its fields
                in a collapsed accordion — secondary content, reachable but out
                of the way. <code>disclosurePreview</code> shows a row-specific
                summary (here the total) beside the header while collapsed.
                Primary vs secondary content is simply: no disclosure vs{' '}
                <code>disclosure: 'closed'</code>.
              </Lead>
              <CardDisclosureDemo />
            </DashboardCard>

            <DashboardCard title="Card model · Fields that differ by view">
              <Lead>
                Two recipes. <strong>One value, two faces</strong>: the code is
                a plain Code column in table view (<code>hideOnCard</code>) and
                a second, card-only <code>primary</code> cell rendered{' '}
                <code>#CODE</code> in card view (<code>hideOnTable</code>) —
                distinct <code>id</code>s so they never collide.{' '}
                <strong>A card-only editable field</strong>: the Note input
                exists only on the card (<code>hideOnTable</code>), sitting
                alongside the read-only labelled values. Toggle to compare the
                faces.
              </Lead>
              <CardAdvancedDemo />
            </DashboardCard>

            <DashboardCard
              id="table-card-assembled"
              title="Assembled · A list card"
            >
              <Lead>
                The shape the real pages ship: a title + status badge, a few
                always-shown facts, and the rest tucked into one "More details"
                disclosure — with selection and the card⇄table toggle. This is
                the sophisticated end of the same model; the fully wired
                versions over real data are the{' '}
                <a href="#/showcase/table">List page</a> and{' '}
                <a href="#/showcase/detail-table">Detail table page</a>.
              </Lead>
              <Note>
                The Columns popover is a table-shaped control — visibility
                toggles apply in card view, but "pin left/right" and moving a
                column between card groups aren't expressible there yet (see the
                doc's Known limitations).
              </Note>
              <AssembledCardDemo />
            </DashboardCard>
          </Stack>
        </ContentContainer>

        {/* The multi-panel card is a form, so it takes the form measure
            (~58rem) — wider than the list cards so its panels' two-column field
            grid has room. */}
        <ContentContainer size="form" align="start">
          <DashboardCard title="Assembled · A multi-panel card">
            <Lead>
              The richest card: a form-like record whose fields split across
              boxed, captioned <strong>panels</strong> — a Batch panel always
              shown, Pricing and Other as collapsed disclosures, each a{' '}
              <code>panel: true</code> <code>cardGroup</code> with its own icon.
              This is the shape the line-edit modals use (open a line on the{' '}
              <a href="#/showcase/detail-table">Detail table page</a>); it earns
              the wider <em>form</em> measure so its two-column field grid has
              room.
            </Lead>
            <MultiPanelCardDemo />
          </DashboardCard>
        </ContentContainer>
      </Stack>
    </ContentContainer>
  </ShellFullScreenContext.Provider>
);
