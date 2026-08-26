import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { Alert } from '@/ui/elements/feedback/Alert';
import { createAddAction } from '@/ui/utils/keyActions';
import { ALT_N } from '@/ui/utils/shortcuts';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '@/ui/elements/table/tableHelpers';
import { remToPx } from '@/ui/utils/rem';
import { createTableConfig } from '@/api/createTableConfig';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { PlusCircleIcon } from '@/ui/icons';
import { useUrlQueryState } from '@/list/urlQueryState';
import { SyncMessages as SyncMessagesQuery } from './syncMessages.generated';
import type {
  SyncMessagesVariables,
  SyncMessageRowFragment,
} from './syncMessages.generated';
import { filterFields, type SyncMessageFilter } from './listFilters';
import {
  DEFAULT_STATE,
  SORT_KEYS,
  buildListVariables,
  pageFromResult,
  type RegisterPage,
  type SortKey,
  type SyncMessagesListState,
} from './listState';
import { statusLabel, typeLabel } from './syncMessageLabels';
import { CreateSyncMessageModal } from './CreateSyncMessageModal';
import { SyncMessageModal } from './SyncMessageModal';

/*
 * S1 — the sync-message register (spec/sync-message/ui-surface.md S1): the
 * standard list screen, composed exactly like the reference vertical
 * (stocktakes). Data + URL-backed filter/sort/pagination state from the
 * vertical, UI from the library components, no page CSS.
 *
 * The register has NO detail screen: a row click opens the read-only message
 * modal (S3), and the one page action opens the create modal (S2). It also has
 * NO row selection, NO bulk actions and NO per-record actions of any kind —
 * nothing about a sync message can be acted on once created (rules §
 * immutability, OMS-REG-MNG-05.25/.27), so the screen carries no action footer
 * at all. There is no Export CSV either (ui-surface S1 § layout).
 */

const SyncMessagesList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout, which requires a resolved store before routing. It is
  // AUTHORISATION for the read (server admin against this store), never a
  // narrowing — the register is server-wide (OMS-REG-MNG-05.2).
  const params = useParams<{ storeId: string }>();
  const { query, setQuery } =
    useUrlQueryState<SyncMessagesListState>(DEFAULT_STATE);
  // The S2 create modal, mounted only while open so its form seeds once and
  // its dialog testids are unique in the document while they apply.
  const [creating, setCreating] = createSignal(false);
  // The S3 message modal's opening state — the clicked row, or null.
  const [opened, setOpened] = createSignal<SyncMessageRowFragment | null>(null);

  // Alt+N — this screen's add action (spec/keyboard KB-R2), declared once by
  // the screen for the header button that triggers it.
  createAddAction({
    name: 'button.new-sync-message',
    run: () => setCreating(true),
  });

  const tableConfig = createTableConfig({
    tableId: 'sync-messages',
    defaultConfig: {
      compact: {
        // Narrow viewports default to card view (ui-standards § tables).
        viewMode: 'card',
      },
    },
  });

  const variables = createMemo<SyncMessagesVariables>(() =>
    buildListVariables(query(), params.storeId)
  );

  // Global resource-style fetch (kdd/state-management): codegen output through
  // the single never-throwing query method. The resource SOURCE is the
  // SERIALISED variables (a stable string), so states with identical query
  // content don't refetch (kdd/solid-reactivity-pitfalls).
  //
  // A failed read KEEPS the previous page — held in `held` across fetches —
  // and reports itself as `stale`, so the register both leaves the last page
  // on screen and states that the list did not refresh (OMS-REG-MNG-05.29,
  // D120): a silently stale table is indistinguishable from a filter that
  // matched everything.
  let held: RegisterPage = { nodes: [], totalCount: 0 };
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        SyncMessagesQuery,
        JSON.parse(serialised) as SyncMessagesVariables
      );
      const page = pageFromResult(result);
      if (page) held = page;
      return { page: held, stale: page === undefined };
    }
  );

  // Read `data.latest`, NOT `data()`: `.latest` never suspends, so the table
  // mounts immediately with its own loading treatment instead of blanking the
  // page into the router's fallback-less <Suspense>
  // (kdd/solid-reactivity-pitfalls § no remounts, rule 1).
  const rows = () => data.latest?.page.nodes ?? [];
  const totalCount = () => data.latest?.page.totalCount ?? 0;
  const staleRead = () => data.latest?.stale === true;

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Clicking a sortable header: the DataTable computes the next direction and
  // hands back key + desc; record it as the GraphQL sort array, resetting to
  // the first page. Sorting is SERVER-side throughout — this app never
  // reorders a page in the browser.
  const onSort = (key: SortKey, desc: boolean) => {
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  };

  const onFilterChange = (filter: SyncMessageFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
  };

  // Columns and crumbs are accessors: their text comes from t(), which must be
  // read in a reactive scope to re-translate on a language switch.
  const columns = (): Column<SyncMessageRowFragment, SortKey>[] => [
    {
      // The sender's store name. No server sort key exists for it, so the
      // column is not sortable (contract § backend gaps).
      c: { accessor: row => row.fromStore?.storeName ?? '', id: 'fromStore' },
      header: () => t('label.from-store'),
      ...getTextCell(),
      size: remToPx(12),
    },
    {
      // The destination's store name — BLANK where the message has no
      // destination, which is a valid message (OMS-REG-MNG-05.13).
      c: { accessor: row => row.toStore?.storeName ?? '', id: 'toStore' },
      header: () => t('label.to-store'),
      ...getTextCell(),
      size: remToPx(12),
    },
    {
      // Date only, no time — the `createdDatetime` cell definition carries
      // both the date rendering and its width.
      c: { key: 'createdDatetime' },
      sortKey: SORT_KEYS.created,
      header: () => t('label.created-datetime'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      // Resolved name, never the raw value (OMS-REG-MNG-05.4). Sortable — but
      // the sort GROUPS equal statuses without ordering them by lifecycle, and
      // nothing here presents it as progress (OMS-REG-MNG-05.28): it is a
      // plain sortable text column, with no lifecycle affordance anywhere on
      // the register.
      c: { accessor: row => statusLabel(row.status), id: 'status' },
      sortKey: SORT_KEYS.status,
      header: () => t('label.status'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { accessor: row => typeLabel(row.type), id: 'type' },
      header: () => t('label.type'),
      ...getTextCell(),
      size: remToPx(10),
    },
    {
      // The failure reason: a RAW server string, shown verbatim and never
      // translated, blank unless the status is Error. It is the table's sink
      // column, truncated per the shared table standards.
      c: { accessor: row => row.errorMessage ?? '', id: 'errorMessage' },
      header: () => t('label.error-message'),
      ...getTextCell(),
    },
  ];

  const crumbs = () => [{ label: t('manage') }, { label: t('sync-message') }];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            {/* The screen's ONLY page action (ui-surface S1 § layout): no
                export, and no bulk or per-record action anywhere. */}
            <Button
              icon={<PlusCircleIcon />}
              shortcut={ALT_N}
              data-testid="new-sync-message-button"
              onClick={() => setCreating(true)}
            >
              {t('button.new-sync-message')}
            </Button>
          </HeaderButtons>
        </Header>
      }
    >
      {/* The list did not refresh — stated rather than left implicit, so a
          stale page is never read as the filter's result (D120). Sits above the
          table as the fill-body region's other child; the table still claims
          the rest of the region (its own flex). */}
      <Show when={staleRead()}>
        <Alert severity="warning" testId="sync-messages-stale">
          {t('error.list-not-refreshed')}
        </Alert>
      </Show>
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
        // A row opens the read-only message modal — there is no detail
        // route (ui-surface S1 § layout).
        onRowClick={row => setOpened(row)}
        // The empty state carries NO action of its own: New message is
        // always present as the page action and is not repeated
        // (OMS-REG-MNG-05.8).
        emptyMessage={t('error.no-sync-messages')}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        configIsDefault={tableConfig.isConfigDefault()}
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
        // Server-side pagination; the count reflects the full filtered set.
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          onOffsetChange: offset => setQuery({ ...query(), offset }),
          onPageSizeChange: first => setQuery({ ...query(), first, offset: 0 }),
        }}
      />
      <Show when={creating()}>
        <CreateSyncMessageModal
          storeId={params.storeId}
          onClose={() => setCreating(false)}
          onCreated={() => void refetch()}
        />
      </Show>
      <Show when={opened()}>
        {message => (
          <SyncMessageModal
            storeId={params.storeId}
            message={message()}
            onClose={() => setOpened(null)}
          />
        )}
      </Show>
    </Page>
  );
};

export default SyncMessagesList;
