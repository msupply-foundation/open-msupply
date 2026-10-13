import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t, locale } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { UploadIcon } from '@/ui/icons';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { getTextCell } from '@/ui/elements/table/tableHelpers';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { createTableConfig } from '@/api/createTableConfig';
import { useUrlQueryState } from '@/list/urlQueryState';
import { initialPageSize, rememberPageSize } from '@/list/pageSize';
import { AllReportVersions } from './manageReports.generated';
import {
  DEFAULT_REGISTER_STATE,
  reportVariables,
  type ReportFilter,
  type ReportRegisterState,
  type ReportSortKey,
  type ReportVersion,
} from './reportRegister';
import { filterFields } from './listFilters';
import { ReportEditModal } from './ReportEditModal';
import { ReportUploadModal } from './ReportUploadModal';

// The report register — spec/manage-reports S1. The standard list screen
// (spec/ui-standards/list-views.md) composed from library components, so the
// page owns no CSS: Page + Header(Breadcrumb/HeaderButtons) + DataTable (which
// owns its own toolbar, filter slot and pager).
//
// This is the whole vertical: there is no detail screen, so a row click opens
// the editor dialog (S3) on that version.
//
// Deviations from the standard list, each spec'd:
//  - NO selection and no bulk-action bar. Nothing here deletes and activation
//    is per version, so there is no bulk operation to offer
//    (rules.md § permanence).
//  - NO export.
//  - Status and Custom are NOT sortable: `ReportSortFieldInput` carries no key
//    for either, so declaring a sortKey is impossible by construction.
//  - NO active-state filter. The wire supports it, but the reference screen
//    exposes no control, so the register is navigated by paging
//    (listFilters.tsx).

const ReportsList: Component = () => {
  // storeId is guaranteed present: the section renders only inside
  // StoreGuardLayout. It AUTHORISES the read — the catalogue is server-wide
  // and the argument scopes nothing (contract.md wire trap), so nothing here
  // presents the register as the active store's.
  const params = useParams<{ storeId: string }>();
  const { query, setQuery } = useUrlQueryState<ReportRegisterState>({
    ...DEFAULT_REGISTER_STATE,
    first: initialPageSize(),
  });
  // `undefined` = shut; a version = the editor open on it. There is no create
  // counterpart — a report arrives only by installing a bundle.
  const [editing, setEditing] = createSignal<ReportVersion | undefined>(
    undefined
  );
  const [uploading, setUploading] = createSignal(false);

  const tableConfig = createTableConfig({ tableId: 'manage-reports' });

  // `locale()` is read here so a language switch re-reads: the server
  // translates each report's argument schema into the requested language.
  const variables = createMemo(() =>
    reportVariables(params.storeId, locale(), query())
  );

  // Global resource-style fetch (kdd/state-management). The resource SOURCE is
  // the SERIALISED variables (a stable string), not the variables object
  // (kdd/solid-reactivity-pitfalls): two states with identical query content
  // produce an equal string, so re-deriving the memo cannot refetch.
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        AllReportVersions,
        JSON.parse(serialised) as ReturnType<typeof variables>
      );
      if (result.kind !== 'success') return undefined;
      const response = result.data.allReportVersions;
      // DEFENSIVE ONLY. `QueryReportsError` is in the schema but cannot occur:
      // the translation it reports always has a fallback, so it never fails
      // (contract.md ⚠️ wire trap — declared but unreachable). The branch is
      // handled because the union declares it, not because a user can reach
      // it — which is why no rule describes what it looks like.
      if (response.__typename !== 'ReportConnector') return undefined;
      return response;
    }
  );

  // The NON-SUSPENDING read (kdd/solid-reactivity-pitfalls › no remounts on
  // interaction). Not `data()`: this resource refetches while one of our
  // native <dialog>s can still be OPEN — the upload dialog stays open in its
  // partial-install phase and the register re-reads behind it — and a suspend
  // there would detach the dialog and lose its backdrop.
  const register = () => gated(data);
  const rows = (): ReportVersion[] => register()?.nodes ?? [];
  // The FILTERED total: the connector counts with the same filter applied, so
  // this paginates correctly under a name or code search.
  const totalCount = () => register()?.totalCount ?? 0;

  const currentSort = (): SortState<ReportSortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Exactly ONE sort entry is ever recorded: the resolver applies the LAST
  // entry of the list it is sent (contract.md wire trap).
  const onSort = (key: ReportSortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  // A filter edit returns to the first page: the old offset can point past the
  // end of a narrower result.
  const onFilterChange = (filter: ReportFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  const onSaved = () => {
    setEditing(undefined);
    void refetch();
  };

  // Refresh only: the upload dialog closes itself, and only when every file
  // installed — a partial failure re-reads the register behind a dialog that
  // stays open (OMS-REG-MNG-06.25).
  const onInstalled = () => {
    void refetch();
  };

  // Columns and crumbs are accessors, not plain arrays: their text comes from
  // t(), which must be read in a reactive scope to re-translate on a language
  // switch.
  const columns = (): Column<ReportVersion, ReportSortKey>[] => [
    {
      c: { key: 'name' },
      sortKey: 'name',
      header: () => t('label.name'),
      meta: { headerPosition: 'primary' },
    },
    {
      c: { key: 'code' },
      // The register's default sort. A code repeats across the rows of one
      // report's several versions — that repetition IS the grouping the
      // screen offers, since there is no detail view.
      sortKey: 'code',
      header: () => t('label.code'),
    },
    {
      c: { key: 'version' },
      // The server sorts this as TEXT — ascending puts `2.17.3` before
      // `2.9.1` (contract.md § the register). The column is not re-sorted
      // client-side, which would disagree with the server's paging and show
      // a different order per page.
      sortKey: 'version',
      header: () => t('label.version'),
    },
    {
      // Rendered as words, never a raw boolean: the column reads Active /
      // Inactive (ui-surface S1 § columns).
      c: {
        accessor: row =>
          row.isActive ? t('label.active') : t('label.inactive'),
        id: 'isActive',
      },
      // No sortKey: there is no server sort key for active state.
      header: () => t('label.status'),
      ...getTextCell(),
    },
    {
      c: {
        accessor: row => (row.isCustom ? t('messages.yes') : t('messages.no')),
        id: 'isCustom',
      },
      header: () => t('label.custom'),
      ...getTextCell(),
    },
  ];

  // The destination's own name, under the Manage section (the trail comes from
  // the nav registry; this list's crumb is its own name).
  const crumbs = () => [{ label: t('reports') }];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            {/* Upload reports — the only page action. No New (a report cannot
                be authored here) and no Export. */}
            <Button
              icon={<UploadIcon />}
              data-testid="upload-reports-button"
              onClick={() => setUploading(true)}
            >
              {t('button.upload-reports')}
            </Button>
          </HeaderButtons>
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={r => r.id}
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
        // No detail screen: a row opens the editor on that version.
        onRowClick={setEditing}
        // No create affordance in the empty state — a report arrives only by
        // installing a bundle, and Upload reports is always present above.
        emptyMessage={t('error.no-reports')}
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
      {/* Each dialog is mounted only while open, so its ids exist exactly
          while it applies (e2e/TESTIDS.md) and a fresh draft is built per
          open. */}
      <Show when={editing()}>
        {version => (
          <ReportEditModal
            version={version()}
            onClose={() => setEditing(undefined)}
            onSaved={onSaved}
          />
        )}
      </Show>
      <Show when={uploading()}>
        <ReportUploadModal
          onClose={() => setUploading(false)}
          onInstalled={onInstalled}
        />
      </Show>
    </Page>
  );
};

export default ReportsList;
