import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Show,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useLocation, useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { isCentralServer } from '@/api/serverInfo';
import { localisedDate, t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { HStack } from '@/ui/layout/Stack/HStack';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  getCellDefinition,
  getFlagCell,
  getTextCell,
} from '@/ui/elements/table/tableHelpers';
import { StatusChip } from '@/ui/elements/feedback/StatusChip';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { remToPx } from '@/ui/utils/rem';
import { createTableConfig } from '@/api/createTableConfig';
import { useUrlQueryState } from '@/list/urlQueryState';
import { initialPageSize, rememberPageSize } from '@/list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import {
  AssetsList as AssetsListQuery,
  type AssetsListVariables,
} from '../equipment.generated';
import {
  AssetCategoriesList,
  AssetTypesList,
} from '../catalogue.generated';
import {
  CCE_CLASS_ID,
  isNonCatalogue,
  statusColour,
  statusLabelKey,
  type AssetRow,
} from '../equipment';
import {
  DEFAULT_STATE,
  SORTABLE_KEYS,
  buildExportFilter,
  buildListVariables,
  clearTypeOnCategoryChange,
  clearTypeOutsideCategory,
  type AssetSortKey,
  type AssetUserFilter,
  type EquipmentListState,
} from './listState';
import { equipmentFilters, type FilterOption } from './listFilters';
import { CreateAssetModal } from './CreateAssetModal';
import { EquipmentImportModal } from '../import/EquipmentImportModal';
import { CreateAssetAction } from './actions/CreateAssetAction';
import { ImportEquipmentAction } from './actions/ImportEquipmentAction';
import { ExportEquipmentAction } from './actions/ExportEquipmentAction';
import { DeleteAssetsAction } from './actions/DeleteAssetsAction';

// S1 — the equipment list (spec/cold-chain-equipment, ui-surface S1). The
// standard list screen: data + URL-backed filter/sort/pagination state from the
// vertical, UI from the library components, no page CSS.
//
// ONE screen, TWO destinations. Cold chain › Equipment pins the read to the
// active store; Manage › Equipment sends no store restriction at all and adds
// the Store column and filter on a central server (rules › the two
// destinations). The server scopes neither, so the pinning here is the
// frontend's whole obligation.

type SortKey = AssetSortKey;

const EquipmentList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout. The destination's gates — the vaccine module, then
  // ASSET_QUERY — are applied before this screen by the router
  // (spec/navigation); this vertical renders no permission state of its own.
  const params = useParams<{ storeId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Which destination is mounted, read off the path this tree was mounted at.
  // The two are the same route tree, so there is nothing else to read it from.
  const destination = () =>
    location.pathname.includes('/manage/') ? 'all-stores' : 'store';
  // The Store column and filter belong to the wider view on a central server
  // (OMS-REG-CCE-04.17). On any other site Manage › Equipment is just as unscoped, without
  // them — captured as-is (OMS-REG-CCE-04.18).
  const showStore = () => isCentralServer() && destination() === 'all-stores';

  const { query, setQuery } = useUrlQueryState<EquipmentListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });

  const [createOpen, setCreateOpen] = createSignal(false);
  const [importOpen, setImportOpen] = createSignal(false);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);

  const tableConfig = createTableConfig({
    tableId: 'equipment',
    defaultConfig: { compact: { viewMode: 'card' } },
  });

  // The category and type options the two enum filters offer. Categories are
  // the cold-chain class's; types narrow to the chosen category (OMS-REG-CCE-04.22).
  const [categoryData] = createResource(
    () => params.storeId,
    async () => {
      const result = await graphqlFetch(AssetCategoriesList, {
        filter: { classId: { equalTo: CCE_CLASS_ID } },
      });
      return result.kind === 'success'
        ? result.data.assetCategories.nodes
        : undefined;
    }
  );
  const categories = (): FilterOption[] => gated(categoryData) ?? [];

  const chosenCategory = () => query().filter.categoryId?.equalTo ?? '';
  const [typeData] = createResource(chosenCategory, async categoryId => {
    const result = await graphqlFetch(AssetTypesList, {
      filter: categoryId ? { categoryId: { equalTo: categoryId } } : undefined,
    });
    return result.kind === 'success' ? result.data.assetTypes.nodes : undefined;
  });
  const types = (): FilterOption[] => gated(typeData) ?? [];

  const variables = createMemo<AssetsListVariables>(() =>
    buildListVariables(query(), params.storeId, destination())
  );

  // Global resource-style fetch (kdd/state-management): codegen output through
  // the single never-throwing query method; failures surface globally. The
  // resource SOURCE is the SERIALISED variables (a stable string), so states
  // with identical query content don't refetch.
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        AssetsListQuery,
        JSON.parse(serialised) as AssetsListVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.assets;
    }
  );

  // The gated read, NOT `data()` and not `.latest` alone: `gated` yields a
  // value only once one has resolved, so nothing here can suspend — the table
  // mounts immediately with its own loading treatment instead of blanking the
  // page (kdd/solid-reactivity-pitfalls § no remounts).
  const page = () => gated(data);
  const rows = (): AssetRow[] => page()?.nodes ?? [];
  const totalCount = () => page()?.totalCount ?? 0;

  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  // A type left over from a category that no longer contains it is dropped
  // rather than left contradicting the category beside it (OMS-REG-CCE-04.23).
  /*
   * The filter definitions, built ONCE. FilterBar re-reads `props.filters`
   * whenever the filter value changes, and its `<For>` is keyed by object
   * identity — so handing it a freshly-built array per read remounts every
   * chip on every keystroke and the box being typed into loses focus
   * mid-word (kdd/solid-reactivity-pitfalls § no remounts on interaction).
   *
   * The memo reads only `showStore()`, so it re-runs at most once — when the
   * server-info signal resolves. The category and type option lists are passed
   * as ACCESSORS and read lazily inside each chip's `render`, so they populate
   * without rebuilding the array.
   */
  const filters = createMemo(() =>
    equipmentFilters({ categories, types, showStore })
  );

  const onFilterChange = (filter: AssetUserFilter) =>
    setQuery({
      ...query(),
      // Compared against the filter being REPLACED, not against the loaded
      // type list: that list is keyed on the category the user is leaving, so
      // it would vouch for a type the new category does not contain (OMS-REG-CCE-04.23).
      filter: clearTypeOnCategoryChange(query().filter, filter),
      offset: 0,
    });

  // The other half of OMS-REG-CCE-04.23, for a type that arrives in the URL rather than
  // through the chip above: once the category's OWN type list is ready, a type
  // it does not contain is dropped. Gated on `ready` because an empty list
  // mid-fetch means "not known yet", not "contains nothing".
  createEffect(() => {
    if (typeData.state !== 'ready') return;
    const loaded = typeData();
    if (!loaded || loaded.length === 0) return;
    const current = query().filter;
    const cleared = clearTypeOutsideCategory(current, loaded);
    if (cleared !== current) setQuery({ ...query(), filter: cleared, offset: 0 });
  });

  const openRow = (row: AssetRow) => navigate(row.id);

  const afterWrite = () => {
    setSelectedIds([]);
    void refetch();
  };

  // Columns are an accessor: their text comes from t(), which must be read in a
  // reactive scope to re-translate on a language switch.
  const columns = (): Column<AssetRow, SortKey>[] => [
    // Central server, Manage › Equipment only — which store holds the asset
    // (OMS-REG-CCE-04.17). Elsewhere the list is unscoped without it (OMS-REG-CCE-04.18).
    ...(showStore()
      ? [
          {
            c: { accessor: (row: AssetRow) => row.store?.storeName ?? '', id: 'store' },
            header: () => t('label.store'),
            ...getTextCell<AssetRow>(),
            size: remToPx(10),
          } as Column<AssetRow, SortKey>,
        ]
      : []),
    {
      c: { accessor: row => row.assetNumber ?? '', id: 'assetNumber' },
      sortKey: SORTABLE_KEYS[0],
      header: () => t('label.asset-number'),
      // The text (flex-sink) preset; card view: the asset number is the card's
      // title — it is the record's name everywhere.
      ...getCellDefinition('name', { headerPosition: 'primary' }),
    },
    {
      c: { accessor: row => row.assetCategory?.name ?? '', id: 'category' },
      header: () => t('label.category'),
      ...getTextCell(),
      size: remToPx(11),
    },
    {
      c: { accessor: row => row.assetType?.name ?? '', id: 'type' },
      header: () => t('label.type'),
      ...getTextCell(),
      size: remToPx(11),
    },
    {
      // The catalogue item's; blank for a non-catalogue asset, which has none.
      c: {
        accessor: row => row.catalogueItem?.manufacturer ?? '',
        id: 'manufacturer',
      },
      header: () => t('label.manufacturer'),
      ...getTextCell(),
      size: remToPx(9),
    },
    {
      c: { accessor: row => row.catalogueItem?.model ?? '', id: 'model' },
      header: () => t('label.model'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      // The latest status entry's status. Blank when the asset has none — its
      // functional status is a projection of the history, not a stored field
      // (OMS-REG-CCE-06.27/.28). The chip's WORD carries the meaning; the tone only
      // reinforces it (ui-standards/accessibility).
      c: { accessor: row => row.statusLog?.status ?? '', id: 'functionalStatus' },
      header: () => t('label.functional-status'),
      ...getTextCell(),
      size: remToPx(12),
      cell: info => {
        const status = info.row.original.statusLog?.status;
        if (!status) return '';
        return (
          <StatusChip
            label={t(statusLabelKey(status))}
            colour={statusColour(status)}
          />
        );
      },
    },
    {
      c: { accessor: row => row.serialNumber ?? '', id: 'serialNumber' },
      sortKey: SORTABLE_KEYS[1],
      header: () => t('label.serial'),
      ...getTextCell(),
      size: remToPx(10),
    },
    {
      // The flag, not a Yes/No word: a non-catalogue asset is one with no
      // catalogue item at all (OMS-REG-CCE-04.7).
      c: { accessor: isNonCatalogue, id: 'nonCatalogue' },
      header: () => t('label.non-catalogue'),
      ...getFlagCell<AssetRow>(t('label.non-catalogue')),
      size: remToPx(8),
    },
    {
      c: {
        accessor: row =>
          row.installationDate ? localisedDate(row.installationDate) : '',
        id: 'installationDate',
      },
      sortKey: SORTABLE_KEYS[2],
      header: () => t('label.installation-date'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      // "Replacement due" — the key's own text, not "Replacement date".
      c: {
        accessor: row =>
          row.replacementDate ? localisedDate(row.replacementDate) : '',
        id: 'replacementDate',
      },
      header: () => t('label.replacement-date'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { accessor: row => row.notes ?? '', id: 'notes' },
      header: () => t('label.notes'),
      ...getCellDefinition('comment'),
    },
  ];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('equipment') }]} />
          <HeaderButtons>
            <ImportEquipmentAction onOpen={() => setImportOpen(true)} />
            <CreateAssetAction onOpen={() => setCreateOpen(true)} />
            <ExportEquipmentAction
              storeId={params.storeId}
              // The store column belongs to a CENTRAL SERVER's file, whichever
              // destination produced it — `showStore()` is also false on the
              // cold-chain destination of a central server, which would drop
              // the column from a file that should carry it (rules › export).
              isCentral={isCentralServer()}
              // The screen's own filters, WITHOUT the destination's store
              // restriction: the file carries every store's equipment by
              // decision, narrowed only by the chips the user set
              // (rules › export).
              filter={buildExportFilter(query())}
              sort={variables().sort}
            />
          </HeaderButtons>
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
        filters={
          <HStack justify="between" wrap>
            <FilterBar
              filters={filters()}
              filter={query().filter}
              onChange={onFilterChange}
            />
          </HStack>
        }
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        emptyMessage={t('error.no-items-to-display')}
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        selectionActions={
          <DeleteAssetsAction
            storeId={params.storeId}
            selectedIds={selectedIds}
            onDeleted={afterWrite}
          />
        }
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
          onPageSizeChange: first => {
            rememberPageSize(first);
            setQuery({ ...query(), first, offset: 0 });
          },
        }}
      />
      {/* Mounted fresh per open (a <Show>), so each form seeds once. */}
      <Show when={createOpen()}>
        <CreateAssetModal
          storeId={params.storeId}
          showStorePicker={showStore()}
          onClose={() => setCreateOpen(false)}
          onCreated={id => {
            setCreateOpen(false);
            navigate(id);
          }}
        />
      </Show>
      <Show when={importOpen()}>
        <EquipmentImportModal
          storeId={params.storeId}
          isCentral={showStore()}
          onClose={() => setImportOpen(false)}
          onImported={afterWrite}
        />
      </Show>
    </Page>
  );
};

export default EquipmentList;
