import { createMemo, createSignal, For, Show } from 'solid-js';
import {
  DataTable,
  type Column,
  type SortState,
  type TabAndGroup,
  ALL_TABS,
} from '../ui/elements/table/DataTable';
import { getNumberCell } from '../ui/elements/table/tableHelpers';
import { StockIcon, InfoIcon, TruckIcon } from '../ui/icons';
import {
  resolveTableConfig,
  type Band,
  type LayeredConfig,
  type TableConfig,
  type TableConfigKey,
} from '../ui/elements/table/tableConfig';
import { createMediaQuery } from '../ui/utils/createMediaQuery';
import { mediaQuery } from '../ui/styles/breakpoints';
import { Pagination } from '../ui/elements/table/Pagination';
import { Page } from '../ui/layout/Page/Page';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../ui/layout/Header/Toolbar';
import { ContentFooter } from '../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../ui/elements/buttons/Button';
import { CloseIcon, PlusCircleIcon, TrashIcon } from '../ui/icons';

// A realistic list-page demo for the showcase: the SAME assembly as a real vertical
// (StocktakesList) — a Page frame with a header, a table that fills the body and scrolls
// internally, and a contextual footer that swaps pagination ↔ selection actions. No
// backend: sort / pagination / selection are driven by local signals over a static
// dataset, sorted + sliced here to stand in for the server contract (DataTable stays
// manualSorting — it renders whatever page of rows it's handed).
type Batch = {
  id: string;
  name: string;
  batch: string;
  category: string;
  supplier: string;
  location: string;
  expiry: string;
  stock: number;
  price: number;
};

const NAMES = [
  'Amoxicillin 500mg',
  'Paracetamol 500mg',
  'Ibuprofen 200mg',
  'Metformin 850mg',
  'Salbutamol inhaler',
  'Omeprazole 20mg',
  'Amlodipine 5mg',
  'Ceftriaxone 1g',
  'Loratadine 10mg',
  'Diazepam 5mg',
];
const CATEGORIES = ['Antibiotic', 'Analgesic', 'Antacid', 'Antihistamine', 'Diuretic'];
const SUPPLIERS = ['Acme Pharma', 'MediCorp', 'HealthSupply Co', 'Global Meds', 'CarePoint'];

// Deterministic 60-row dataset (enough to paginate + scroll).
const DATA: Batch[] = Array.from({ length: 60 }, (_, i) => ({
  id: `b${i + 1}`,
  name: NAMES[i % NAMES.length],
  batch: `BN-${1000 + i * 3}`,
  category: CATEGORIES[i % CATEGORIES.length],
  supplier: SUPPLIERS[i % SUPPLIERS.length],
  location: `Aisle ${1 + (i % 6)} · Shelf ${1 + (i % 4)}`,
  expiry: `${String(1 + (i % 28)).padStart(2, '0')}/${String(1 + (i % 12)).padStart(2, '0')}/2027`,
  stock: ((i * 137) % 900) + 20,
  price: Number((((i * 7) % 300) / 100 + 0.02).toFixed(2)),
}));

type SortKey =
  | 'name'
  | 'batch'
  | 'category'
  | 'supplier'
  | 'location'
  | 'expiry'
  | 'stock'
  | 'price';

// The tabs/groups this table can tab through (kdd/edit-line-card-table). GroupKey is the typed
// union a column's `tabsAndGroups` must match — a typo is a compile error. Each carries an icon
// + translated label; drives the tab strip (table view) and the card group-rows (card view).
// Columns tagged [ALL_TABS] (name, batch) are anchors: every tab, but NOT a card group.
type GroupKey = 'details' | 'supply' | 'pricing';
const TABS_AND_GROUPS: TabAndGroup<GroupKey>[] = [
  { key: 'details', labelKey: 'table.demo-group.details', icon: () => <InfoIcon /> },
  { key: 'supply', labelKey: 'table.demo-group.supply', icon: () => <TruckIcon /> },
  { key: 'pricing', labelKey: 'table.demo-group.pricing', icon: () => <StockIcon /> },
];

// The columns the show/hide toggles cover. `id` is the TanStack column id (= accessorKey);
// `label` is the header. Kept beside the column defs so the toggle set stays in step.
const COLUMN_TOGGLES: { id: SortKey; label: string }[] = [
  { id: 'name', label: 'Item' },
  { id: 'batch', label: 'Batch' },
  { id: 'category', label: 'Category' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'location', label: 'Location' },
  { id: 'expiry', label: 'Expiry' },
  { id: 'stock', label: 'In stock' },
  { id: 'price', label: 'Unit price' },
];

export const TableShowcase = () => {
  const [sort, setSort] = createSignal<SortState<SortKey>>({ key: 'name', desc: false });
  const [offset, setOffset] = createSignal(0);
  const [pageSize, setPageSize] = createSignal(20);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);

  // Local column config, standing in for createTableConfig (which needs store context /
  // appData the standalone showcase doesn't have). This is a mini-createTableConfig: a
  // LayeredConfig with a `base` and a `compact` band, resolved against the ACTUAL viewport
  // via createMediaQuery — exactly like the real thing. The two toolbar checkbox rows edit
  // each band independently; resize below 600px and the table follows the compact row,
  // demonstrating that bands don't share.
  const [layered, setLayered] = createSignal<LayeredConfig>({});
  const isCompact = createMediaQuery(mediaQuery.compact);
  const activeBand = (): Band => (isCompact() ? 'compact' : 'base');

  // Resolved config for the active band → DataTable's `config`. Only the user layer here.
  const tableConfig = () => resolveTableConfig(activeBand(), { user: layered() });

  // setConfig writes the ACTIVE band (DataTable already resolved TanStack's updater to a
  // value). The checkbox rows below instead target a SPECIFIC band via setBandConfig, so
  // you can edit compact while viewing base.
  const setConfig = <K extends TableConfigKey>(key: K, value: TableConfig[K]) =>
    setBandConfig(activeBand(), key, value);

  const setBandConfig = <K extends TableConfigKey>(band: Band, key: K, value: TableConfig[K]) =>
    setLayered((current) => ({ ...current, [band]: { ...current[band], [key]: value } }));

  // Stand in for the server: sort the whole dataset, then slice the current page.
  const sorted = createMemo(() => {
    const { key, desc } = sort();
    return [...DATA].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const cmp =
        typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return desc ? -cmp : cmp;
    });
  });
  const rows = () => sorted().slice(offset(), offset() + pageSize());

  const onSort = (key: SortKey, desc: boolean) => {
    setSort({ key, desc });
    setOffset(0);
  };

  // meta.card assigns each column its region in card view (ui-standards § tables):
  // name = primary title, batch = the secondary code line, category = the top-right badge;
  // the rest fall to the grid (default). Table view is unaffected.
  // Columns carry both axes: `meta.card` (card region) AND `groups` (tab/section membership).
  // name + batch declare NO groups → anchors, shown in every tab. The rest split across the
  // three groups. Switch the tab strip (or card view) to see the secondary column filter.
  const columns = (): Column<Batch, SortKey, GroupKey>[] => [
    // name + batch: ALL_TABS anchors (every tab; not a card group).
    { c: { key: 'name' }, sortKey: 'name', header: 'Item', meta: { card: { region: 'primary' } }, tabsAndGroups: ALL_TABS },
    { c: { key: 'batch' }, sortKey: 'batch', header: 'Batch', tabsAndGroups: ALL_TABS },
    {
      c: { key: 'category' },
      sortKey: 'category',
      header: 'Category',
      meta: { card: { region: 'badge' } },
      tabsAndGroups: ['details'],
    },
    { c: { key: 'expiry' }, sortKey: 'expiry', header: 'Expiry', tabsAndGroups: ['details'] },
    { c: { key: 'supplier' }, sortKey: 'supplier', header: 'Supplier', tabsAndGroups: ['supply'] },
    {
      c: { key: 'location' },
      sortKey: 'location',
      header: 'Location',
      meta: { wrapLines: 2 },
      tabsAndGroups: ['supply'],
    },
    { c: { key: 'stock' }, sortKey: 'stock', header: 'In stock', ...getNumberCell(), tabsAndGroups: ['supply', 'pricing'] },
    {
      c: { key: 'price' },
      sortKey: 'price',
      header: 'Unit price',
      ...getNumberCell(),
      cell: (info) => `$${info.getValue<number>().toFixed(2)}`,
      tabsAndGroups: ['pricing'],
    },
  ];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: 'Catalogue' }, { label: 'Stock' }]} />
          <HeaderButtons>
            <Button icon={<PlusCircleIcon />} disabled title="Demo only">
              New item
            </Button>
          </HeaderButtons>
          <Toolbar>
            {/* Column show/hide per BAND — one row for base, one for compact. Each row
                edits its own band's columnVisibility ("show" semantics: checked = visible;
                unchecking writes `false`). The table resolves the row matching the current
                viewport (resize below 600px → it follows the compact row), so the two rows
                stay independent — bands don't share. The active band is marked. */}
            <For each={['base', 'compact'] as Band[]}>
              {(band) => (
                <div style={{ display: 'flex', gap: 'var(--space-3)', 'align-items': 'center' }}>
                  <strong style={{ 'min-width': '5rem' }}>
                    {band === 'base' ? 'Base' : 'Compact'}
                    {activeBand() === band ? ' (active)' : ''}
                  </strong>
                  <For each={COLUMN_TOGGLES}>
                    {(col) => {
                      // Reflect THIS band's stored value, not the resolved config.
                      const visible = () => layered()[band]?.columnVisibility?.[col.id] !== false;
                      return (
                        <label
                          style={{ display: 'inline-flex', gap: 'var(--space-1)', 'align-items': 'center' }}
                        >
                          <input
                            type="checkbox"
                            checked={visible()}
                            onChange={(e) =>
                              setBandConfig(band, 'columnVisibility', {
                                ...layered()[band]?.columnVisibility,
                                [col.id]: e.currentTarget.checked,
                              })
                            }
                          />
                          {col.label}
                        </label>
                      );
                    }}
                  </For>
                </div>
              )}
            </For>
          </Toolbar>
        </Header>
      }
      contentFooter={
        // The one contextual footer band: pagination normally, replaced by the selection
        // action bar while rows are selected — the same swap the real page does.
        <Show
          when={selectedIds().length > 0}
          fallback={
            <ContentFooter>
              <Pagination
                offset={offset()}
                pageSize={pageSize()}
                total={DATA.length}
                onOffsetChange={setOffset}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setOffset(0);
                }}
              />
            </ContentFooter>
          }
        >
          <ContentFooter>
            <strong>{selectedIds().length} selected</strong>
            <Button variant="secondary" icon={<TrashIcon />} disabled title="Demo only">
              Delete
            </Button>
            <ContentFooterActions>
              <Button variant="secondary" icon={<CloseIcon />} onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        </Show>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={(r) => r.id}
        sort={sort()}
        onSort={onSort}
        tabsAndGroups={TABS_AND_GROUPS}
        emptyMessage="No items"
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        config={tableConfig()}
        setConfig={setConfig}
      />
    </Page>
  );
};
