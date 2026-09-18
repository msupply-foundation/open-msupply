import { createMemo, createResource, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb, type Crumb } from '../../../ui/layout/Header/Breadcrumb';
import { HStack } from '../../../ui/layout/Stack/HStack';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { getCellDefinition } from '../../../ui/elements/table/tableHelpers';
import { HomeIcon } from '../../../ui/icons';
import { createTableConfig } from '../../../api/createTableConfig';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { initialPageSize, rememberPageSize } from '../../../list/pageSize';
import { Names } from '../names.generated';
import type { NamesVariables } from '../names.generated';
import {
  buildVariables,
  isStoreName,
  DEFAULT_STATE,
  PAGE_SIZE_OPTIONS,
  type NameRow,
  type NamesFilter,
  type NamesListState,
  type Role,
  type SortKey,
} from './namesListLogic';
import {
  buildCustomFieldDynamicFilter,
  customFieldDefinitions,
  customFieldColumns,
} from '../../../domain/customFields';
import {
  searchFilters,
  customFieldFilters,
  type CustomFieldFilterState,
} from './listFilters';

// The shared Customer/Supplier list screen (spec/names S1/S2). The standard
// list screen (spec/ui-standards/list-views) minus every write affordance: no
// selection, no page actions, no bulk footer — read-only (AC-N16). The two
// lists are one component differing only by `role` (relationship filter +
// custom-field scope) and how a row opens (customer → modal in place; supplier
// → navigate), which the caller supplies via onRowClick. Data access uses the
// fixed shape (never-throwing graphqlFetch + resource signals, .latest
// non-suspending reads — kdd/state-management, kdd/solid-reactivity-pitfalls).

export interface NamesListProps {
  role: Role;
  /** Custom-field scope name for the consumed customFields read. */
  scope: 'customer' | 'supplier';
  /** App-bar breadcrumb trail (accessor — re-translates on locale switch). */
  crumbs: () => Crumb[];
  /** Open a row's detail (customer modal / supplier navigation). */
  onRowClick: (row: NameRow) => void;
  /** Stable table id for per-user column config. */
  tableId: string;
}

export const NamesList: Component<NamesListProps> = props => {
  // storeId is guaranteed present: the section renders only inside
  // StoreGuardLayout, which requires a resolved, authorised store before
  // routing (AC-N17 — the list cannot be shown without an active store).
  const params = useParams<{ storeId: string }>();
  const { query, setQuery } = useUrlQueryState<NamesListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });

  const tableConfig = createTableConfig({ tableId: props.tableId });

  // Custom-field definitions for the role — the shared scope-keyed cache
  // (domain/customFields), loaded once per scope and read NON-SUSPENDING so a
  // pending fetch never tears down the open list
  // (kdd/solid-reactivity-pitfalls). Empty when the deployment configures none
  // (AC-N18/N19: none configured ⇒ no columns and no custom-field filters).
  const cfReader = customFieldDefinitions(props.scope);
  const cfDefs = () => cfReader.noSuspense();

  // The custom-field filter definitions, memoised so the Filter object
  // identities are STABLE across filter edits: FilterBar's <For> keys chips by
  // reference, so rebuilding this array on every filter change
  // (customFieldFilters returns fresh objects) would remount the chips and drop
  // input focus. The memo only re-runs when the underlying defs change (they
  // load once per store/scope), never on an interaction
  // (kdd/solid-reactivity-pitfalls: no remounts on interaction).
  const cfFilters = createMemo(() => customFieldFilters(cfDefs()));

  // GraphQL variables from URL state + the store in the path. The custom-field
  // filter values (cf) become the dynamicFilter AST; role + type restriction
  // are applied inside buildVariables. Serialised (below) as the resource key.
  const variables = createMemo<NamesVariables>(() =>
    buildVariables({
      storeId: params.storeId,
      role: props.role,
      state: query(),
      dynamicFilter: buildCustomFieldDynamicFilter(query().cf, cfDefs()),
    })
  );

  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        Names,
        JSON.parse(serialised) as NamesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.names;
    }
  );

  // Read `.latest` (never suspends): returns the previous page during a refetch
  // and undefined before first load, so the table mounts immediately and shows
  // its own loading treatment rather than suspending the section into a blank
  // page (kdd/solid-reactivity-pitfalls).
  const rows = () => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onSearchChange = (filter: NamesFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  const onCustomFieldChange = (cf: CustomFieldFilterState) =>
    setQuery({ ...query(), cf, offset: 0 });

  // Columns: code (with the store indicator), name, then one per configured
  // custom field. Accessors so headers re-translate on locale switch.
  const columns = (): Column<NameRow, SortKey>[] => [
    {
      c: { key: 'code' },
      sortKey: 'code',
      header: () => t('name.column.code'),
      // The code cell type's width preset (headerPosition:'primary' makes it
      // the card's title); its `cell` is overridden below, so the preset is
      // spread FIRST — the documented override order (docs/CELL_TYPES.md).
      ...getCellDefinition('code', { headerPosition: 'primary' }),
      // The code carries a store indicator when the name is itself a store
      // (AC-N8). Icon-only marker — accessible name via aria-label.
      cell: info => {
        const row = info.row.original;
        return (
          <HStack gap="sm">
            {row.code}
            <Show when={isStoreName(row)}>
              <HomeIcon aria-label={t('name.store-indicator')} />
            </Show>
          </HStack>
        );
      },
    },
    {
      c: { key: 'name' },
      sortKey: 'name',
      header: () => t('name.column.name'),
      // The text sink column's width preset, keeping the 2-line wrap.
      ...getCellDefinition('name', { wrapLines: 2 }),
    },
    // Configured custom-field columns — not sortable; value chosen by kind
    // (option → resolved name, number/date → localised) (AC-N18).
    ...customFieldColumns<NameRow, SortKey>(cfDefs(), row => row.customFields),
  ];

  return (
    <Page
      fillBody
      header={
        // Breadcrumb only: no page actions (read-only vertical, AC-N16) and no
        // toolbar — the filter bar belongs to the table (below).
        <Header>
          <Breadcrumb crumbs={props.crumbs()} />
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={r => r.id}
        // Filters live in the table's OWN toolbar, never the page header
        // (ui-standards § tables → filtering, binding); the state stays
        // URL-backed here. One filter menu: name/code search + the role's
        // configured custom-field filters (AC-N13/N19), the latter as the bar's
        // second group so they share the one menu + chip row.
        filters={
          <FilterBar
            filters={searchFilters()}
            filter={query().filter}
            onChange={onSearchChange}
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
        onRowClick={props.onRowClick}
        emptyMessage={t('name.empty')}
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
        // Pagination renders in the table's own footer bar (kdd/table-state),
        // not a page footer band; there is no selection/bulk bar at all
        // (read-only, AC-N16). Page-size options 10/20/50/100, default 20
        // (AC-N12) — Pagination's own default omits 10, so pass the full set.
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          pageSizes: [...PAGE_SIZE_OPTIONS],
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
