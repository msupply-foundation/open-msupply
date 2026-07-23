import { createMemo, createResource, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../api/createTableConfig';
import { useUrlQueryState } from '../../../list/urlQueryState';
import {
  MasterLists,
  type MasterListsResult,
  type MasterListsVariables,
} from '../masterLists.generated';
import { ExportMasterListsAction } from './ExportMasterListsAction';

// S1 — master-lists list (spec/master-lists). Read-only: no create/edit/delete,
// no selection, no filter controls at all (captured as-is). Rows navigate to the
// detail; the Export split button downloads the loaded page. Store scoping is
// the client sending existsForStoreId (storeId itself doesn't scope). Default
// sort name-ascending; only Name is sortable.

const DEFAULT_PAGE_SIZE = 20;
type MasterListRow = MasterListsResult['masterLists']['nodes'][number];
type SortKey = 'name';

type MasterListsListState = {
  sort?: MasterListsVariables['sort'];
  offset: number;
  first: number;
};
const DEFAULT_STATE: MasterListsListState = {
  sort: [{ key: 'name', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const MasterListsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } =
    useUrlQueryState<MasterListsListState>(DEFAULT_STATE);
  const tableConfig = createTableConfig({ tableId: 'master-lists' });

  const variables = createMemo<MasterListsVariables>(() => ({
    storeId: params.storeId,
    // Store scoping is a client filter, not the storeId arg (contract).
    filter: { existsForStoreId: { equalTo: params.storeId } },
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
  const rows = (): MasterListRow[] => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;
  const exportRows = () =>
    rows().map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
    }));

  const columns = (): Column<MasterListRow, SortKey>[] => [
    {
      c: { key: 'name' },
      sortKey: 'name',
      header: t('label.name'),
      meta: { wrapLines: 2 },
    },
    {
      c: { key: 'description' },
      header: t('label.description'),
      enableSorting: false,
      meta: { wrapLines: 2 },
    },
  ];

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s && s.key === 'name'
      ? { key: 'name', desc: s.desc ?? false }
      : undefined;
  };
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('master-lists') }]} />
          <HeaderButtons>
            <ExportMasterListsAction rows={exportRows} />
          </HeaderButtons>
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
          navigate(`/${params.storeId}/catalogue/master-lists/${row.id}`)
        }
        emptyMessage={t('error.no-master-lists')}
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

export default MasterListsList;
