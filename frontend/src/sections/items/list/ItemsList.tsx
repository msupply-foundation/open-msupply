import { createMemo, createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { createTableConfig } from '../../../api/createTableConfig';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { Items, type ItemsVariables } from './items.generated';
import { ItemPreferences } from '../itemPreferences.generated';
import { ItemMasterLists } from './itemMasterLists.generated';
import { buildItemFilter, type ItemsListFilter } from './itemFilter';
import { buildItemsFilters } from './listFilters';
import { fixedColumns, type ItemRow, type SortKey } from './itemColumns';
import {
  customFieldDefinitions,
  customFieldColumns,
  customFieldFilters,
  buildCustomFieldDynamicFilter,
  type CustomFieldFilterState,
} from '../../../domain/customFields';

// The items catalogue list (spec/items S1). Read-only: no create/edit/delete,
// no row selection, no export — the catalogue is central-owned. Rows only
// navigate to the item detail (S2). Composed from the shared list scaffold
// (Page / Header / Toolbar / FilterBar / DataTable) so the page owns no CSS.
// The UI filter vocabulary (lens etc.) maps to the wire filter via
// buildItemFilter (see itemFilter.ts).

const DEFAULT_PAGE_SIZE = 20;

type ItemsListState = {
  filter: ItemsListFilter;
  /** Typed per-custom-field filter values → the dynamicFilter AST at query
   * time. */
  cf?: CustomFieldFilterState;
  sort?: ItemsVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: name ascending (spec/items S1 › Columns). Only Code/Name are
// sortable; the wire honours only the last sort entry, so send a single one.
//
// `codeOrName: null` SEEDS the search chip: FilterBar shows a chip iff its key
// is present on the filter, and null is its "added but empty" marker — so the
// code-or-name search is there on arrival with no menu step, which is how
// ui-surface's "always-present" search is met using only sanctioned components
// (see listFilters.tsx). buildItemFilter ignores a null, so the seed never
// perturbs the query.
const DEFAULT_STATE: ItemsListState = {
  filter: { codeOrName: null },
  sort: [{ key: 'name', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const ItemsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<ItemsListState>(DEFAULT_STATE);

  const tableConfig = createTableConfig({ tableId: 'items' });

  // Custom-field definitions for the item scope — shared scope-keyed cache,
  // read non-suspending. Empty ⇒ no custom-field columns/filters.
  const cfReader = customFieldDefinitions('item');
  const cfDefs = () => cfReader.noSuspense();
  const cfFilters = createMemo(() => customFieldFilters(cfDefs()));
  const onCustomFieldChange = (cf: CustomFieldFilterState) =>
    setQuery({ ...query(), cf, offset: 0 });

  const variables = createMemo<ItemsVariables>(() => ({
    storeId: params.storeId,
    filter: {
      ...buildItemFilter(query().filter),
      // Custom-field filters become the dynamicFilter AST (undefined = no-op).
      dynamicFilter: buildCustomFieldDynamicFilter(query().cf),
    },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));

  // Resource keyed on the SERIALISED variables (kdd/state-management): equal
  // content never refetches, reading `.latest` never suspends.
  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        Items,
        JSON.parse(serialised) as ItemsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.items;
    }
  );
  // Read WITHOUT suspending, gated on `.state`: `.latest` alone suspends on the
  // first pending read, which on this screen's initial load would collapse the
  // list into the router's fallback-less boundary (a blank page) instead of
  // letting the DataTable mount and show its own loading treatment
  // (kdd/solid-reactivity-pitfalls; issues #160/#196).
  const page = () =>
    data.state === 'ready' || data.state === 'refreshing'
      ? data.latest
      : undefined;
  const rows = (): ItemRow[] => page()?.nodes ?? [];
  const totalCount = () => page()?.totalCount ?? 0;

  // Preferences gate the doses display + the at-risk filter (spec/items).
  const [prefsData] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(ItemPreferences, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.preferences;
    }
  );
  // Same non-suspending `.state` gate as the list read above.
  const prefs = () =>
    prefsData.state === 'ready' || prefsData.state === 'refreshing'
      ? prefsData.latest
      : undefined;
  const showDoses = () => prefs()?.manageVaccinesInDoses ?? false;
  // At-risk filter offered only when the recent-consumption window is set.
  const showAtRisk = () =>
    (prefs()
      ?.numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts ??
      0) > 0;

  // The store's master lists — options for the master-list filter (offered only
  // when the store has at least one).
  const [masterListsData] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(ItemMasterLists, { storeId });
      if (result.kind !== 'success') return [];
      return result.data.masterLists.nodes;
    }
  );
  const masterListOptions = () =>
    masterListsData.state === 'ready' || masterListsData.state === 'refreshing'
      ? (masterListsData.latest ?? [])
      : [];

  // createMemo, NOT a plain function: TanStack memoizes on this array's
  // REFERENCE, so a fresh one per read invalidates four layers of its internal
  // memo chain (kdd/solid-reactivity-pitfalls §14). Re-derives when the doses
  // preference, the custom-field definitions or the language change.
  const columns = createMemo((): Column<ItemRow, SortKey>[] => [
    ...fixedColumns(showDoses),
    ...customFieldColumns<ItemRow, SortKey>(cfDefs(), row => row.customFields),
  ]);

  const filters = createMemo(() =>
    buildItemsFilters(masterListOptions, showAtRisk)
  );

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    // Only name/code are real sort keys on this list.
    return s && (s.key === 'name' || s.key === 'code')
      ? { key: s.key, desc: s.desc ?? false }
      : undefined;
  };

  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (filter: ItemsListFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('items') }]} />
          {/* No page actions and no header fields — the catalogue is read-only
              (ui-surface S1 › Layout), and the filters belong to the table's own
              toolbar (below), never the app bar. So the breadcrumb is the whole
              header. */}
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
        // Filters render in the TABLE's toolbar, never the page header
        // (ui-standards § tables → toolbar — binding for every table, list
        // or detail, and it overrides where a vertical spec puts them).
        // State stays page-owned and URL-backed. EVERY filter is a chip on
        // this one bar — including the code-or-name search, seeded present by
        // DEFAULT_STATE (see listFilters.tsx); there is no separate search
        // field beside it.
        filters={
          <FilterBar
            filters={filters()}
            filter={query().filter}
            onChange={onFilterChange}
            extra={{
              filters: cfFilters(),
              filter: query().cf ?? {},
              onChange: onCustomFieldChange,
            }}
          />
        }
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={row =>
          navigate(`/${params.storeId}/catalogue/items/${row.id}`)
        }
        emptyMessage={t('error.no-items-to-display')}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          onOffsetChange: offset => setQuery({ ...query(), offset }),
          onPageSizeChange: first => setQuery({ ...query(), first, offset: 0 }),
        }}
      />
    </Page>
  );
};

export default ItemsList;
