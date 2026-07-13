import { createMemo, createSignal, Show } from 'solid-js';
import { DataTable, type Column, type SortState } from '../ui/elements/table/DataTable';
import { getNumberCell } from '../ui/elements/table/tableHelpers';
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

export const TableShowcase = () => {
  const [sort, setSort] = createSignal<SortState<SortKey>>({ key: 'name', desc: false });
  const [offset, setOffset] = createSignal(0);
  const [pageSize, setPageSize] = createSignal(20);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);

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

  const columns = (): Column<Batch, SortKey>[] => [
    { accessorKey: 'name', sortKey: 'name', header: 'Item' },
    { accessorKey: 'batch', sortKey: 'batch', header: 'Batch' },
    { accessorKey: 'category', sortKey: 'category', header: 'Category' },
    { accessorKey: 'supplier', sortKey: 'supplier', header: 'Supplier' },
    { accessorKey: 'location', sortKey: 'location', header: 'Location' },
    { accessorKey: 'expiry', sortKey: 'expiry', header: 'Expiry' },
    { accessorKey: 'stock', sortKey: 'stock', header: 'In stock', ...getNumberCell() },
    {
      accessorKey: 'price',
      sortKey: 'price',
      header: 'Unit price',
      ...getNumberCell(),
      cell: (info) => `$${info.getValue<number>().toFixed(2)}`,
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
            <span>Filters would go here (this is the DataTable demo page).</span>
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
        emptyMessage="No items"
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
      />
    </Page>
  );
};
