import { createResource, createSignal } from 'solid-js';
import type { Component, JSX } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { formatNumber } from '../../../intl/formatNumber';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Button } from '../../../ui/elements/buttons/Button';
import { createAddAction } from '../../../ui/utils/keyActions';
import { ALT_N } from '../../../ui/utils/shortcuts';
import {
  DataTable,
  type CardGroup,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import { getCellDefinition } from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { PlusCircleIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '../../../list/pageSize';
import { stripEmpty } from '../../../typeHelpers';
import { stockPreferences } from '../../../store/storeContext';
import {
  StockLines,
  type StockLineRowFragment,
  type StockLinesVariables,
} from './stock.generated';
import { filterFields, type StockFilter } from './listFilters';
import { NewStockModal } from './NewStockModal';
import { ExportStockAction } from './actions/ExportStockAction';

// The stock list view (spec/stock S1). The store's stock lines that have packs
// on hand (total > 0 — the always-on hasPacksInStore gate), server-paginated /
// filtered / sorted. Data + URL-backed filter/sort/pagination state are owned
// here; the UI composes library components (Page / Header / FilterBar /
// DataTable). No selection, no bulk footer (spec deviation: stock lines are
// never deleted from this screen).
//
// ONE Column<Row, SortKey, GroupKey> list renders as BOTH the table and the
// card view (spec/stock S1 › card view): each column declares its card slot
// (meta.headerPosition for the header, cardGroup 'more' for the disclosure,
// neither for the always-shown body). Table column order follows the current
// open-mSupply Stock ListView (see columns() below). Sorting is server-driven —
// a column is sortable only when it declares a sortKey AND resolves an accessor
// (TanStack gates header sort on the accessorFn; a pure display column never
// sorts — this is why the old id-only columns were dead, kdd/table-state).
//
// The grouped-by-item view is deferred this iteration (spec/stock DIVERGENCES
// D63) — the list is the flat stock-line list only.

type Row = StockLineRowFragment;

// Card body groups (spec/stock S1 › card view): one collapsed "More details"
// disclosure holds every column that is neither in the header nor always shown.
type GroupKey = 'more';
const CARD_GROUPS: CardGroup<Row, GroupKey>[] = [
  { key: 'more', disclosure: 'closed' }, // no labelKey → "More details"
];

// The server sort-field union — a column can only ever name a real key
// (kdd/type-safety).
type SortKey = NonNullable<StockLinesVariables['sort']>[number]['key'];

type StockListState = {
  filter: StockFilter;
  sort: NonNullable<StockLinesVariables['sort']>;
  offset: number;
  first: number;
};

const DEFAULT_STATE: StockListState = {
  // The search (batch or item code/name) is the list's default filter
  // (ui-standards § tables → filtering): seeded present-as-null so its chip is
  // on the bar from the start; stripEmpty keeps it out of the query until
  // typed.
  filter: { search: null },
  sort: [{ key: 'itemName', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// Units = packs × pack size; value = packs × cost price (spec/stock rules —
// always computed, never stored).
const lineUnits = (l: Row) => l.totalNumberOfPacks * l.packSize;
const lineAvailUnits = (l: Row) => l.availableNumberOfPacks * l.packSize;
const lineValue = (l: Row) => l.totalNumberOfPacks * l.costPricePerPack;

const StockList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<StockListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [createOpen, setCreateOpen] = createSignal(false);
  const prefs = () => stockPreferences();

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, for the two controls that trigger it (the header button and
  // the ghost button in the table's empty slot); each carries `shortcut={ALT_N}`
  // for its badge, neither owns the action.
  createAddAction({
    name: 'button.new-stock',
    run: () => setCreateOpen(true),
  });

  const variables = (): StockLinesVariables => ({
    storeId: params.storeId,
    filter: { ...stripEmpty(query().filter), hasPacksInStore: true },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  });

  // Global resource-style fetch (kdd/state-management): the serialised
  // variables are the resource source (a stable string —
  // kdd/solid-reactivity-pitfalls), and `.latest` reads never suspend, so a
  // filter/sort/page refetch keeps the table mounted and shows the loading
  // treatment rather than remounting.
  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        StockLines,
        JSON.parse(serialised) as StockLinesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.stockLines;
    }
  );

  const rows = (): Row[] => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Clicking a sortable header: the DataTable (TanStack) computes the next
  // direction and hands back key + desc; we record it as the GraphQL sort
  // array, resetting to the first page.
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: StockFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  const openLine = (id: string) =>
    navigate(`/${params.storeId}/inventory/stock/${id}`);

  // A units figure with the dose equivalent appended as a suffix for vaccine
  // rows when manageVaccinesInDoses is on (spec/stock AC-P2) — mirrors the
  // items list's dose display (no bespoke styling).
  const unitsText = (
    units: number,
    isVaccine: boolean,
    doses: number
  ): string =>
    prefs().manageVaccinesInDoses && isVaccine
      ? `${formatNumber(units)} (${formatNumber(units * doses)} ${t('label.doses-short')})`
      : formatNumber(units);

  // Every column is shown by default; the user hides / reorders / pins them
  // from the Columns control (spec/stock S1). No default columnVisibility
  // overrides — the card view renders only VISIBLE columns, so a lean default
  // table would strip the card of its fields.
  const tableConfig = createTableConfig({ tableId: 'stock-list' });

  // Column order follows the current open-mSupply Stock ListView (Code · Name ·
  // Master lists · Batch · Expiry · Manufacture date · VVM · Location code ·
  // Location name · Unit · Pack size · Pack qty · SOH · Available stock · Cost
  // · Sell · Total · Manufacturer · Supplier). Each column also declares its
  // card slot per spec/stock S1 › card view.
  //
  // The card HEADER is Name-then-Code (the split for this screen), but the
  // TABLE keeps OMS's Code-first order — the one place the two views want a
  // different order (issue #551). So Code is TWO faces: a real table column
  // (Code first, sortable, hidden on the card) and a card-only primary placed
  // AFTER Name. Every other column is a single def serving both views.
  const columns = (): Column<Row, SortKey, GroupKey>[] => [
    {
      // Code — table face (OMS position 1): sortable, hidden on the card.
      c: { accessor: r => r.item.code, id: 'itemCode' },
      sortKey: 'itemCode',
      header: () => t('label.code'),
      ...getCellDefinition('itemCode', { hideOnCard: true }),
    },
    {
      // Name — primary in both views (card title).
      c: { key: 'itemName' },
      sortKey: 'itemName',
      header: () => t('label.name'),
      ...getCellDefinition('itemName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
    },
    {
      // Code — card face: the second primary, after Name; absent from the table
      // and from the Columns popover (structural).
      c: { accessor: r => r.item.code, id: 'itemCodeCard' },
      header: () => t('label.code'),
      ...getCellDefinition('itemCode', {
        headerPosition: 'primary',
        hideOnTable: true,
        hideFromColumnSettings: true,
      }),
    },
    {
      // Master lists — card: always shown.
      c: {
        accessor: r => (r.item.masterLists ?? []).map(m => m.name),
        id: 'masterLists',
      },
      header: () => t('label.master-lists'),
      ...getCellDefinition('masterLists'),
    },
    {
      // Batch — card: badge.
      c: { key: 'batch' },
      sortKey: 'batch',
      header: () => t('label.batch'),
      ...getCellDefinition('batch', { headerPosition: 'badge' }),
    },
    {
      // Expiry — card: always shown.
      c: { key: 'expiryDate' },
      sortKey: 'expiryDate',
      header: () => t('label.expiry-date'),
      ...getCellDefinition('expiryDate'),
    },
    {
      // Manufacture date — card: More details.
      c: { key: 'manufactureDate' },
      sortKey: 'manufactureDate',
      header: () => t('label.manufacture-date'),
      cardGroup: 'more',
      ...getCellDefinition('manufactureDate'),
    },
    ...(prefs().manageVvmStatusForStock
      ? [
          {
            // VVM status — card: More details (gated on the store preference).
            c: {
              accessor: (r: Row) =>
                r.item.isVaccine ? (r.vvmStatus?.description ?? '') : '',
              id: 'vvmStatus',
            },
            header: () => t('label.vvm-status'),
            cardGroup: 'more',
            // No status-chip preset exists yet (docs/CELL_TYPES.md § Status);
            // until one does this is short text, so it at least carries a
            // width rather than falling back to TanStack's default.
            ...getCellDefinition<Row>('vvmStatus'),
          } satisfies Column<Row, SortKey, GroupKey>,
        ]
      : []),
    {
      // Location code — card: More details.
      c: { accessor: r => r.location?.code ?? '', id: 'locationCode' },
      sortKey: 'locationCode',
      header: () => t('label.location-code'),
      cardGroup: 'more',
      // 'locationCode', not 'location': this column's header is the longer
      // "Location code", which needs its own width and no growth cap (#601).
      ...getCellDefinition('locationCode'),
    },
    {
      // Location name — card: More details.
      c: {
        accessor: r => r.location?.name ?? r.locationName ?? '',
        id: 'locationName',
      },
      header: () => t('label.location-name'),
      cardGroup: 'more',
      ...getCellDefinition('locationName'),
    },
    {
      // Unit — card: always shown.
      c: { accessor: r => r.item.unitName ?? '', id: 'unit' },
      header: () => t('label.unit'),
      ...getCellDefinition('unit'),
    },
    {
      // Pack size — card: always shown.
      c: { key: 'packSize' },
      sortKey: 'packSize',
      header: () => t('label.pack-size'),
      ...getCellDefinition('packSize'),
    },
    {
      // Pack qty — card: More details.
      c: { accessor: r => r.totalNumberOfPacks, id: 'numberOfPacks' },
      sortKey: 'numberOfPacks',
      header: () => t('label.pack-qty'),
      cardGroup: 'more',
      ...getCellDefinition('numberOfPacks'),
    },
    {
      // SOH — card: More details.
      c: { accessor: r => lineUnits(r), id: 'soh' },
      header: () => t('label.soh'),
      cardGroup: 'more',
      ...getCellDefinition('units'),
      cell: info =>
        unitsText(
          lineUnits(info.row.original),
          info.row.original.item.isVaccine,
          info.row.original.item.doses
        ),
    },
    {
      // Available stock — card: always shown.
      c: { accessor: r => lineAvailUnits(r), id: 'availableStock' },
      header: () => t('label.available-stock'),
      ...getCellDefinition('units'),
      cell: info =>
        unitsText(
          lineAvailUnits(info.row.original),
          info.row.original.item.isVaccine,
          info.row.original.item.doses
        ),
    },
    {
      // Cost price — card: More details.
      c: { key: 'costPricePerPack' },
      sortKey: 'costPricePerPack',
      header: () => t('label.pack-cost-price'),
      cardGroup: 'more',
      ...getCellDefinition('costPricePerPack'),
    },
    {
      // Sell price — card: More details.
      c: { key: 'sellPricePerPack' },
      sortKey: 'sellPricePerPack',
      header: () => t('label.pack-sell-price'),
      cardGroup: 'more',
      ...getCellDefinition('sellPricePerPack'),
    },
    {
      // Total — card: More details.
      c: { accessor: r => lineValue(r), id: 'total' },
      header: () => t('label.total'),
      cardGroup: 'more',
      ...getCellDefinition('total'),
    },
    {
      // Manufacturer — card: More details.
      c: { accessor: r => r.manufacturer?.name ?? '', id: 'manufacturer' },
      header: () => t('label.manufacturer'),
      cardGroup: 'more',
      ...getCellDefinition('manufacturer'),
    },
    {
      // Supplier — card: More details. Blank renders "Inventory adjustment".
      c: { accessor: r => r.supplierName ?? '', id: 'supplierName' },
      sortKey: 'supplierName',
      header: () => t('label.supplier'),
      cardGroup: 'more',
      ...getCellDefinition('supplierName'),
      cell: info => {
        const supplier = info.getValue<string>();
        return supplier && supplier.length > 0
          ? supplier
          : t('label.inventory-adjustment');
      },
    },
  ];

  const crumbs = () => [{ label: t('stock') }];

  const emptyCreate = (): JSX.Element => (
    <Button
      variant="ghost"
      shortcut={ALT_N}
      data-testid="nothing-here-create-button"
      onClick={() => setCreateOpen(true)}
    >
      {t('button.add-new-stock')}
    </Button>
  );

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            <Button
              icon={<PlusCircleIcon />}
              shortcut={ALT_N}
              data-testid="new-stock-button"
              onClick={() => setCreateOpen(true)}
            >
              {t('button.new-stock')}
            </Button>
            <ExportStockAction
              storeId={params.storeId}
              filter={() => query().filter}
              sort={() => query().sort}
            />
          </HeaderButtons>
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
        // Filters live in the table's own toolbar (ui-standards § tables →
        // filtering), never the page header; state stays URL-backed here.
        filters={
          <FilterBar
            filters={filterFields()}
            filter={query().filter}
            onChange={onFilterChange}
          />
        }
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={row => openLine(row.id)}
        showCardToggle
        cardGroups={CARD_GROUPS}
        emptyMessage={t('error.no-stock')}
        empty={emptyCreate()}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          onOffsetChange: offset => setQuery({ ...query(), offset }),
          onPageSizeChange: first => {
            rememberPageSize(first);
            setQuery({ ...query(), first, offset: 0 });
          },
        }}
      />
      <NewStockModal
        open={createOpen()}
        storeId={params.storeId}
        onClose={() => setCreateOpen(false)}
        onCreated={id => {
          setCreateOpen(false);
          openLine(id);
        }}
      />
    </Page>
  );
};

export default StockList;
