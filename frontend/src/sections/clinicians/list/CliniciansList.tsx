import { createMemo, createResource, type Component } from 'solid-js';
import { useParams } from '@solidjs/router';
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
import { createTableConfig } from '../../../api/createTableConfig';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { Clinicians, type CliniciansVariables } from '../clinicians.generated';
import {
  buildVariables,
  genderLabelKey,
  DEFAULT_STATE,
  type ClinicianRow,
  type CliniciansListState,
  type SortKey,
} from '../cliniciansListLogic';

// S1 — Clinicians list (spec/clinicians, case OMS-FUN-DIS-004). The Dispensary
// section's read-only register of the active store's active clinicians: no
// search, no filters, no page actions, no selection, no row action, no detail
// (rules › no filtering or search / row actions / read-only). Store scope is
// server-side on storeId; the client always sends isActive:true. Default sort
// last name ascending; Code / First name / Last name / Initials are sortable,
// Mobile and Gender are not.

const CliniciansList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const { query, setQuery } =
    useUrlQueryState<CliniciansListState>(DEFAULT_STATE);
  const tableConfig = createTableConfig({ tableId: 'clinician-list' });

  const variables = createMemo<CliniciansVariables>(() =>
    buildVariables({ storeId: params.storeId, state: query() })
  );

  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        Clinicians,
        JSON.parse(serialised) as CliniciansVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.clinicians;
    }
  );
  const rows = (): ClinicianRow[] => data.latest?.nodes ?? [];
  const totalCount = () => data.latest?.totalCount ?? 0;

  // Columns (ui-surface › columns): code, first name, last name, initials are
  // sortable; mobile and gender are not (OMS-FUN-DIS-004.17). Gender renders
  // its translated label, with the hormone/surgical variants collapsed
  // (OMS-FUN-DIS-004.13); a missing optional attribute shows an empty cell
  // (OMS-FUN-DIS-004.14). Accessors so headers re-translate on locale switch.
  const columns = (): Column<ClinicianRow, SortKey>[] => [
    { c: { key: 'code' }, sortKey: 'code', header: () => t('label.code') },
    {
      c: { key: 'firstName' },
      sortKey: 'firstName',
      header: () => t('label.first-name'),
    },
    {
      c: { key: 'lastName' },
      sortKey: 'lastName',
      header: () => t('label.last-name'),
    },
    {
      c: { key: 'initials' },
      sortKey: 'initials',
      header: () => t('label.initials'),
    },
    { c: { key: 'mobile' }, header: () => t('label.mobile') },
    {
      c: {
        accessor: row => (row.gender ? t(genderLabelKey(row.gender)) : ''),
        id: 'gender',
      },
      header: () => t('label.gender'),
    },
  ];

  // Default order is last name ascending (OMS-FUN-DIS-004.16); only the four
  // sortable columns can drive it (OMS-FUN-DIS-004.5–.7, .15).
  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s &&
      (['code', 'firstName', 'lastName', 'initials'] as const).some(
        k => k === s.key
      )
      ? { key: s.key as SortKey, desc: s.desc ?? false }
      : undefined;
  };
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  return (
    <Page
      fillBody
      header={
        <Header>
          {/* Clinicians (ui-surface › layout). No page actions — read-only
              vertical (OMS-FUN-DIS-004.23). */}
          <Breadcrumb crumbs={[{ label: t('clinicians') }]} />
        </Header>
      }
    >
      {/* No toolbar: no search, no filter menu (OMS-FUN-DIS-004.21). No
          selection column and no row-click handler — rows are inert, there is
          no detail view (OMS-FUN-DIS-004.22). */}
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        emptyMessage={t('error.no-clinicians')}
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

export default CliniciansList;
