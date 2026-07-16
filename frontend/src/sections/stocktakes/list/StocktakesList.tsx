import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import { DataTable, type Column, type SortState } from '../../../ui/elements/table/DataTable';
import { getBooleanCell, getDateCell, getNumberCell } from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { Pagination } from '../../../ui/elements/table/Pagination';
import { CloseIcon, PlusCircleIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { stripEmpty } from '../../../typeHelpers';
import { Stocktakes } from './stocktakes.generated';
import type { StocktakesVariables, StocktakesResult } from './stocktakes.generated';
import { filterFields, type StocktakeFilter } from './listFilters';
import { CreateStocktakeModal } from './CreateStocktakeModal';
import { DeleteStocktakesAction } from './actions';

// The stocktakes list view — the reference list screen. Data + URL-backed
// filter/sort/pagination state come from the vertical; the UI is composed from library
// components (Page / Header / FilterBar / DataTable / Pagination / ContentFooter), so the
// page owns no CSS. The table itself is the shared TanStack-driven DataTable (server sort,
// selection, pagination, full-screen). Spec: spec/stocktakes (S1) +
// spec/ui-standards/{list-views,tables}.

const DEFAULT_PAGE_SIZE = 20;

type StocktakeRow = StocktakesResult['stocktakes']['nodes'][number];

// Sortable columns are typed to the generated sort-field union, so a column can
// only ever name a real sort key (kdd/type-safety).
type SortKey = NonNullable<StocktakesVariables['sort']>[number]['key'];

// URL-backed state. Filter and sort are exactly the generated GraphQL shapes (no
// remapping); pagination is offset + first, carried in the URL so it is
// shareable/restorable.
type StocktakesListState = {
  filter: StocktakeFilter;
  sort?: StocktakesVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: by stocktake number, newest (highest) first — matches Open mSupply's
// default and puts the most recent stocktakes at the top. URL-backed, so a user's own
// header click overrides it (and is shareable/restorable).
const DEFAULT_STATE: StocktakesListState = {
  filter: {},
  sort: [{ key: 'stocktakeNumber', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// Status → chip label + colour token (spread straight into StatusChip). NEW is
// the neutral grey, FINALISED the terminal "done" green (tokens.css --status-*).
const statusMeta = (status: StocktakeRow['status']) =>
  status === 'FINALISED'
    ? { label: t('stocktake.status.finalised'), colour: 'var(--status-finalised)' }
    : { label: t('stocktake.status.new'), colour: 'var(--status-new)' };

const StocktakesList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout, which requires a resolved store before routing.
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<StocktakesListState>(DEFAULT_STATE);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // The create modal owns its own form + create logic; the list just toggles it open. On a
  // successful create it navigates away to the new stocktake's detail page, so the list needs
  // no refetch here.
  const [createOpen, setCreateOpen] = createSignal(false);

  // Column config (order/sizing/pinning/visibility), resolved default → global → user and
  // by breakpoint band (kdd/table-state). On COMPACT (narrow viewport) the default shows
  // only #, status, description and stocktake date — comment/created/locked start hidden
  // to fit; on base (wide) all columns show (no default override). Bands don't share, so
  // the compact default doesn't touch base. "Show" semantics: only the hidden columns are
  // listed, as false. (User edits persist to app data; the store's global config can
  // override.)
  const tableConfig = createTableConfig({
    tableId: 'stocktakes',
    defaultConfig: {
      compact: {
        // On a narrow viewport, default to CARD view (ui-standards § tables auto-below-600)
        // and hide the denser columns; the user can switch back to table via the toolbar.
        viewMode: 'card',
        columnVisibility: { comment: false, createdDatetime: false, isLocked: false },
      },
    },
  });

  // GraphQL variables, derived straight from URL state + the store in the path.
  // stripEmpty drops added-but-empty filter chips (held as null keys) and any empty
  // operator objects, so the query — and the serialised resource key below — carry
  // only live filters: adding an empty chip does not reflash the list.
  const variables = createMemo<StocktakesVariables>(() => ({
    storeId: params.storeId,
    filter: stripEmpty(query().filter),
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));

  // Global resource-style fetch (kdd/state-management): the fetcher passes codegen
  // output through the single never-throwing query method. Failures are handled
  // globally inside graphqlFetch (unexpected-error modal); here we keep the previous
  // data during a refetch.
  //
  // The resource SOURCE is the SERIALISED variables (a stable string), not the
  // variables object (kdd/solid-reactivity-pitfalls). Two states with identical query content
  // produce an equal string, so the resource does not refetch — e.g. adding an empty
  // filter chip, which our filter builder maps to the same effective filter, does not
  // reflash the list. Reading data() during a refetch returns the previous value and
  // does not suspend the section's boundary, so interaction never remounts the table.
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async (serialised) => {
      const result = await graphqlFetch(Stocktakes, JSON.parse(serialised) as StocktakesVariables);
      if (result.kind !== 'success') return undefined;
      return result.data.stocktakes;
    },
  );

  const rows = () => data()?.nodes ?? [];
  const totalCount = () => data()?.totalCount ?? 0;

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Clicking a sortable header: the DataTable (TanStack) computes the next direction
  // and hands back key + desc; we just record it as the GraphQL sort array, resetting
  // to the first page.
  const onSort = (key: SortKey, desc: boolean) => {
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  };

  const onFilterChange = (filter: StocktakeFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  // Delete lives in its own DeleteStocktakesAction (button + confirm/deleting/success/error dialog +
  // the atomic batch mutation). On success it calls back here to clear the selection and re-query so
  // the deleted rows disappear (kdd/state-management).
  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  const openRow = (row: StocktakeRow) =>
    navigate(`/${params.storeId}/inventory/stocktakes/${row.id}`);

  // Columns and crumbs are accessors (not plain arrays): their text comes from
  // t(), which must be read in a reactive scope to re-translate on a language
  // switch. Passing columns()/crumbs() into a component prop lets Solid wrap it as
  // a getter, so the table headers and breadcrumb re-label when the locale changes.
  const columns = (): Column<StocktakeRow, SortKey>[] => [
    {
      c: { key: 'stocktakeNumber' },
      sortKey: 'stocktakeNumber',
      // Language-neutral '#' for the number column (universal symbol; no t() needed).
      header: '#',
      // getNumberCell merges extra meta — card:'primary' makes the number the card's title
      // (top-left); right-aligned in table view.
      ...getNumberCell({ card: { region: 'primary' } }),
    },
    {
      c: { key: 'status' },
      sortKey: 'status',
      header: t('stocktake.column.status'),
      cell: (info) => <StatusChip {...statusMeta(info.getValue<StocktakeRow['status']>())} />,
      // Card view: the status chip is the top-right badge.
      meta: { card: { region: 'badge' } },
    },
    {
      c: { key: 'description' },
      sortKey: 'description',
      header: t('stocktake.column.description'),
      // Card view: the description flows in the secondary area. Wraps to 2 lines.
      meta: { wrapLines: 2 },
    },
    {
      c: { key: 'comment' },
      sortKey: 'comment',
      header: t('stocktake.column.comment'),
    },
    {
      c: { key: 'stocktakeDate' },
      sortKey: 'stocktakeDate',
      header: t('stocktake.column.stocktake-date'),
      ...getDateCell(),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: t('stocktake.column.created'),
      ...getDateCell(),
    },
    {
      c: { key: 'isLocked' },
      header: t('stocktake.column.locked'),
      ...getBooleanCell(),
    },
  ];

  const crumbs = () => [{ label: t('nav.inventory') }, { label: t('nav.inventory.stocktakes') }];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            <Button icon={<PlusCircleIcon />} onClick={() => setCreateOpen(true)}>
              {t('stocktake.new')}
            </Button>
          </HeaderButtons>
          <Toolbar>
            <FilterBar filters={filterFields()} filter={query().filter} onChange={onFilterChange} />
          </Toolbar>
        </Header>
      }
      contentFooter={
        // The page's one contextual footer band (matching Open mSupply): pagination
        // normally, replaced by the selection action bar while rows are selected.
        <Show
          when={selectedIds().length > 0}
          fallback={
            <ContentFooter>
              <Pagination
                offset={query().offset}
                pageSize={query().first}
                total={totalCount()}
                onOffsetChange={(offset) => setQuery({ ...query(), offset })}
                onPageSizeChange={(first) => setQuery({ ...query(), first, offset: 0 })}
              />
            </ContentFooter>
          }
        >
          <ContentFooter>
            {/* Matching Open mSupply's action bar: the count and the row action(s)
                (Delete) group on the inline-start edge; Clear pins inline-end. */}
            <strong>{t('stocktake.selected', { count: selectedIds().length })}</strong>
            <DeleteStocktakesAction
              storeId={params.storeId}
              selectedIds={selectedIds}
              onDeleted={onDeleted}
            />
            <ContentFooterActions>
              <Button variant="secondary" icon={<CloseIcon />} onClick={() => setSelectedIds([])}>
                {t('common.clear')}
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
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        emptyMessage={t('stocktake.empty')}
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
      />
      <CreateStocktakeModal open={createOpen()} onClose={() => setCreateOpen(false)} />
    </Page>
  );
};

export default StocktakesList;
