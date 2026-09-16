import { createMemo, createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { createTableConfig } from '@/api/createTableConfig';
import { useUrlQueryState } from '@/list/urlQueryState';
import { initialPageSize, rememberPageSize } from '@/list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { ImmunisationPrograms } from './immunisationPrograms.generated';
import { filterFields } from './listFilters';
import {
  DEFAULT_REGISTER_STATE,
  courseNames,
  programVariables,
  type ProgramFilter,
  type ProgramRegisterState,
  type ProgramRow,
  type ProgramSortKey,
} from './programRegister';

// S1 — the program list (spec/immunisation-programs ui-surface S1). The
// standard list screen (spec/ui-standards/list-views.md) composed from library
// components, so the page owns no CSS: Page + Header(Breadcrumb) + DataTable
// (which owns its own toolbar — the one name filter — pager and, here, no
// selection bar).
//
// Reached from Programs › Immunizations on a central server whose store has
// the vaccine module on — both gates are navigation's, so this screen carries
// no guard of its own. Not store-scoped: the read takes a storeId for its auth
// plumbing only, and every store sees the same programs.
//
// Deviations from the standard list, each spec'd (ui-surface S1 § Layout):
//  - NO page actions: programs are legacy master data, nothing here creates
//    or exports one.
//  - NO selection column and no bulk-action footer: nothing is done to a
//    program in bulk.
//  - The Vaccine courses column is NOT sortable: `ProgramSortFieldInput` has
//    only `name`, so the generated sort-key union is the literal 'name'.

const ProgramsList: Component = () => {
  // storeId is guaranteed present: the section renders only inside
  // StoreGuardLayout. It AUTHORISES the read (store access) and scopes nothing
  // (contract wire trap).
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<ProgramRegisterState>({
    ...DEFAULT_REGISTER_STATE,
    // A fresh visit starts at the user's remembered rows-per-page; a URL that
    // carries a page size still wins.
    first: initialPageSize(),
  });

  const tableConfig = createTableConfig({ tableId: 'immunisation-programs' });

  const variables = createMemo(() => programVariables(params.storeId, query()));

  // Global resource-style fetch (kdd/state-management): codegen output through
  // the single never-throwing query method, failures handled globally. The
  // resource SOURCE is the SERIALISED variables (a stable string), so two
  // states with identical query content — an added-but-empty name chip — never
  // refetch (kdd/solid-reactivity-pitfalls). `ProgramsResponse` is a
  // single-member union, so there is no error branch to match.
  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        ImmunisationPrograms,
        JSON.parse(serialised) as ReturnType<typeof variables>
      );
      if (result.kind !== 'success') return undefined;
      return result.data.programs;
    }
  );

  // The NON-SUSPENDING read (kdd/solid-reactivity-pitfalls › no remounts on
  // interaction): this list renders under the router's fallback-less
  // <Suspense>, so a suspending read would blank the page on a slow first load
  // instead of showing the table's own loading treatment.
  const register = () => gated(data);
  const rows = (): ProgramRow[] => register()?.nodes ?? [];
  const totalCount = () => register()?.totalCount ?? 0;

  // A filter that shrinks the result set can leave the offset past the new
  // end (src/list/clampPageOffset.ts).
  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  const currentSort = (): SortState<ProgramSortKey> | undefined => ({
    key: query().sort.key,
    desc: query().sort.desc ?? false,
  });

  const onSort = (key: ProgramSortKey, desc: boolean) =>
    setQuery({ ...query(), sort: { key, desc }, offset: 0 });

  const onFilterChange = (filter: ProgramFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  // Columns and crumbs are accessors, not plain arrays: their text comes from
  // t(), which must be read in a reactive scope to re-translate on a language
  // switch.
  const columns = (): Column<ProgramRow, ProgramSortKey>[] => [
    {
      c: { key: 'name' },
      // The list's default sort and its ONLY sortable column.
      sortKey: 'name',
      header: () => t('label.program-name'),
      meta: { headerPosition: 'primary' },
    },
    {
      // A computed cell — the live course names, comma-separated (rules § the
      // program list); blank when the program has none.
      c: { accessor: courseNames, id: 'vaccineCourses' },
      header: () => t('label.vaccine-courses'),
      meta: { wrapLines: 2 },
    },
  ];

  const crumbs = () => [{ label: t('label.programs-immunisations') }];

  // A row opens the program's detail (S2) — its course list.
  const openRow = (row: ProgramRow) =>
    navigate(`/${params.storeId}/programs/immunisations/${row.id}`);

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          {/* No page actions: nothing here creates a program (S1 § Layout). */}
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={r => r.id}
        // Filters live in the table's own toolbar (ui-standards § tables →
        // filtering); state stays URL-backed here.
        filters={
          <FilterBar
            filters={filterFields()}
            filter={query().filter}
            onChange={onFilterChange}
          />
        }
        // `data.loading` (a non-suspending read) drives the table's loading
        // treatment, so a slow fetch never flashes the empty state.
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        // Empty: "Nothing here" + this message, and NO create action —
        // programs are not created here (S1 § states).
        emptyMessage={t('error.no-immunisation-programs')}
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
    </Page>
  );
};

export default ProgramsList;
