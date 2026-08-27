import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '@/ui/elements/buttons/Button';
import { createAddAction } from '@/ui/utils/keyActions';
import { ALT_N } from '@/ui/utils/shortcuts';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  CommentHeader,
  getCellDefinition,
  getDateCell,
} from '@/ui/elements/table/tableHelpers';
import { createTableConfig } from '@/api/createTableConfig';
import { StatusChip } from '@/ui/elements/feedback/StatusChip';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { CloseIcon, PlusCircleIcon } from '@/ui/icons';
import { useUrlQueryState } from '@/list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '@/list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { stripEmpty } from '@/typeHelpers';
import { Stocktakes, StocktakeCount } from './stocktakes.generated';
import type {
  StocktakesVariables,
  StocktakesResult,
} from './stocktakes.generated';
import { filterFields, type StocktakeFilter } from './listFilters';
import { CreateStocktakeModal } from './CreateStocktakeModal';
import {
  CreateInitialStocktakeAction,
  DeleteStocktakesAction,
  ExportStocktakesAction,
} from './actions';

// The stocktakes list view — the reference list screen. Data + URL-backed
// filter/sort/pagination state come from the vertical; the UI is composed from
// library components (Page / Header / FilterBar / DataTable / Pagination /
// ContentFooter), so the page owns no CSS. The table itself is the shared
// TanStack-driven DataTable (server sort, selection, pagination, full-screen).
// Spec: spec/stocktakes (S1) + spec/ui-standards/{list-views,tables}.

type StocktakeRow = StocktakesResult['stocktakes']['nodes'][number];

// Sortable columns are typed to the generated sort-field union, so a column can
// only ever name a real sort key (kdd/type-safety).
type SortKey = NonNullable<StocktakesVariables['sort']>[number]['key'];

// URL-backed state. Filter and sort are exactly the generated GraphQL shapes
// (no remapping); pagination is offset + first, carried in the URL so it is
// shareable/restorable.
type StocktakesListState = {
  filter: StocktakeFilter;
  sort?: StocktakesVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: by created date, newest first — matches Open mSupply's list
// default (Stocktake/ListView useStocktakeList falls back to createdDatetime
// desc) and puts the most recent stocktakes at the top. URL-backed, so a user's
// own header click overrides it (and is shareable/restorable).
const DEFAULT_STATE: StocktakesListState = {
  filter: {},
  sort: [{ key: 'createdDatetime', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// Status → chip label + colour token (spread straight into StatusChip). NEW is
// the neutral grey, FINALISED the terminal "done" green (tokens.css
// --status-*). A locked stocktake is still status NEW, so it keeps the NEW
// colour but reads "New (On Hold)" — the lock is folded into the Status column
// (spec/stocktakes S1: there is no separate Locked column), conveyed by text
// (not colour alone). Matches OMS's ListView status accessorFn.
const statusMeta = (row: Pick<StocktakeRow, 'status' | 'isLocked'>) => {
  if (row.status === 'FINALISED')
    return { label: t('status.finalised'), colour: 'var(--status-finalised)' };
  return {
    label: row.isLocked ? t('label.stocktake-on-hold') : t('status.new'),
    colour: 'var(--status-new)',
  };
};

const StocktakesList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout, which requires a resolved store before routing.
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<StocktakesListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // The create modal owns its own form + create logic; the list just toggles
  // it open. On a successful create it navigates away to the new stocktake's
  // detail page, so the list needs no refetch here.
  const [createOpen, setCreateOpen] = createSignal(false);

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, because two controls trigger it: the header button and the
  // ghost button in the table's empty slot. Each carries `shortcut={ALT_N}` for
  // its badge; neither owns the action.
  createAddAction({
    name: 'label.new-stocktake',
    run: () => setCreateOpen(true),
  });
  // The initial (opening-balance) create action — offered from the empty state
  // only when the store has NO stocktakes at all (see hasStocktake below). Like
  // createOpen, a successful create navigates away.
  const [initialOpen, setInitialOpen] = createSignal(false);

  // Column config (order/sizing/pinning/visibility), resolved default → global
  // → user and by breakpoint band (kdd/table-state). On COMPACT (narrow
  // viewport) the default hides the stocktake number (defaultHideOnMobile in
  // OMS) so status + description lead the card; on base (wide) all columns show
  // (no default override). Bands don't share, so the compact default doesn't
  // touch base. "Show" semantics: only the hidden columns are listed, as false.
  // (User edits persist to app data; the store's global config can override.)
  const tableConfig = createTableConfig({
    tableId: 'stocktakes',
    defaultConfig: {
      compact: {
        // On a narrow viewport, default to CARD view (ui-standards § tables
        // auto-below-600) and hide the number; the user can switch back to
        // table via the toolbar. Created + Comment stay visible (they are not
        // defaultHideOnMobile in OMS).
        viewMode: 'card',
        columnVisibility: {
          stocktakeNumber: false,
        },
      },
    },
  });

  // GraphQL variables, derived straight from URL state + the store in the path.
  // stripEmpty drops added-but-empty filter chips (held as null keys) and any
  // empty operator objects, so the query — and the serialised resource key
  // below — carry only live filters: adding an empty chip does not reflash the
  // list.
  const variables = createMemo<StocktakesVariables>(() => ({
    storeId: params.storeId,
    filter: stripEmpty(query().filter),
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));

  // Global resource-style fetch (kdd/state-management): the fetcher passes
  // codegen output through the single never-throwing query method. Failures are
  // handled globally inside graphqlFetch (unexpected-error modal); here we keep
  // the previous data during a refetch.
  //
  // The resource SOURCE is the SERIALISED variables (a stable string), not the
  // variables object (kdd/solid-reactivity-pitfalls). Two states with
  // identical query content produce an equal string, so the resource does not
  // refetch — e.g. adding an empty filter chip, which our filter builder maps
  // to the same effective filter, does not reflash the list. Reading data()
  // during a refetch returns the previous value and does not suspend the
  // section's boundary, so interaction never remounts the table.
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        Stocktakes,
        JSON.parse(serialised) as StocktakesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.stocktakes;
    }
  );

  // Read `data.latest`, NOT `data()`: `.latest` never suspends (it returns the
  // previous value during a refetch, and undefined before the first load),
  // whereas reading `data()` while pending suspends the whole list into the
  // router's fallback-less <Suspense> — leaving the page BLANK on a slow
  // initial load instead of showing the table's loading spinner (#160/#196).
  // Keeping the read non-suspending lets the DataTable mount immediately and
  // show its `loading` treatment (kdd/solid-reactivity-pitfalls rule 1).
  const rows = () => data.latest?.nodes ?? [];

  const totalCount = () => data.latest?.totalCount ?? 0;

  // A bulk delete of the last page's rows leaves the offset past the new end
  // (src/list/clampPageOffset.ts, issue #1117).
  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  // "Does this store have ANY stocktake?" — a SEPARATE, filter-independent
  // fetch (mirrors OMS's useHasStocktake): the main list's totalCount is
  // filter-scoped, so a filter that matches nothing would falsely read as an
  // empty store and wrongly offer initial creation. We only need the store-wide
  // totalCount with no filter, so this uses the count-only `stocktakeCount`
  // query (no nodes fetched). Keyed on the store only, so it fetches once per
  // store and never re-runs on filter/sort/page changes. An initial stocktake
  // is a once-per-store opening balance; when the store has none the empty
  // state offers "Create initial stocktake", else "New stocktake".
  const [hasStocktakeData] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(StocktakeCount, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.stocktakes.totalCount > 0;
    }
  );
  // Read `.latest` (non-suspending), NOT `hasStocktakeData()`: a suspending
  // read here would collapse the whole list into the router's fallback-less
  // Suspense on first load (blank page — the same trap as `data()` above).
  // Undefined while unresolved — treat as "has stocktakes" so we DON'T flash
  // the initial-create affordance before we know (a store with stocktakes is
  // the common case; showing "New stocktake" and correcting to "initial" would
  // be the wrong direction to flicker).
  const hasStocktake = () => hasStocktakeData.latest ?? true;

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Clicking a sortable header: the DataTable (TanStack) computes the next
  // direction and hands back key + desc; we just record it as the GraphQL sort
  // array, resetting to the first page.
  const onSort = (key: SortKey, desc: boolean) => {
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  };

  const onFilterChange = (filter: StocktakeFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  // Delete lives in its own DeleteStocktakesAction (button +
  // confirm/deleting/success/error dialog + the atomic batch mutation). On
  // success it calls back here to clear the selection and re-query so the
  // deleted rows disappear (kdd/state-management).
  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  const openRow = (row: StocktakeRow) =>
    navigate(`/${params.storeId}/inventory/stocktakes/${row.id}`);

  // Columns and crumbs are accessors (not plain arrays): their text comes from
  // t(), which must be read in a reactive scope to re-translate on a language
  // switch. Passing columns()/crumbs() into a component prop lets Solid wrap
  // it as a getter, so the table headers and breadcrumb re-label when the
  // locale changes.
  const columns = (): Column<StocktakeRow, SortKey>[] => [
    {
      c: { key: 'stocktakeNumber' },
      sortKey: 'stocktakeNumber',
      // Language-neutral '#' for the number column (universal symbol; no t()
      // needed).
      header: () => '#',
      // The stocktake number is a short record number (like invoiceNumber), so
      // getCellDefinition gives it the narrow number-width preset +
      // right-align; headerPosition:'primary' makes it the card's title
      // (top-left).
      ...getCellDefinition('stocktakeNumber', { headerPosition: 'primary' }),
    },
    {
      c: { key: 'status' },
      sortKey: 'status',
      header: () => t('label.status'),
      cell: info => <StatusChip {...statusMeta(info.row.original)} />,
      // Card view: the status chip is the top-right badge.
      meta: { headerPosition: 'badge' },
    },
    {
      c: { key: 'description' },
      // Not sortable — matches OMS's list (Description has no sort control) and
      // the spec column table.
      header: () => t('label.description'),
      // Card view: the description flows in the secondary area. Wraps to 2
      // lines.
      meta: { wrapLines: 2 },
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getDateCell(),
    },
    {
      c: { key: 'comment' },
      // Not sortable — matches OMS's list column set.
      header: () => <CommentHeader />,
      ...getCellDefinition('comment'),
    },
  ];

  const crumbs = () => [{ label: t('stocktakes') }];

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
              data-testid="new-stocktake-button"
              onClick={() => setCreateOpen(true)}
            >
              {t('label.new-stocktake')}
            </Button>
            {/* Export the stocktakes list (all pages of the current filter) as
                CSV or Excel (spec/stocktakes S1). */}
            <ExportStocktakesAction
              storeId={params.storeId}
              filter={() => query().filter}
            />
          </HeaderButtons>
        </Header>
      }
      contentFooter={
        // The page's one contextual footer band: the selection action bar while
        // rows are selected, otherwise nothing (pagination now renders as an
        // overlay INSIDE the DataTable — see the `pagination` prop below —
        // matching the stocktake detail view; kdd/table-state).
        <Show when={selectedIds().length > 0}>
          <ContentFooter testId="actions-footer">
            {/* Matching Open mSupply's action bar: the count and the row action(s)
                (Delete) group on the inline-start edge; Clear pins inline-end. */}
            <strong data-testid="selected-rows-count">
              {selectedIds().length} {t('label.selected')}
            </strong>
            <DeleteStocktakesAction
              storeId={params.storeId}
              selectedIds={selectedIds}
              onDeleted={onDeleted}
            />
            <ContentFooterActions>
              <Button
                variant="secondary"
                icon={<CloseIcon />}
                onClick={() => setSelectedIds([])}
              >
                {t('label.clear-selection')}
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        </Show>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={r => r.id}
        // Filters live in the table's own toolbar (ui-standards § tables →
        // filtering), never the page header; state stays URL-backed here.
        filters={
          <FilterBar
            filters={filterFields()}
            filter={query().filter}
            onChange={onFilterChange}
          />
        }
        // `data.loading` (a non-suspending read) drives the table's loading
        // treatment: a centred spinner on first load (no rows yet), a thin
        // refreshing bar on filter/sort/page refetches (rows kept) — so a slow
        // fetch never flashes the "no stocktakes" empty state (#160/#196).
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        emptyMessage={`${t('error.no-stocktakes')} ${hasStocktake() ? '' : t('label.click-to-create-an')}`}
        // The empty-state action flips on whether the store has ANY stocktake
        // (mirrors OMS): a store with none is offered the once-per-store
        // INITIAL (opening-balance) create — a plain confirm, no mode controls;
        // a store that already has stocktakes (incl. filtered-to-nothing) gets
        // the regular "New stocktake" modal.
        empty={
          hasStocktake() ? (
            <Button
              variant="ghost"
              shortcut={ALT_N}
              data-testid="nothing-here-create-button"
              onClick={() => setCreateOpen(true)}
            >
              {t('button.create-a-new-one')}
            </Button>
          ) : (
            <Button
              variant="ghost"
              data-testid="nothing-here-create-button"
              onClick={() => setInitialOpen(true)}
            >
              {t('button.initial-stocktake')}
            </Button>
          )
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        // Central-server admins (EDIT_CENTRAL_DATA) can promote their current
        // layout to the shared install-wide default; everyone else gets no
        // action (the gate is the app's, so the generic DataTable stays
        // agnostic). Gate + action both come off the config controller, and the
        // gate is reactive: undefined until central + permitted both hold.
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
        // Pagination renders as an overlay INSIDE the table
        // (bottom-inline-end), not in a page footer band — consistent with the
        // stocktake detail view (kdd/table-state). State stays
        // page-owned/URL-backed.
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          onOffsetChange: offset => setQuery({ ...query(), offset }),
          // The chosen size is remembered for the next visit (D106).
          onPageSizeChange: first => {
            rememberPageSize(first);
            setQuery({ ...query(), first, offset: 0 });
          },
        }}
      />
      {/* Mounted only while open: the modal's resources (locations + the
          stock-line estimate) run on mount, so gating the mount keeps them from
          firing on the list screen before the user opens the create flow. */}
      <Show when={createOpen()}>
        <CreateStocktakeModal open onClose={() => setCreateOpen(false)} />
      </Show>
      <CreateInitialStocktakeAction
        open={initialOpen()}
        onClose={() => setInitialOpen(false)}
      />
    </Page>
  );
};

export default StocktakesList;
