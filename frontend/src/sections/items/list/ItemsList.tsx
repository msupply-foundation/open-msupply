import { createMemo, createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  FilterBar,
  FilterTextInput,
} from '../../../ui/elements/selectors/FilterBar';
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
  /** Typed per-custom-field filter values → the dynamicFilter AST at query time. */
  cf?: CustomFieldFilterState;
  sort?: ItemsVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: name ascending (spec/items S1 › Columns). Only Code/Name are
// sortable; the wire honours only the last sort entry, so send a single one.
const DEFAULT_STATE: ItemsListState = {
  filter: {},
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
  const rows = (): ItemRow[] => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  // Preferences gate the doses display + the at-risk filter (spec/items).
  const [prefsData] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(ItemPreferences, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.preferences;
    }
  );
  const showDoses = () => prefsData.latest?.manageVaccinesInDoses ?? false;
  // At-risk filter offered only when the recent-consumption window is set.
  const showAtRisk = () =>
    (prefsData.latest
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
  const masterListOptions = () => masterListsData.latest ?? [];

  const columns = (): Column<ItemRow, SortKey>[] => [
    ...fixedColumns(showDoses),
    ...customFieldColumns<ItemRow, SortKey>(cfDefs(), row => row.customFields),
  ];

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
          <Toolbar>
            {/* Always-present code-or-name search (spec/items S1 › Filters). */}
            <FilterTextInput
              label={t('label.code-or-name')}
              placeholder={t('placeholder.enter-an-item-code-or-name')}
              testId="items-search"
              value={query().filter.codeOrName ?? ''}
              onInput={value =>
                onFilterChange({ ...query().filter, codeOrName: value || null })
              }
            />
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
          </Toolbar>
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
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
