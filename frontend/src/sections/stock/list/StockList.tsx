import { createResource, createSignal, Show } from 'solid-js';
import type { Component, JSX } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { formatNumber } from '../../../intl/formatNumber';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { Button } from '../../../ui/elements/buttons/Button';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import { ChipListCell } from '../../../ui/elements/table/ChipListCell';
import { createTableConfig } from '../../../api/createTableConfig';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import {
  PlusCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ListIcon,
} from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { stripEmpty } from '../../../typeHelpers';
import { stockPreferences } from '../../../store/storeContext';
import {
  StockLines,
  ItemsByStockLineFilter,
  type StockLineRowFragment,
  type StockLinesVariables,
  type ItemsByStockLineFilterResult,
} from './stock.generated';
import {
  filterFields,
  STOCK_LINE_ONLY_FILTER_KEYS,
  type StockFilter,
} from './listFilters';
import { NewStockModal } from './NewStockModal';
import { ExportStockAction } from './actions/ExportStockAction';

// The stock list view (spec/stock S1). The store's stock lines that have packs
// on hand (total > 0 — the always-on hasPacksInStore gate), server-paginated /
// filtered / sorted, with a grouped-by-item toggle. Data + URL-backed
// filter/sort/pagination/grouped state are owned here; the UI composes library
// components (Page / Header / FilterBar / DataTable). No selection, no bulk
// footer (spec deviation: stock lines are never deleted from this screen). The
// grouped view flattens item aggregate rows + their expandable batch rows into
// ONE DataTable (DataTable has no native row expansion — page-owned instead).

const DEFAULT_PAGE_SIZE = 20;
const DASH = '—';

type LineRow = StockLineRowFragment;
type GroupedConnector = Extract<
  ItemsByStockLineFilterResult['itemsByStockLineFilter'],
  { __typename: 'ItemConnector' }
>;
type ItemRow = GroupedConnector['nodes'][number];

type Row =
  | { kind: 'line'; id: string; line: LineRow }
  | { kind: 'item'; id: string; item: ItemRow };

// The server sort-field union — a column can only ever name a real key
// (kdd/type-safety). Grouped mode honours only itemName / itemCode.
type SortKey = NonNullable<StockLinesVariables['sort']>[number]['key'];

type StockListState = {
  filter: StockFilter;
  sort: NonNullable<StockLinesVariables['sort']>;
  offset: number;
  first: number;
  grouped: boolean;
};

const DEFAULT_STATE: StockListState = {
  filter: {},
  sort: [{ key: 'itemName', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
  grouped: false,
};

const fmtNum = (n: number) => formatNumber(n);
const fmtCur = (n: number) =>
  formatNumber(n, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmtDate = (d: string | null | undefined) => (d ? localisedDate(d) : DASH);

// Units = packs × pack size; value = packs × cost price (spec/stock rules —
// always computed, never stored).
const lineUnits = (l: LineRow) => l.totalNumberOfPacks * l.packSize;
const lineAvailUnits = (l: LineRow) => l.availableNumberOfPacks * l.packSize;
const lineValue = (l: LineRow) => l.totalNumberOfPacks * l.costPricePerPack;

const itemBatches = (item: ItemRow): LineRow[] => item.availableBatches.nodes;
const sumBy = (rows: LineRow[], f: (l: LineRow) => number) =>
  rows.reduce((acc, l) => acc + f(l), 0);

// A per-line attribute on an item row: the single value when every batch agrees,
// else the "multiple" marker (spec/stock AC-L5).
const singleOrMultiple = (
  rows: LineRow[],
  value: (l: LineRow) => string
): string => {
  const distinct = new Set(rows.map(value).filter(v => v !== ''));
  if (distinct.size === 0) return DASH;
  if (distinct.size === 1) return [...distinct][0];
  return t('label.multiple');
};

// The currency form of the above: the single price CURRENCY-formatted when every
// batch agrees (so an item aggregate row matches its child line rows), else the
// multiple marker.
const singleOrMultipleCurrency = (
  rows: LineRow[],
  value: (l: LineRow) => number
): string => {
  const distinct = new Set(rows.map(value));
  if (distinct.size === 0) return DASH;
  if (distinct.size === 1) return fmtCur([...distinct][0]);
  return t('label.multiple');
};

const StockList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<StockListState>(DEFAULT_STATE);
  const [createOpen, setCreateOpen] = createSignal(false);
  const [expanded, setExpanded] = createSignal<Set<string>>(new Set());

  const grouped = () => query().grouped;
  const prefs = () => stockPreferences();
  // In grouped mode only item name / code are server-sortable.
  const sortable = (k: SortKey) =>
    !grouped() || k === 'itemName' || k === 'itemCode';

  const flatVariables = (): StockLinesVariables => ({
    storeId: params.storeId,
    filter: { ...stripEmpty(query().filter), hasPacksInStore: true },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  });

  const groupedVariables = () => {
    const s = query().sort[0];
    const itemKey: 'name' | 'code' = s?.key === 'itemCode' ? 'code' : 'name';
    return {
      storeId: params.storeId,
      filter: { ...stripEmpty(query().filter), hasPacksInStore: true },
      sort: [{ key: itemKey, desc: s?.desc ?? false }],
      page: { first: query().first, offset: query().offset },
    };
  };

  // Only the ACTIVE view fetches: an inactive source returns false, so
  // createResource skips its fetcher. `.latest` reads never suspend.
  const [flatData] = createResource(
    () => (grouped() ? false : JSON.stringify(flatVariables())),
    async serialised => {
      const result = await graphqlFetch(
        StockLines,
        JSON.parse(serialised) as StockLinesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.stockLines;
    }
  );
  const [groupedData] = createResource(
    () => (grouped() ? JSON.stringify(groupedVariables()) : false),
    async serialised => {
      const result = await graphqlFetch(
        ItemsByStockLineFilter,
        JSON.parse(serialised) as ReturnType<typeof groupedVariables>
      );
      if (result.kind !== 'success') return undefined;
      return result.data.itemsByStockLineFilter.__typename === 'ItemConnector'
        ? result.data.itemsByStockLineFilter
        : undefined;
    }
  );

  const loading = () => (grouped() ? groupedData.loading : flatData.loading);
  const totalCount = () =>
    grouped()
      ? (groupedData.latest?.totalCount ?? 0)
      : (flatData.latest?.totalCount ?? 0);

  const rows = (): Row[] => {
    if (!grouped()) {
      return (flatData.latest?.nodes ?? []).map(line => ({
        kind: 'line' as const,
        id: `line-${line.id}`,
        line,
      }));
    }
    const items = groupedData.latest?.nodes ?? [];
    const out: Row[] = [];
    for (const item of items) {
      out.push({ kind: 'item', id: `item-${item.id}`, item });
      if (expanded().has(item.id)) {
        for (const line of itemBatches(item)) {
          out.push({ kind: 'line', id: `line-${line.id}`, line });
        }
      }
    }
    return out;
  };

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: StockFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  const toggleGrouped = () => {
    const next = !grouped();
    const filter = { ...query().filter };
    if (next) for (const key of STOCK_LINE_ONLY_FILTER_KEYS) delete filter[key];
    setExpanded(new Set<string>());
    setQuery({
      ...query(),
      grouped: next,
      filter,
      sort: [{ key: 'itemName', desc: query().sort[0]?.desc ?? false }],
      offset: 0,
    });
  };

  const toggleExpand = (itemId: string) => {
    const next = new Set(expanded());
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setExpanded(next);
  };

  const openLine = (id: string) =>
    navigate(`/${params.storeId}/inventory/stock/${id}`);

  const onRowClick = (row: Row) =>
    row.kind === 'line' ? openLine(row.line.id) : toggleExpand(row.item.id);

  // A units value with a dose sub-note for vaccine rows when manageVaccinesInDoses
  // is on (spec/stock AC-P2).
  const unitsCell = (units: number, isVaccine: boolean, doses: number) => (
    <span
      style={{
        display: 'inline-flex',
        'flex-direction': 'column',
        'align-items': 'flex-end',
      }}
    >
      <span>{fmtNum(units)}</span>
      <Show when={prefs().manageVaccinesInDoses && isVaccine}>
        <span
          style={{ 'font-size': 'var(--text-xs)', color: 'var(--gray-main)' }}
        >
          {fmtNum(units * doses)}
        </span>
      </Show>
    </span>
  );

  const tableConfig = createTableConfig({
    tableId: 'stock-list',
    defaultConfig: {
      base: {
        columnVisibility: {
          batch: false,
          expiryDate: false,
          manufactureDate: false,
          vvmStatus: false,
          locationCode: false,
          locationName: false,
          unit: false,
          packSize: false,
          soh: false,
          availableStock: false,
          costPricePerPack: false,
          sellPricePerPack: false,
          total: false,
          manufacturer: false,
          supplierName: false,
        },
      },
    },
  });

  // A plain-text column: line → its value; item → single-or-multiple across
  // batches. Empty → em dash.
  const textCol = (
    id: string,
    header: string,
    value: (l: LineRow) => string,
    opts: { sortKey?: SortKey; meta?: Column<Row, SortKey>['meta'] } = {}
  ): Column<Row, SortKey> => ({
    c: { id },
    header,
    enableSorting: !!opts.sortKey && sortable(opts.sortKey),
    ...(opts.sortKey && sortable(opts.sortKey)
      ? { sortKey: opts.sortKey }
      : {}),
    ...(opts.meta ? { meta: opts.meta } : {}),
    cell: info => {
      const row = info.row.original;
      if (row.kind === 'line') return value(row.line) || DASH;
      return singleOrMultiple(itemBatches(row.item), value);
    },
  });

  const columns = (): Column<Row, SortKey>[] => {
    const cols: Column<Row, SortKey>[] = [];

    if (grouped()) {
      cols.push({
        c: { id: 'expander' },
        header: '',
        enableSorting: false,
        cell: info => {
          const row = info.row.original;
          if (row.kind !== 'item') return null;
          return (
            <IconButton
              size="small"
              icon={
                expanded().has(row.item.id) ? (
                  <ChevronDownIcon />
                ) : (
                  <ChevronRightIcon />
                )
              }
              label={t('label.expand')}
              onClick={e => {
                e.stopPropagation();
                toggleExpand(row.item.id);
              }}
            />
          );
        },
      });
    }

    // A date column: line → the formatted date; item → single-or-multiple over
    // the raw ISO, formatting a shared single date.
    const dateCol = (
      id: string,
      header: string,
      value: (l: LineRow) => string | null | undefined,
      sortKey: SortKey
    ): Column<Row, SortKey> => ({
      c: { id },
      header,
      enableSorting: sortable(sortKey),
      ...(sortable(sortKey) ? { sortKey } : {}),
      cell: info => {
        const row = info.row.original;
        if (row.kind === 'line') return fmtDate(value(row.line));
        const single = singleOrMultiple(
          itemBatches(row.item),
          l => value(l) ?? ''
        );
        return single === t('label.multiple') || single === DASH
          ? single
          : fmtDate(single);
      },
    });

    cols.push(
      textCol('itemCode', t('label.code'), l => l.item.code, {
        sortKey: 'itemCode',
      }),
      textCol('itemName', t('label.name'), l => l.itemName, {
        sortKey: 'itemName',
        meta: { card: { region: 'primary' }, wrapLines: 2 },
      }),
      {
        c: { id: 'masterLists' },
        header: t('label.master-lists'),
        enableSorting: false,
        cell: info => {
          const row = info.row.original;
          const names =
            row.kind === 'item'
              ? (row.item.masterLists ?? []).map(m => m.name)
              : (row.line.item.masterLists ?? []).map(m => m.name);
          return <ChipListCell items={names} />;
        },
      },
      textCol('batch', t('label.batch'), l => l.batch ?? '', {
        sortKey: 'batch',
      }),
      dateCol(
        'expiryDate',
        t('label.expiry-date'),
        l => l.expiryDate,
        'expiryDate'
      ),
      dateCol(
        'manufactureDate',
        t('label.manufacture-date'),
        l => l.manufactureDate,
        'manufactureDate'
      )
    );

    if (prefs().manageVvmStatusForStock) {
      cols.push(
        textCol('vvmStatus', t('label.vvm-status'), l =>
          l.item.isVaccine ? (l.vvmStatus?.description ?? '') : ''
        )
      );
    }

    cols.push(
      textCol(
        'locationCode',
        t('label.location-code'),
        l => l.location?.code ?? '',
        {
          sortKey: 'locationCode',
        }
      ),
      textCol(
        'locationName',
        t('label.location-name'),
        l => l.location?.name ?? l.locationName ?? ''
      ),
      textCol('unit', t('label.unit'), l => l.item.unitName ?? ''),
      {
        c: { id: 'packSize' },
        header: t('label.pack-size'),
        enableSorting: sortable('packSize'),
        ...(sortable('packSize') ? { sortKey: 'packSize' as SortKey } : {}),
        meta: { align: 'right' },
        cell: info => {
          const row = info.row.original;
          if (row.kind === 'line') return fmtNum(row.line.packSize);
          return singleOrMultiple(itemBatches(row.item), l =>
            String(l.packSize)
          );
        },
      },
      {
        c: { id: 'numberOfPacks' },
        header: t('label.pack-qty'),
        enableSorting: sortable('numberOfPacks'),
        ...(sortable('numberOfPacks')
          ? { sortKey: 'numberOfPacks' as SortKey }
          : {}),
        meta: { align: 'right', card: { region: 'badge' } },
        cell: info => {
          const row = info.row.original;
          const packs =
            row.kind === 'line'
              ? row.line.totalNumberOfPacks
              : sumBy(itemBatches(row.item), l => l.totalNumberOfPacks);
          return fmtNum(packs);
        },
      },
      {
        c: { id: 'soh' },
        header: t('label.soh'),
        enableSorting: false,
        meta: { align: 'right' },
        cell: info => {
          const row = info.row.original;
          if (row.kind === 'item')
            return unitsCell(
              sumBy(itemBatches(row.item), lineUnits),
              row.item.isVaccine,
              row.item.doses
            );
          return unitsCell(
            lineUnits(row.line),
            row.line.item.isVaccine,
            row.line.item.doses
          );
        },
      },
      {
        c: { id: 'availableStock' },
        header: t('label.available-stock'),
        enableSorting: false,
        meta: { align: 'right' },
        cell: info => {
          const row = info.row.original;
          if (row.kind === 'item')
            return unitsCell(
              sumBy(itemBatches(row.item), lineAvailUnits),
              row.item.isVaccine,
              row.item.doses
            );
          return unitsCell(
            lineAvailUnits(row.line),
            row.line.item.isVaccine,
            row.line.item.doses
          );
        },
      },
      {
        c: { id: 'costPricePerPack' },
        header: t('label.pack-cost-price'),
        enableSorting: sortable('costPricePerPack'),
        ...(sortable('costPricePerPack')
          ? { sortKey: 'costPricePerPack' as SortKey }
          : {}),
        meta: { align: 'right' },
        cell: info => {
          const row = info.row.original;
          if (row.kind === 'line') return fmtCur(row.line.costPricePerPack);
          return singleOrMultipleCurrency(
            itemBatches(row.item),
            l => l.costPricePerPack
          );
        },
      },
      {
        c: { id: 'sellPricePerPack' },
        header: t('label.pack-sell-price'),
        enableSorting: sortable('sellPricePerPack'),
        ...(sortable('sellPricePerPack')
          ? { sortKey: 'sellPricePerPack' as SortKey }
          : {}),
        meta: { align: 'right' },
        cell: info => {
          const row = info.row.original;
          if (row.kind === 'line') return fmtCur(row.line.sellPricePerPack);
          return singleOrMultipleCurrency(
            itemBatches(row.item),
            l => l.sellPricePerPack
          );
        },
      },
      {
        c: { id: 'total' },
        header: t('label.total'),
        enableSorting: false,
        meta: { align: 'right' },
        cell: info => {
          const row = info.row.original;
          const value =
            row.kind === 'line'
              ? lineValue(row.line)
              : sumBy(itemBatches(row.item), lineValue);
          return fmtCur(value);
        },
      },
      textCol(
        'manufacturer',
        t('label.manufacturer'),
        l => l.manufacturer?.name ?? ''
      ),
      {
        c: { id: 'supplierName' },
        header: t('label.supplier'),
        enableSorting: sortable('supplierName'),
        ...(sortable('supplierName')
          ? { sortKey: 'supplierName' as SortKey }
          : {}),
        cell: info => {
          const row = info.row.original;
          const supplier =
            row.kind === 'line'
              ? (row.line.supplierName ?? '')
              : singleOrMultiple(
                  itemBatches(row.item),
                  l => l.supplierName ?? ''
                );
          // Blank supplier renders the fixed "Inventory adjustment" text.
          return supplier && supplier !== DASH
            ? supplier
            : t('label.inventory-adjustment');
        },
      }
    );
    return cols;
  };

  const crumbs = () => [{ label: t('inventory') }, { label: t('stock') }];

  const emptyCreate = (): JSX.Element => (
    <Button
      icon={<PlusCircleIcon />}
      data-testid="nothing-here-create-button"
      onClick={() => setCreateOpen(true)}
    >
      {t('button.new-stock')}
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
          <Toolbar>
            <FilterBar
              filters={filterFields(grouped())}
              filter={query().filter}
              onChange={onFilterChange}
            />
            <IconButton
              icon={<ListIcon />}
              label={t('label.group-by-item')}
              data-testid="group-by-item-toggle"
              bordered
              aria-pressed={grouped()}
              onClick={toggleGrouped}
            />
          </Toolbar>
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
        loading={loading()}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={onRowClick}
        rowTone={row => (row.kind === 'line' && grouped() ? 'info' : undefined)}
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
          onPageSizeChange: first => setQuery({ ...query(), first, offset: 0 }),
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
