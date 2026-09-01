import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '@/ui/elements/buttons/Button';
import { FilterTextInput } from '@/ui/elements/selectors/FilterBar';
import { DataTable, type SortState } from '@/ui/elements/table/DataTable';
import { createTableConfig } from '@/api/createTableConfig';
import { CloseIcon, PlusCircleIcon } from '@/ui/icons';
import { useUrlQueryState } from '@/list/urlQueryState';
import { initialPageSize, rememberPageSize } from '@/list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { Sites, SiteDeployment } from './sites.generated';
import {
  DEFAULT_STATE,
  buildListVariables,
  nameSearchFilter,
  nameSearchValue,
  type SiteSortKey,
  type SitesListState,
} from './listState';
import { reassignmentTarget, type SiteRow } from './siteEdit';
import { siteAffordances } from './siteGates';
import { siteColumns } from './siteColumns';
import { SiteEditModal, type EditorState } from './SiteEditModal';
import { DeleteSitesAction } from './actions/DeleteSitesAction';

// S1 — the site register (spec/sites/ui-surface.md). The standard list screen,
// composed from library components: Page + Header (Breadcrumb / HeaderButtons /
// Toolbar) + DataTable + its pagination overlay + a selection ContentFooter.
//
// TWO deployment gates run through this screen, and they are not the same gate
// (rules.md § where sites are managed):
//   • central server at all — decides whether the register can be READ. Already
//     answered before we get here: the destination is capability-gated on
// `centralAdmin` (isCentralServer + SERVER_ADMIN) in src/nav/navConfig.ts, so
// a remote site neither shows the entry nor routes to it. Reaching it anyway
// leaves the read as the guard, and the whole `centralServer` namespace refuses
// with a top-level Internal error that nulls the response — which lands in the
// global unexpected-error modal, as the spec intends (ui-surface S3 §
// deployment-gate refusals). • STANDALONE central — decides whether anything
// here is editable. Read below; false until known, which is the safe direction
// (an affordance is never offered before we know it can work).
//
// There is no per-site route: a row click opens the editor MODAL (S2).

type SiteRowType = SiteRow;

const SitesList: Component = () => {
  const { query, setQuery } = useUrlQueryState<SitesListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // The editor's opening state, or undefined when closed. Mounted only while
  // open (a <Show> below), so its own resources — the site's assigned stores —
  // run on open rather than on the list screen, and its ids are unique in the
  // document only while it applies (e2e/TESTIDS.md).
  const [editor, setEditor] = createSignal<EditorState>();

  const tableConfig = createTableConfig({ tableId: 'sites' });

  const variables = createMemo(() => buildListVariables(query()));

  // The register read (kdd/state-management): the single never-throwing query
  // method behind a resource signal, keyed on the SERIALISED variables so two
  // states with identical query content don't refetch
  // (kdd/solid-reactivity-pitfalls).
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        Sites,
        JSON.parse(serialised) as ReturnType<typeof variables>
      );
      if (result.kind !== 'success') return undefined;
      return result.data.centralServer.site.sites;
    }
  );

  // `.latest`, never `data()`: a suspending read here would collapse the screen
  // into the router's fallback-less <Suspense> on a slow first load, and would
  // remount the whole page — the open editor modal included — on every
  // filter/sort/page refetch (kdd/solid-reactivity-pitfalls § no remounts).
  const rows = (): SiteRowType[] => data.latest?.nodes ?? [];
  // OMS-FUN-SYC-002.9 — the reported total is filter-aware, so "M–N of T" and
  // the page count narrow with the search.
  const totalCount = () => data.latest?.totalCount ?? 0;

  // A bulk delete of the last page's rows leaves the offset past the new end
  // (src/list/clampPageOffset.ts, issue #1117).
  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  // The deployment reads: the standalone gate, the multi-device feature flag
  // and the two site ids the editor needs. One fetch per visit, keyed on
  // nothing. Read NON-suspending: this
  // resolves while the screen is already open, and a suspending read would
  // remount the section — and any dialog inside it — the moment it settled.
  const [deploymentData] = createResource(async () => {
    const result = await graphqlFetch(SiteDeployment, {});
    if (result.kind !== 'success') return undefined;
    return result.data;
  });
  const deployment = () => gated(deploymentData);

  // OMS-FUN-SYC-002.12/.15 — every editable affordance on this screen and in
  // the editor is gated on the standalone read. False until known, which is the
  // safe direction. The gate TABLE itself lives in siteGates.ts, transcribed
  // from the spec's own table; the register only needs its two list-level
  // answers (the pairing column of that table belongs to the editor).
  const isStandalone = () => deployment()?.isCentralStandalone ?? false;
  const gates = () =>
    siteAffordances({
      isStandalone: isStandalone(),
      isExistingSite: false,
      pairingAvailable: false,
    });
  // The server's OWN site: no pairing action may target it (.29). Null in
  // syncSettings, or no syncSettings at all, means nothing is known to be own.
  const ownSiteId = () => deployment()?.syncSettings?.syncSiteId ?? undefined;
  // The register's root — where a removed store is handed back to (.33), and
  // the one site that can never be deleted (.39).
  const centralSiteId = () =>
    reassignmentTarget(deployment()?.syncSettings?.centralServerSiteId);
  const featureFlags = () => deployment()?.featureFlags;

  const selectedRows = (): SiteRowType[] => {
    const ids = new Set(selectedIds());
    return rows().filter(row => ids.has(String(row.id)));
  };

  const currentSort = (): SortState<SiteSortKey> | undefined => {
    const sort = query().sort?.[0];
    return sort ? { key: sort.key, desc: sort.desc ?? false } : undefined;
  };

  const onSort = (key: SiteSortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onSearch = (search: string) => {
    setQuery({ ...query(), filter: nameSearchFilter(search), offset: 0 });
    setSelectedIds([]);
  };

  // The Manage section, then Sites (ui-surface S1 § layout). Manage is a nav
  // section, not a screen of its own, so it is a plain crumb rather than a
  // link.
  const crumbs = () => [{ label: t('manage') }, { label: t('sites') }];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            {/* Standalone only — a mixed central's register is authored by the
                legacy central above it, so there is nothing to create here
                (OMS-FUN-SYC-002.12/.15). There is deliberately no Export CSV:
                the register is admin plumbing, not a working list. */}
            <Show when={gates().create}>
              <Button
                icon={<PlusCircleIcon />}
                data-testid="new-site-button"
                onClick={() => setEditor({ mode: 'create' })}
              >
                {t('button.add-new-site')}
              </Button>
            </Show>
          </HeaderButtons>
        </Header>
      }
      contentFooter={
        // Selection swaps the footer band for the bulk-action bar. The
        // selection column itself is standalone-only, so on a mixed central
        // this can never appear.
        <Show when={selectedIds().length > 0}>
          <ContentFooter testId="actions-footer">
            <strong data-testid="selected-rows-count">
              {selectedIds().length} {t('label.selected')}
            </strong>
            <DeleteSitesAction
              rows={selectedRows}
              onFinished={() => {
                setSelectedIds([]);
                void refetch();
              }}
              onPartiallyRefused={() => void refetch()}
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
        columns={siteColumns()}
        rows={rows()}
        rowKey={row => String(row.id)}
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={row => setEditor({ mode: 'edit', site: row })}
        filters={
          <FilterTextInput
            label={t('label.name')}
            placeholder={t('placeholder.search-by-name')}
            testId="filter-input-name"
            value={nameSearchValue(query().filter)}
            onInput={onSearch}
          />
        }
        // OMS-FUN-SYC-002.10 — empty (including filtered-to-nothing) shows the
        // shared empty state in place of the table, and offers NO create
        // affordance: creating is gated on deployment mode, and a server that
        // can create is never genuinely empty (ui-surface S1 § states).
        emptyMessage={t('error.no-sites')}
        enableSelection={gates().selection}
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
      <Show when={editor()}>
        {state => (
          <SiteEditModal
            editor={state()}
            loadedSites={rows}
            isStandalone={isStandalone()}
            ownSiteId={ownSiteId()}
            centralSiteId={centralSiteId()}
            featureFlags={featureFlags()}
            onClose={() => setEditor(undefined)}
            onChanged={() => void refetch()}
          />
        )}
      </Show>
    </Page>
  );
};

export default SitesList;
