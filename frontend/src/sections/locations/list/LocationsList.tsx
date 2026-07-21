import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { round } from '../../../intl/formatNumber';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import { getNumberCell } from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { CloseIcon, PlusCircleIcon } from '../../../ui/icons';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { getVolumeUsedPercentage } from '../../../domain/location';
import { LocationsList as LocationsListQuery } from './locations.generated';
import type { LocationsListVariables } from './locations.generated';
import { filterFields, type LocationFilter } from './listFilters';
import {
  DEFAULT_STATE,
  buildListVariables,
  type LocationsListState,
} from './listState';
import { locationTypeLabel } from './locationTypeLabel';
import type { LocationRow } from './locationEdit';
import { LocationEditModal, type EditorState } from './LocationEditModal';
import { DeleteLocationsAction, ExportLocationsAction } from './actions';

// The locations list view (spec/locations S1) — the standard list screen,
// composed exactly like the reference vertical (stocktakes): data + URL-backed
// filter/sort/pagination state from the vertical, UI from the library
// components, no page CSS. Locations has NO detail screen: a row click opens
// the create/edit modal (S2), and the only bulk action is Delete (S3).

// Sortable columns are typed to the generated sort-field union — only name and
// code exist (AC-L2; kdd/type-safety).
type SortKey = NonNullable<LocationsListVariables['sort']>[number]['key'];

// The fullness display (AC-V2): the proportion used ÷ capacity as a
// percentage, via the SAME undefined-safe helper the volume-aware picker uses
// (AC-V3 — one rule, domain/location/volume). No figure when capacity is 0, or
// when stock is present but volumeUsed is 0 (misleading "0%").
const fullnessLabel = (row: LocationRow): string => {
  const pct = getVolumeUsedPercentage(row);
  return pct === undefined
    ? ''
    : t('label.percent-used', { value: round(pct, 2) });
};

const LocationsList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout, which requires a resolved store before routing. The
  // query is store-scoped server-side by it (AC-L1).
  const params = useParams<{ storeId: string }>();
  const { query, setQuery } =
    useUrlQueryState<LocationsListState>(DEFAULT_STATE);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // The S2 modal's opening state — null closed, else create or the clicked
  // row. Mounted fresh per open (<Show> below), so the form seeds once.
  const [editor, setEditor] = createSignal<EditorState | null>(null);

  // Column config (order/sizing/pinning/visibility), resolved default →
  // global → user and by breakpoint band (kdd/table-state). The spec hides no
  // column by default on narrow viewports (ui-surface S1 § columns), so only
  // the card-view default applies on COMPACT.
  const tableConfig = createTableConfig({
    tableId: 'locations',
    defaultConfig: {
      compact: {
        viewMode: 'card',
      },
    },
  });

  // GraphQL variables, derived straight from URL state + the store in the
  // path (listState.ts — AC-L1/AC-L4; stripEmpty drops added-but-empty filter
  // chips so the query carries only live filters).
  const variables = createMemo<LocationsListVariables>(() =>
    buildListVariables(query(), params.storeId)
  );

  // Global resource-style fetch (kdd/state-management): codegen output through
  // the single never-throwing query method; failures surface globally. The
  // resource SOURCE is the SERIALISED variables (a stable string), so states
  // with identical query content don't refetch (kdd/solid-reactivity-pitfalls).
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        LocationsListQuery,
        JSON.parse(serialised) as LocationsListVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.locations;
    }
  );

  // Read `data.latest`, NOT `data()`: `.latest` never suspends, so the table
  // mounts immediately with its own loading treatment instead of blanking the
  // page into the router's fallback-less <Suspense> (kdd/solid-reactivity-
  // pitfalls § no remounts, rule 1).
  const rows = () => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Clicking a sortable header: the DataTable computes the next direction and
  // hands back key + desc; record it as the GraphQL sort array, resetting to
  // the first page (AC-L2).
  const onSort = (key: SortKey, desc: boolean) => {
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  };

  const onFilterChange = (filter: LocationFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  // Delete lives in DeleteLocationsAction (confirm + per-location outcomes +
  // in-use report). It calls back mid-flow so the deleted rows disappear and
  // the selection clears even when some members were blocked (AC-D3).
  const onDeleted = () => {
    setSelectedIds([]);
    void refetch();
  };

  // A save landed in the modal (create or edit): re-query so the list shows it
  // (kdd/state-management — refresh by direct call).
  const onSaved = () => void refetch();

  // Row click opens the edit modal — locations has no detail screen
  // (ui-surface S1 § layout).
  const openRow = (row: LocationRow) =>
    setEditor({ mode: 'edit', location: row });

  // Columns and crumbs are accessors: their text comes from t(), which must be
  // read in a reactive scope to re-translate on a language switch.
  const columns = (): Column<LocationRow, SortKey>[] => [
    {
      c: { key: 'code' },
      sortKey: 'code',
      header: t('label.code'),
    },
    {
      c: { key: 'name' },
      sortKey: 'name',
      header: t('label.name'),
      // Card view: the name is the card's title.
      meta: { card: { region: 'primary' } },
    },
    {
      // Location type, shown as name + temperature range (ui-surface S1
      // column 3) — a computed accessor over the nested node.
      c: {
        accessor: row => locationTypeLabel(row.locationType),
        id: 'locationType',
      },
      header: t('label.location-type'),
    },
    {
      c: { key: 'volume' },
      header: t('label.volume'),
      ...getNumberCell(),
    },
    {
      // Fullness, read-only (AC-V1): used ÷ capacity, no figure when capacity
      // is 0 (AC-V2). Registry gap: the proportion-BAR treatment has no built
      // component yet, so this renders the percentage text (see BUILD_REPORT).
      c: { accessor: fullnessLabel, id: 'volumeUsed' },
      header: t('label.volume-used'),
      ...getNumberCell(),
    },
    {
      // Presence marker carrying the state's accessible name — real text when
      // on hold, blank otherwise (D8; the registry's dedicated boolean-cell
      // component is not built, so the marker is the translated label itself).
      c: {
        accessor: row => (row.onHold ? t('label.on-hold') : ''),
        id: 'onHold',
      },
      header: t('label.on-hold'),
    },
  ];

  const crumbs = () => [{ label: t('inventory') }, { label: t('locations') }];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            <Button
              icon={<PlusCircleIcon />}
              data-testid="new-location-button"
              onClick={() => setEditor({ mode: 'create' })}
            >
              {t('label.new-location')}
            </Button>
            {/* Export the locations list (all pages of the current filter) as
                CSV or Excel (AC-L5). */}
            <ExportLocationsAction
              storeId={params.storeId}
              filter={() => query().filter}
            />
          </HeaderButtons>
          <Toolbar>
            <FilterBar
              filters={filterFields()}
              filter={query().filter}
              onChange={onFilterChange}
            />
          </Toolbar>
        </Header>
      }
      contentFooter={
        // The bulk-action bar, only on an active selection: Delete is the one
        // bulk action (ui-surface S1 § layout), plus clear-selection.
        <Show when={selectedIds().length > 0}>
          <ContentFooter testId="actions-footer">
            <strong data-testid="selected-rows-count">
              {selectedIds().length} {t('label.selected')}
            </strong>
            <DeleteLocationsAction
              storeId={params.storeId}
              selectedRows={() =>
                rows().filter(row => selectedIds().includes(row.id))
              }
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
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        emptyMessage={t('error.no-locations')}
        // The empty state offers New location (ui-surface S1 § layout).
        empty={
          <Button
            icon={<PlusCircleIcon />}
            data-testid="nothing-here-create-button"
            onClick={() => setEditor({ mode: 'create' })}
          >
            {t('label.new-location')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
        // Server-side pagination; the count reflects the full filtered set
        // (AC-L4). State stays page-owned/URL-backed.
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          onOffsetChange: offset => setQuery({ ...query(), offset }),
          onPageSizeChange: first => setQuery({ ...query(), first, offset: 0 }),
        }}
      />
      <Show when={editor()}>
        {opened => (
          <LocationEditModal
            storeId={params.storeId}
            editor={opened()}
            rows={rows}
            onClose={() => setEditor(null)}
            onSaved={onSaved}
          />
        )}
      </Show>
    </Page>
  );
};

export default LocationsList;
