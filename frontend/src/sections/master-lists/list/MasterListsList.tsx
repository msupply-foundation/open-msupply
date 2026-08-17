import { createMemo, createResource, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import {
  getCellDefinition,
  getNumberCell,
} from '@/ui/elements/table/tableHelpers';
import { remToPx } from '@/ui/utils/rem';
import { createTableConfig } from '@/api/createTableConfig';
import { useUrlQueryState } from '@/list/urlQueryState';
import { initialPageSize, rememberPageSize } from '@/list/pageSize';
import {
  MasterLists,
  type MasterListsResult,
  type MasterListsVariables,
} from '../masterLists.generated';
import { ExportMasterListsAction } from './ExportMasterListsAction';
import { masterListsFilters } from './listFilters';
import { itemsForMasterListHref } from './itemsListLink';
import {
  buildFilter,
  DEFAULT_STATE,
  type MasterListsFilter,
  type MasterListsListState,
} from './masterListsListState';

// S1 — the master-lists list (spec/master-lists), and the vertical's ONLY
// screen. Read-only: no create/edit/delete, no selection. Selecting a row opens
// the ITEMS list scoped to that master list (D80 — see itemsListLink.ts); the
// Export split button downloads the loaded page. Store scoping is the client
// sending existsForStoreId (storeId itself doesn't scope). Default sort
// name-ascending; only Name is sortable.

type MasterListRow = MasterListsResult['masterLists']['nodes'][number];
type SortKey = 'name';

const MasterListsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<MasterListsListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const tableConfig = createTableConfig({ tableId: 'master-lists' });

  const variables = createMemo<MasterListsVariables>(() => ({
    storeId: params.storeId,
    filter: buildFilter(query().filter, params.storeId),
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));

  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        MasterLists,
        JSON.parse(serialised) as MasterListsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.masterLists;
    }
  );
  // Read `.latest` (never suspends): the previous page during a refetch, and
  // undefined before the first load — so the table mounts immediately and shows
  // its own loading treatment rather than suspending the section into the
  // router's fallback-less boundary (kdd/solid-reactivity-pitfalls). This is
  // the screen's own first load with no live user state to lose.
  const rows = (): MasterListRow[] => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  // createMemo, NOT a plain function: TanStack memoizes on this array's
  // REFERENCE, so a fresh one per read invalidates four layers of its internal
  // memo chain (kdd/solid-reactivity-pitfalls §14). Re-derives only when the
  // language changes, which is the one thing the headers depend on.
  const columns = createMemo((): Column<MasterListRow, SortKey>[] => [
    {
      c: { key: 'name' },
      sortKey: 'name',
      header: () => t('label.name'),
      // The text (flex-sink) width preset; card view: the name is the title.
      // A bare cell helper carries no width, so the column would mis-size and
      // resize badly (docs/CELL_TYPES.md § Width model).
      ...getCellDefinition('name', {
        wrapLines: 2,
        headerPosition: 'primary',
      }),
    },
    {
      c: { key: 'description' },
      header: () => t('label.description'),
      enableSorting: false,
      ...getCellDefinition('description', { wrapLines: 2 }),
    },
    {
      // The list's item-membership count — the fact the retired detail screen
      // used to carry (D80). Nullable on the wire, and the number cell renders
      // an absent value BLANK, so a missing count never reads as a real zero.
      // NB this is the list's CENTRAL membership: it carries no store scoping,
      // while the items list a row opens applies the store's item visibility,
      // so the count can exceed the rows that view shows (spec/master-lists
      // rules › list population and scoping).
      c: { key: 'linesCount' },
      header: () => t('items'),
      enableSorting: false,
      // No CELL_DEF key for a membership count, so the cell type is the
      // explicit helper and the width is set here — the sanctioned route for an
      // uncommon column (docs/CELL_TYPES.md). The "Items" header is the binding
      // constraint, not the value: counts are a few digits.
      ...getNumberCell(),
      size: remToPx(6),
    },
  ]);

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s && s.key === 'name'
      ? { key: 'name', desc: s.desc ?? false }
      : undefined;
  };
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: MasterListsFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('master-lists') }]} />
          <HeaderButtons>
            <ExportMasterListsAction rows={rows} />
          </HeaderButtons>
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
        // Filters render in the TABLE's own toolbar, never the page header
        // (ui-standards § tables → toolbar, binding). State stays page-owned
        // and URL-backed. The name search is the one chip, seeded present by
        // DEFAULT_STATE (see listFilters.tsx).
        filters={
          <FilterBar
            filters={masterListsFilters()}
            filter={query().filter}
            onChange={onFilterChange}
          />
        }
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        // A row opens the items list scoped to this master list (D80) — the
        // richer view of its membership, replacing the retired detail screen.
        onRowClick={row =>
          navigate(itemsForMasterListHref(params.storeId, row.id))
        }
        emptyMessage={t('error.no-master-lists')}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        configIsDefault={tableConfig.isConfigDefault()}
        // Central-server admins (EDIT_CENTRAL_DATA) can promote their layout to
        // the install-wide default; everyone else gets no action.
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
    </Page>
  );
};

export default MasterListsList;
