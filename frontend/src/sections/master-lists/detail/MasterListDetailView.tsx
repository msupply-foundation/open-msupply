import {
  createMemo,
  createResource,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../api/createTableConfig';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { MasterLists } from '../masterLists.generated';
import {
  MasterListLines,
  type MasterListLinesResult,
  type MasterListLinesVariables,
} from '../masterListLines.generated';

// S2 — master-list detail (spec/master-lists). Read-only: the list's header
// (description field, present only when non-empty, OMS-REG-CAT-07.11/.31) +
// its item-membership lines. The header re-reads the masterLists query
// filtered by id (no store scoping, so a non-joined list is reachable by deep
// link — .23); exactly-one-node = found, else the not-found blocking alert
// (.22). Lines are selected by the masterListId ARGUMENT (never a filter
// field — contract trap), sorted by item name.

const DEFAULT_PAGE_SIZE = 20;
type LineRow = MasterListLinesResult['masterListLines']['nodes'][number];
type LineSortKey = 'name';

type LinesState = {
  sort?: MasterListLinesVariables['sort'];
  offset: number;
  first: number;
};
const DEFAULT_STATE: LinesState = {
  sort: [{ key: 'name', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const MasterListDetailView: Component = () => {
  const params = useParams<{ storeId: string; masterListId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<LinesState>(DEFAULT_STATE);
  const tableConfig = createTableConfig({ tableId: 'master-list-lines' });

  const backToList = () =>
    navigate(`/${params.storeId}/catalogue/master-lists`, { replace: true });

  // Header — the masterLists query filtered by id (no existsForStoreId).
  const [header] = createResource(
    () => ({ storeId: params.storeId, id: params.masterListId }),
    async v => {
      const result = await graphqlFetch(MasterLists, {
        storeId: v.storeId,
        filter: { id: { equalTo: v.id } },
      });
      if (result.kind !== 'success') return undefined;
      const nodes = result.data.masterLists.nodes;
      // exactly one node = found; anything else = not found (OMS-REG-CAT-07.22)
      return nodes.length === 1 ? nodes[0] : undefined;
    }
  );
  const list = () => header.latest;

  const linesVars = createMemo<MasterListLinesVariables>(() => ({
    storeId: params.storeId,
    masterListId: params.masterListId,
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));
  const [linesData] = createResource(
    () => JSON.stringify(linesVars()),
    async serialised => {
      const result = await graphqlFetch(
        MasterListLines,
        JSON.parse(serialised) as MasterListLinesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.masterListLines;
    }
  );
  const lineRows = (): LineRow[] => linesData.latest?.nodes ?? [];
  const linesTotal = () => linesData.latest?.totalCount ?? 0;

  const columns = (): Column<LineRow, LineSortKey>[] => [
    {
      c: { accessor: row => row.item.code, id: 'code' },
      header: t('label.code'),
      enableSorting: false,
    },
    {
      c: { accessor: row => row.item.name, id: 'name' },
      sortKey: 'name',
      header: t('label.name'),
      meta: { wrapLines: 2 },
    },
    {
      c: { accessor: row => row.item.unitName ?? '', id: 'unit' },
      header: t('label.unit'),
      enableSorting: false,
    },
  ];

  const currentSort = (): SortState<LineSortKey> | undefined => {
    const s = query().sort?.[0];
    return s && s.key === 'name'
      ? { key: 'name', desc: s.desc ?? false }
      : undefined;
  };
  const onSort = (key: LineSortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  return (
    <Suspense fallback={<Spinner center />}>
      <Show
        when={list()}
        fallback={
          <Show when={!header.loading} fallback={<Spinner center />}>
            <ConfirmDialog
              open
              title={t('error.master-list-not-found')}
              message={t('messages.click-to-return-to-master-lists')}
              confirmLabel={t('button.ok')}
              onConfirm={backToList}
              onClose={backToList}
            />
          </Show>
        }
      >
        {ml => (
          <Page
            fillBody
            header={
              <Header>
                <Breadcrumb
                  crumbs={[
                    {
                      label: t('master-lists'),
                      to: `/${params.storeId}/catalogue/master-lists`,
                    },
                    { label: ml().name },
                  ]}
                />
                {/* Description field — present only when non-empty (OMS-REG-CAT-07.11/.31). */}
                <Show when={ml().description}>
                  <Toolbar>
                    <TextField
                      label={t('heading.description')}
                      value={ml().description}
                      disabled
                    />
                  </Toolbar>
                </Show>
              </Header>
            }
          >
            <DataTable
              columns={columns()}
              rows={lineRows()}
              rowKey={row => row.id}
              loading={linesData.loading}
              sort={currentSort()}
              onSort={onSort}
              emptyMessage={t('error.no-items')}
              config={tableConfig.config()}
              setConfig={tableConfig.setConfig}
              pagination={{
                offset: query().offset,
                pageSize: query().first,
                total: linesTotal(),
                onOffsetChange: offset => setQuery({ ...query(), offset }),
                onPageSizeChange: first =>
                  setQuery({ ...query(), first, offset: 0 }),
              }}
            />
          </Page>
        )}
      </Show>
    </Suspense>
  );
};

export default MasterListDetailView;
