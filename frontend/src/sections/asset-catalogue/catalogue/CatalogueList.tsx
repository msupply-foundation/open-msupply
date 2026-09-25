import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t, tPlural } from '@/intl';
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
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { createTableConfig } from '@/api/createTableConfig';
import { CloseIcon, EditIcon, ImportIcon } from '@/ui/icons';
import { useUrlQueryState } from '@/list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '@/list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { stripEmpty } from '@/typeHelpers';
import {
  AssetCatalogueItems,
  AssetCategories,
  AssetTypes,
  DeleteAssetCatalogueItem,
  type AssetCatalogueItemsVariables,
} from './catalogue.generated';
import { catalogueFilters, type CatalogueFilter } from './catalogueFilters';
import type { CatalogueRow } from './catalogueToCsv';
import { ExportCatalogueAction } from './actions/ExportCatalogueAction';
import { ImportCatalogueModal } from '../import/ImportCatalogueModal';
import { DeleteSelectedAction } from '../DeleteSelectedAction';
import { CATALOGUE_WRITE, guardWrite, writesOffered } from '../access';
import { outcomeOf } from '../refusals';

// Catalogue › Assets — the catalogue list (spec/asset-catalogue S1), on the
// standard list screen (ui-standards/list-views): URL-backed filter / sort /
// page, server-paginated. Its deviations from the standard: no New action
// (items are added only by import), no row click (an item has no detail), and
// every write — Import, selection + Delete, Manage asset log reasons — offered
// on the central server only.

type SortKey = NonNullable<AssetCatalogueItemsVariables['sort']>[number]['key'];

type CatalogueListState = {
  filter: CatalogueFilter;
  sort?: AssetCatalogueItemsVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: code ascending (rules § reading the catalogue).
const DEFAULT_STATE: CatalogueListState = {
  filter: {},
  sort: [{ key: 'code', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const CatalogueList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<CatalogueListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [importOpen, setImportOpen] = createSignal(false);

  const tableConfig = createTableConfig({
    tableId: 'asset-catalogue',
    defaultConfig: { compact: { viewMode: 'card' } },
  });

  // One request per distinct query (the source is the serialised variables,
  // so an empty chip does not refetch — kdd/solid-reactivity-pitfalls).
  const variables = createMemo<AssetCatalogueItemsVariables>(() => ({
    filter: stripEmpty(query().filter),
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        AssetCatalogueItems,
        JSON.parse(serialised) as AssetCatalogueItemsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.assetCatalogueItems;
    }
  );
  // Non-suspending reads (kdd/solid-reactivity-pitfalls › no remounts), so the
  // table mounts at once and shows its own loading treatment.
  const rows = () => gated(data)?.nodes ?? [];
  const totalCount = () => gated(data)?.totalCount ?? 0;

  // The filter options: fixed reference data, read once.
  const [categories] = createResource(async () => {
    const result = await graphqlFetch(AssetCategories, {});
    return result.kind === 'success' ? result.data.assetCategories.nodes : [];
  });
  const [types] = createResource(async () => {
    const result = await graphqlFetch(AssetTypes, {});
    return result.kind === 'success' ? result.data.assetTypes.nodes : [];
  });
  const filters = catalogueFilters({
    categories: () => gated(categories) ?? [],
    types: () => gated(types) ?? [],
  });

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
  // Exactly one sort element: of several, the server applies the LAST
  // (contract § reading the catalogue).
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  const onFilterChange = (filter: CatalogueFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    setSelectedIds([]);
  };

  const openImport = () => {
    if (guardWrite(CATALOGUE_WRITE)) setImportOpen(true);
  };

  const selectedRows = () =>
    rows().filter(row => selectedIds().includes(row.id));

  const deleteOne = async (row: CatalogueRow) =>
    outcomeOf(
      await graphqlFetch(
        DeleteAssetCatalogueItem,
        { id: row.id },
        { returnGraphqlErrors: true }
      )
    );

  const columns = (): Column<CatalogueRow, SortKey>[] => [
    {
      c: { key: 'subCatalogue' },
      sortKey: 'catalogue',
      header: () => t('label.sub-catalogue'),
    },
    {
      c: { key: 'code' },
      sortKey: 'code',
      header: () => t('label.code'),
      meta: { headerPosition: 'primary' },
    },
    {
      c: { accessor: row => row.assetType?.name ?? '', id: 'typeId' },
      header: () => t('label.type'),
    },
    {
      c: { accessor: row => row.manufacturer ?? '', id: 'manufacturer' },
      sortKey: 'manufacturer',
      header: () => t('label.manufacturer'),
    },
    {
      c: { key: 'model' },
      sortKey: 'model',
      header: () => t('label.model'),
    },
    {
      c: { accessor: row => row.assetClass?.name ?? '', id: 'classId' },
      header: () => t('label.class'),
    },
    {
      c: { accessor: row => row.assetCategory?.name ?? '', id: 'categoryId' },
      header: () => t('label.category'),
    },
  ];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('assets') }]} />
          <HeaderButtons>
            <Show when={writesOffered()}>
              <Button
                icon={<ImportIcon />}
                data-testid="import-catalogue-button"
                onClick={openImport}
              >
                {t('button.import')}
              </Button>
            </Show>
            <ExportCatalogueAction
              storeId={params.storeId}
              filter={() => query().filter}
              sort={() => query().sort}
            />
            <Show when={writesOffered()}>
              <Button
                variant="secondary"
                icon={<EditIcon />}
                data-testid="manage-log-reasons-button"
                onClick={() =>
                  navigate(`/${params.storeId}/catalogue/assets/log-reasons`)
                }
              >
                {t('button.manage-asset-log-reasons')}
              </Button>
            </Show>
          </HeaderButtons>
        </Header>
      }
      contentFooter={
        <Show when={selectedIds().length > 0}>
          <ContentFooter testId="actions-footer">
            <strong data-testid="selected-rows-count">
              {selectedIds().length} {t('label.selected')}
            </strong>
            <DeleteSelectedAction
              selected={selectedRows}
              guard={() => guardWrite(CATALOGUE_WRITE)}
              deleteOne={deleteOne}
              nameOf={row => row.code}
              confirmMessage={count =>
                tPlural('messages.confirm-delete-assets', count)
              }
              deletedMessage={count =>
                tPlural('messages.deleted-assets', count)
              }
              refusedMessage={count =>
                tPlural('messages.error-deleting-assets', count)
              }
              onChanged={() => void refetch()}
              onDone={() => setSelectedIds([])}
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
        rowKey={row => row.id}
        filters={
          <FilterBar
            filters={filters}
            filter={query().filter}
            onChange={onFilterChange}
          />
        }
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        emptyMessage={t('error.no-assets')}
        empty={
          <Show when={writesOffered()}>
            <Button
              variant="ghost"
              data-testid="nothing-here-create-button"
              onClick={openImport}
            >
              {t('button.create-a-new-one')}
            </Button>
          </Show>
        }
        enableSelection={writesOffered()}
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
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
      {/* Mounted only while open, so its reads run when the import opens. */}
      <Show when={importOpen()}>
        <ImportCatalogueModal
          storeId={params.storeId}
          onClose={() => setImportOpen(false)}
          onImported={() => void refetch()}
        />
      </Show>
    </Page>
  );
};

export default CatalogueList;
