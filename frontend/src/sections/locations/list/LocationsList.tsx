import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { round } from '@/intl/formatNumber';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '@/ui/elements/buttons/Button';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  getCellDefinition,
  getNumberCell,
  getTextCell,
} from '@/ui/elements/table/tableHelpers';
import { getBooleanCell } from '@/ui/elements/table/BooleanCell';
import { remToPx } from '@/ui/utils/rem';
import { createTableConfig } from '@/api/createTableConfig';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { CloseIcon, PlusCircleIcon } from '@/ui/icons';
import { useUrlQueryState } from '@/list/urlQueryState';
import { getVolumeUsedPercentage } from '@/domain/location';
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
// code exist (OMS-REG-INV-01.17; kdd/type-safety).
type SortKey = NonNullable<LocationsListVariables['sort']>[number]['key'];

// The fullness display (OMS-REG-INV-01.31): the proportion used ÷ capacity as a
// percentage, via the SAME undefined-safe helper the volume-aware picker uses
// (OMS-REG-INV-01.30 — one rule, domain/location/volume). No figure when
// capacity is 0, or when stock is present but volumeUsed is 0 (misleading
// "0%").
const fullnessLabel = (row: LocationRow): string => {
  const pct = getVolumeUsedPercentage(row);
  return pct === undefined
    ? ''
    : t('label.percent-used', { value: round(pct, 2) });
};

const LocationsList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout, which requires a resolved store before routing. The
  // query is store-scoped server-side by it (OMS-REG-INV-01.36).
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
  // path (listState.ts — OMS-REG-INV-01.36/OMS-REG-INV-01.19; stripEmpty drops
  // added-but-empty filter chips so the query carries only live filters).
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
  // the first page (OMS-REG-INV-01.17).
  const onSort = (key: SortKey, desc: boolean) => {
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  };

  const onFilterChange = (filter: LocationFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
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
      header: () => t('label.code'),
      // The code cell type: monospace + the short-code width preset (a bare
      // helper carries no width, so the column would mis-size and resize badly
      // — docs/CELL_TYPES.md § Width model).
      ...getCellDefinition('code'),
    },
    {
      c: { key: 'name' },
      sortKey: 'name',
      header: () => t('label.name'),
      // The text (flex-sink) preset; card view: the name is the card's title.
      ...getCellDefinition('name', { headerPosition: 'primary' }),
    },
    {
      // Location type, shown as name + temperature range (ui-surface S1
      // column 3) — a computed accessor over the nested node.
      c: {
        accessor: row => locationTypeLabel(row.locationType),
        id: 'locationType',
      },
      header: () => t('label.location-type'),
      // No CELL_DEF key for this column, so the cell type is the explicit
      // helper and the width is set here (the sanctioned route for an uncommon
      // column — docs/CELL_TYPES.md); "Cold room (2 to 8°C)" needs the room.
      ...getTextCell(),
      size: remToPx(14),
    },
    {
      c: { key: 'volume' },
      header: () => t('label.volume'),
      // Width set at the call site: no CELL_DEF key, and the header
      // "Volume (m³)" is the binding constraint, not the value.
      ...getNumberCell(),
      size: remToPx(7),
    },
    {
      // Fullness, read-only (OMS-REG-INV-01.30): used ÷ capacity, no figure
      // when capacity is 0 (OMS-REG-INV-01.31). Registry gap: the
      // proportion-BAR role has no built component (a ⛔ row in the registry),
      // so this renders the percentage text as the documented interim.
      c: { accessor: fullnessLabel, id: 'volumeUsed' },
      header: () => t('label.volume-used'),
      ...getNumberCell(),
      size: remToPx(7.5),
    },
    {
      // The boolean flag cell (registry "boolean cell in a table"): a centred
      // dot when on hold, blank otherwise, the marker carrying the state's
      // accessible name (D8) — never a silent glyph.
      c: { key: 'onHold' },
      header: () => t('label.on-hold'),
      ...getBooleanCell({ display: 'dot', label: t('label.on-hold') }),
      size: remToPx(4),
    },
  ];

  const crumbs = () => [{ label: t('locations') }];

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
                CSV or Excel (OMS-REG-INV-01.11). */}
            <ExportLocationsAction
              storeId={params.storeId}
              filter={() => query().filter}
            />
          </HeaderButtons>
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
            {/* Delete (confirm + per-location outcomes + in-use report). Two
                separate callbacks: the action re-queries mid-flow so deleted
                rows disappear, but clears the selection — which gates this
                footer, and with it the action's own dialog — only once the
                interaction ends (issue #374). */}
            <DeleteLocationsAction
              storeId={params.storeId}
              selectedRows={() =>
                rows().filter(row => selectedIds().includes(row.id))
              }
              refetchList={() => void refetch()}
              clearSelection={() => setSelectedIds([])}
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
        // toolbar: never the page header), state stays URL-backed here.
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
        onRowClick={openRow}
        emptyMessage={t('error.no-locations')}
        // The empty state offers New location (ui-surface S1 § layout).
        empty={
          <Button
            variant="ghost"
            data-testid="nothing-here-create-button"
            onClick={() => setEditor({ mode: 'create' })}
          >
            {t('button.create-a-new-one')}
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
        // (OMS-REG-INV-01.19). State stays page-owned/URL-backed.
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
