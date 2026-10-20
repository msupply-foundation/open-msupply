import { createMemo, createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import {
  DataTable,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../api/createTableConfig';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { useUrlQueryState } from '../../../list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '../../../list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { stripEmpty } from '../../../typeHelpers';
import {
  encounterColumns,
  enrolmentNameByContext,
  type EncounterSortKey,
} from '../../../domain/encounter/encounterColumns';
import { EncounterList, EncounterProgramNames } from './encounters.generated';
import type {
  EncounterListVariables,
  EncounterListResult,
} from './encounters.generated';
import { filterFields, type EncounterFilter } from './listFilters';

// The global encounter list (spec/encounters/ui-surface.md S1): the standard
// list screen over `encounters`, across every patient and program the user
// may read here. Read-only: no create action, no export, no selection. A row
// opens the encounter record screen.

type EncounterRow = EncounterListResult['encounters']['nodes'][number];

type EncountersListState = {
  filter: EncounterFilter;
  sort: { key: EncounterSortKey; desc: boolean };
  offset: number;
  first: number;
};

// Newest start first (OMS-REG-DIS-11.6). The sort is always sent: omitted,
// the server orders by patient id (spec/encounters/contract.md § listing).
const DEFAULT_STATE: EncountersListState = {
  filter: {},
  sort: { key: 'startDatetime', desc: true },
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const EncountersList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<EncountersListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });

  const tableConfig = createTableConfig({ tableId: 'encounters' });

  const variables = createMemo<EncounterListVariables>(() => ({
    storeId: params.storeId,
    filter: stripEmpty(query().filter),
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));

  // Keyed on the serialised variables; the event time is taken per fetch, so
  // a refetch reads the events active now. Read via `.latest`, never
  // suspending (kdd/solid-reactivity-pitfalls § no remounts on interaction).
  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(EncounterList, {
        ...(JSON.parse(serialised) as EncounterListVariables),
        eventTime: new Date().toISOString(),
      });
      if (result.kind !== 'success') return undefined;
      return result.data.encounters;
    }
  );
  const rows = () => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  const currentSort = (): SortState<EncounterSortKey> => query().sort;
  const onSort = (key: EncounterSortKey, desc: boolean) =>
    setQuery({ ...query(), sort: { key, desc }, offset: 0 });

  const onFilterChange = (filter: EncounterFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  const openRow = (row: EncounterRow) =>
    navigate(`/${params.storeId}/dispensary/encounter/${row.id}`);

  // The enrolment names the Program column shows, by context. Read through
  // the non-suspending gate; the columns rebuild once they arrive.
  const [programNames] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(EncounterProgramNames, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.documentRegistries.nodes;
    }
  );

  const columns = createMemo(() =>
    encounterColumns<EncounterRow>({
      programName: enrolmentNameByContext(gated(programNames) ?? []),
      patientName: row => row.patient.name,
      sortable: true,
    })
  );

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('encounter') }]} />
        </Header>
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
        filters={
          <FilterBar
            filters={filterFields()}
            filter={query().filter}
            onChange={onFilterChange}
          />
        }
        emptyMessage={t('error.no-encounters')}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        configIsDefault={tableConfig.isConfigDefault()}
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

export default EncountersList;
