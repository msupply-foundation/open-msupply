import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../api/graphql';
import { authUser } from '../../auth/authContext';
import { localisedDate } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../ui/layout/Header/Toolbar';
import { ContentFooter } from '../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../ui/elements/buttons/Button';
import { DataTable, type Column, type SortState } from '../../ui/elements/table/DataTable';
import {
  getUserTableConfig,
  parseGlobalTableConfig,
  resolveTableConfig,
  setUserTableConfig,
  type TableConfig,
} from '../../ui/elements/table/tableConfig';
import { StatusChip } from '../../ui/elements/feedback/StatusChip';
import { FilterBar, type FilterValues } from '../../ui/elements/selectors/FilterBar';
import { Pagination } from '../../ui/elements/table/Pagination';
import { PlusCircleIcon, TrashIcon } from '../../ui/icons';
import { useUrlQueryState } from '../../list/urlQueryState';
import { Stocktakes } from './stocktakes.generated';
import type { StocktakesVariables, StocktakesResult } from './stocktakes.generated';
import { GlobalTableConfigs } from '../../api/tableConfig.generated';
import {
  FILTER_FIELDS,
  toStocktakeFilter,
  toFilterValues,
  type StocktakeFilter,
} from './listFilters';

// The stocktakes list view — the reference list screen. Data + URL-backed
// filter/sort/pagination/view state come from the vertical; the UI is composed from
// library components (Page / Header / FilterBar / DataTable / Pagination /
// ContentFooter), so the page owns no CSS. The table itself is the shared
// TanStack-driven DataTable (column config, selection, table/card view). Spec:
// spec/stocktakes (S1) + spec/ui-standards/{list-views,tables}.

const DEFAULT_PAGE_SIZE = 20;

// One id per list table, keying both the user's saved config (app data) and the API
// global default (see DataTable/tableConfig.ts). Matches Open mSupply's tableId.
const TABLE_ID = 'stocktake-list';

type StocktakeRow = StocktakesResult['stocktakes']['nodes'][number];

// Sortable columns are typed to the generated sort-field union, so a column can
// only ever name a real sort key (kdd/type-safety).
type SortKey = NonNullable<StocktakesVariables['sort']>[number]['key'];

// URL-backed state. Filter and sort are exactly the generated GraphQL shapes (no
// remapping); pagination is offset + first, carried in the URL, and the view mode
// (table vs card) is carried too so it is shareable/restorable.
type StocktakesListState = {
  filter: StocktakeFilter;
  sort?: StocktakesVariables['sort'];
  offset: number;
  first: number;
  view?: 'table' | 'card';
};

const DEFAULT_STATE: StocktakesListState = { filter: {}, offset: 0, first: DEFAULT_PAGE_SIZE };

// Status → chip label + colour token (spread straight into StatusChip). NEW is
// the neutral grey, FINALISED the terminal "done" green (tokens.css --status-*).
const statusMeta = (status: StocktakeRow['status']) =>
  status === 'FINALISED'
    ? { label: 'Finalised', colour: 'var(--status-finalised)' }
    : { label: 'New', colour: 'var(--status-new)' };

const StocktakesList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout, which requires a resolved store before routing.
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { state, setState } = useUrlQueryState<StocktakesListState>(DEFAULT_STATE);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);

  // GraphQL variables, derived straight from URL state + the store in the path.
  const variables = createMemo<StocktakesVariables>(() => ({
    storeId: params.storeId,
    filter: state().filter,
    sort: state().sort,
    page: { first: state().first, offset: state().offset },
  }));

  // Global resource-style fetch (kdd/state-management): the fetcher passes codegen
  // output through the single never-throwing query method. Failures are handled
  // globally inside graphqlFetch (unexpected-error modal); here we keep the previous
  // data during a refetch.
  //
  // The resource SOURCE is the SERIALISED variables (a stable string), not the
  // variables object (kdd/no-remounts). Two states with identical query content
  // produce an equal string, so the resource does not refetch — e.g. adding an empty
  // filter chip, which our filter builder maps to the same effective filter, does not
  // reflash the list. Reading data() during a refetch returns the previous value and
  // does not suspend the section's boundary, so interaction never remounts the table.
  const [data] = createResource(
    () => JSON.stringify(variables()),
    async (serialised) => {
      const result = await graphqlFetch(Stocktakes, JSON.parse(serialised) as StocktakesVariables);
      if (result.kind !== 'success') return undefined;
      return result.data.stocktakes;
    },
  );

  const rows = () => data()?.nodes ?? [];
  const totalCount = () => data()?.totalCount ?? 0;

  // --- Column config (order / width / pinning / visibility), per user ---
  // API global default for this table (read-only; no save-config mutation here).
  const [globalDefault] = createResource(
    () => params.storeId,
    async (storeId) => {
      const result = await graphqlFetch(GlobalTableConfigs, { storeId });
      if (result.kind !== 'success') return undefined;
      return parseGlobalTableConfig(result.data.preferences.globalTableConfigs, TABLE_ID);
    },
  );
  const userId = () => authUser()?.userId ?? '';
  const [userConfig, setUserConfig] = createSignal<TableConfig>(getUserTableConfig(userId(), TABLE_ID));
  const tableConfig = () => resolveTableConfig(userConfig(), globalDefault());
  const onConfigChange = (config: TableConfig) => {
    setUserTableConfig(userId(), TABLE_ID, config);
    setUserConfig(config);
  };

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = state().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Clicking a sortable header: sort ascending, or flip direction if it is already
  // the key. Resets to the first page. Written as the GraphQL array shape.
  const onSort = (key: SortKey) => {
    const s = currentSort();
    const desc = s?.key === key ? !s.desc : false;
    setState({ ...state(), sort: [{ key, desc }], offset: 0 });
  };

  const onFilterChange = (values: FilterValues) => {
    setState({ ...state(), filter: toStocktakeFilter(values), offset: 0 });
    setSelectedIds([]);
  };

  const openRow = (row: StocktakeRow) =>
    navigate(`/${params.storeId}/inventory/stocktakes/${row.id}`);

  const columns: Column<StocktakeRow, SortKey>[] = [
    { header: 'Number', sortKey: 'stocktakeNumber', cell: (r) => r.stocktakeNumber },
    { header: 'Status', sortKey: 'status', cell: (r) => <StatusChip {...statusMeta(r.status)} /> },
    { header: 'Description', sortKey: 'description', cell: (r) => r.description ?? '—' },
    { header: 'Comment', sortKey: 'comment', cell: (r) => r.comment ?? '—' },
    {
      header: 'Stocktake date',
      sortKey: 'stocktakeDate',
      cell: (r) => (r.stocktakeDate ? localisedDate(r.stocktakeDate) : '—'),
    },
    { header: 'Created', sortKey: 'createdDatetime', cell: (r) => localisedDate(r.createdDatetime) },
    { header: 'Locked', cell: (r) => (r.isLocked ? 'Yes' : 'No') },
  ];

  const crumbs = [{ label: 'Inventory' }, { label: 'Stocktakes' }];

  return (
    <Page
      header={
        <Header>
          <Breadcrumb crumbs={crumbs} />
          <HeaderButtons>
            {/* Create flow (modal) is deferred with the detail work — needs the
                ⛔ Modal dialog. The button anchors the recipe shape for now. */}
            <Button icon={<PlusCircleIcon />} disabled title="Coming soon">
              New stocktake
            </Button>
          </HeaderButtons>
          <Toolbar>
            <FilterBar
              fields={FILTER_FIELDS}
              values={toFilterValues(state().filter)}
              onChange={onFilterChange}
            />
          </Toolbar>
        </Header>
      }
      contentFooter={
        <Show when={selectedIds().length > 0}>
          <ContentFooter>
            <strong>{selectedIds().length} selected</strong>
            <ContentFooterActions>
              <Button variant="secondary" onClick={() => setSelectedIds([])}>
                Clear
              </Button>
              {/* Batch delete is deferred (mutation + confirmation dialog). */}
              <Button variant="secondary" icon={<TrashIcon />} disabled title="Coming soon">
                Delete
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        </Show>
      }
    >
      <DataTable
        columns={columns}
        rows={rows()}
        rowKey={(r) => r.id}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        emptyMessage="No stocktakes match these filters."
        config={tableConfig()}
        onConfigChange={onConfigChange}
        view={state().view ?? 'table'}
        onViewChange={(view) => setState({ ...state(), view })}
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        // Rendered inside the table so it stays visible in full screen (the
        // selection bulk-bar lives in the page's action footer per the spec).
        footer={
          <Pagination
            offset={state().offset}
            pageSize={state().first}
            total={totalCount()}
            onOffsetChange={(offset) => setState({ ...state(), offset })}
            onPageSizeChange={(first) => setState({ ...state(), first, offset: 0 })}
          />
        }
      />
    </Page>
  );
};

export default StocktakesList;
