import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch, reportPermissionDenied } from '@/api/graphql';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { createAddAction } from '@/ui/utils/keyActions';
import { ALT_N } from '@/ui/utils/shortcuts';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { getDateCell } from '@/ui/elements/table/tableHelpers';
import { createTableConfig } from '@/api/createTableConfig';
import { PlusCircleIcon } from '@/ui/icons';
import { useUrlQueryState } from '@/list/urlQueryState';
import { hasPermission } from '@/store/storeContext';
import { campaignsResource } from '@/domain/campaign';
import { Campaigns } from './campaigns.generated';
import {
  DEFAULT_REGISTER_STATE,
  campaignVariables,
  type Campaign,
  type CampaignRegisterState,
  type CampaignSortKey,
} from './campaignRegister';
import { CampaignEditModal } from './CampaignEditModal';
import { DeleteCampaignsAction } from './DeleteCampaignsAction';

// The campaign register — spec/campaigns S1. The standard list screen
// (spec/ui-standards/list-views.md) composed from library components, so the
// page owns no CSS: Page + Header(Breadcrumb/HeaderButtons) + DataTable (which
// owns its own toolbar, pager, and selection action bar).
//
// This is the whole vertical: there is no detail screen, so a row click opens
// the editor dialog (S2) on that campaign.
//
// Three deviations from the standard list, each spec'd:
//  - NO filter bar. `CampaignFilterInput.name` declares `like` and the resolver
//    ignores it, so there is no name search to offer at all — the `filters`
//    slot is deliberately unfilled rather than wired to a filter the server
//    drops (contract.md § backend gaps).
//  - NO export. The register carries no CSV/Excel action.
//  - The two date columns are NOT sortable: `CampaignSortFieldInput` has only
//    `name`, so declaring a sortKey for them is impossible by construction (the
//    generated union is the literal 'name').

const CampaignsList: Component = () => {
  // storeId is guaranteed present: the section renders only inside
  // StoreGuardLayout. It AUTHORISES the read — the register is
  // installation-wide and the argument scopes nothing (contract.md wire trap).
  const params = useParams<{ storeId: string }>();
  const { query, setQuery } = useUrlQueryState<CampaignRegisterState>(
    DEFAULT_REGISTER_STATE
  );
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // The editor is one dialog for both create and edit (S2): `undefined` = shut,
  // `null` = open blank (create), a campaign = open on that campaign (edit).
  const [editing, setEditing] = createSignal<Campaign | null | undefined>(
    undefined
  );

  // Changing the register needs the central-data edit permission — standing
  // state the client already holds, so it is mirrored rather than guessed
  // (ui-standards validation.md § permission gating). Every change here is
  // fired from a control that opens a DIALOG, which is the case that standard
  // sanctions refusing UP FRONT: the app's global permission-denied modal at
  // the click, before the editor or the confirmation opens, instead of walking
  // the user through a form the server would refuse at the write. The server
  // enforces the same resource regardless.
  const mayEdit = () => hasPermission('EDIT_CENTRAL_DATA');
  // PascalCase, matching the HasPermission(...) names a real Forbidden carries.
  const refusePermission = () => reportPermissionDenied(['EditCentralData']);

  const openCreate = () => {
    if (!mayEdit()) return refusePermission();
    setEditing(null);
  };
  const openEdit = (campaign: Campaign) => {
    if (!mayEdit()) return refusePermission();
    setEditing(campaign);
  };

  // Alt+N — this screen's add action (spec/keyboard KB-R2). Declared by the
  // SCREEN, once, because two controls trigger it: the header button and the
  // empty state's ghost button. Each carries `shortcut={ALT_N}` for its badge.
  createAddAction({ name: 'button.new-campaign', run: openCreate });

  const tableConfig = createTableConfig({ tableId: 'campaigns' });

  const variables = createMemo(() =>
    campaignVariables(params.storeId, query())
  );

  // Global resource-style fetch (kdd/state-management): codegen output through
  // the single never-throwing query method, failures handled globally.
  //
  // The resource SOURCE is the SERIALISED variables (a stable string), not the
  // variables object (kdd/solid-reactivity-pitfalls): two states with identical
  // query content produce an equal string, so re-deriving the memo cannot
  // refetch. `CampaignsResponse` is a single-member union, so there is no error
  // branch to match — a read failure is necessarily a top-level error.
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        Campaigns,
        JSON.parse(serialised) as ReturnType<typeof variables>
      );
      if (result.kind !== 'success') return undefined;
      return result.data.campaigns;
    }
  );

  // The NON-SUSPENDING read, gated on `.state` — the binding read-safety rule
  // (kdd/solid-reactivity-pitfalls › no remounts on interaction, the mandatory
  // createResource checklist). Not `data()`: this list renders under the
  // router's fallback-less <Suspense>, so a suspending read would blank the page
  // on a slow first load instead of showing the table's own loading treatment.
  // Not `.latest` alone either: it suspends on the first pending read, and this
  // resource refetches while a native <dialog> of ours can still be OPEN — the
  // delete confirmation stays open in its could-not-delete phase and re-reads
  // the register behind itself, and a suspend there would detach the dialog and
  // lose its backdrop.
  const register = () =>
    data.state === 'ready' || data.state === 'refreshing'
      ? data.latest
      : undefined;
  const rows = (): Campaign[] => register()?.nodes ?? [];
  // The register's WHOLE total, not the page's (`.6`) — nothing narrows the
  // read, so the connector's totalCount is the register's size.
  const totalCount = () => register()?.totalCount ?? 0;

  const currentSort = (): SortState<CampaignSortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Exactly ONE sort entry is ever recorded: the resolver applies the LAST
  // entry of the list it is sent (contract.md wire trap).
  const onSort = (key: CampaignSortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  // A campaign changed: re-read the register, and refresh the app-wide
  // campaigns cache the campaign-or-program pickers read, so a deleted campaign
  // stops being offered and a renamed one is offered under its new name
  // (`.27`).
  const registerChanged = () => {
    void refetch();
    void campaignsResource.refetch();
  };

  const onSaved = () => {
    setEditing(undefined);
    registerChanged();
  };

  // Every selected campaign was deleted: the rows leave the register and the
  // selection clears. That IS the confirmation — no announcement follows (D21).
  const onDeleted = () => {
    setSelectedIds([]);
    registerChanged();
  };

  // A partial delete: the ones that went stay gone, so the register is re-read,
  // but the selection is deliberately NOT cleared (ui-surface S1).
  const onPartiallyDeleted = () => registerChanged();

  // Columns and crumbs are accessors, not plain arrays: their text comes from
  // t(), which must be read in a reactive scope to re-translate on a language
  // switch.
  const columns = (): Column<Campaign, CampaignSortKey>[] => [
    {
      c: { key: 'name' },
      // The register's default sort and its ONLY sortable column.
      sortKey: 'name',
      header: () => t('label.name'),
      // A blank name reads as an empty cell — the server accepts one, so the
      // register has to be able to show it.
      meta: { headerPosition: 'primary' },
    },
    {
      c: { key: 'startDate' },
      header: () => t('label.start-date'),
      // No sortKey: there is no server sort key for either date, so the header
      // offers no sort control and its column menu no sort entry.
      ...getDateCell(),
    },
    {
      c: { key: 'endDate' },
      header: () => t('label.end-date'),
      ...getDateCell(),
    },
  ];

  // The destination's own name, under the Manage section (the trail comes from
  // the nav registry; this list's crumb is its own name).
  const crumbs = () => [{ label: t('campaigns') }];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            {/* New campaign — the only page action. No Export: the register
                carries none, unlike the standard list's default set. */}
            <Button
              icon={<PlusCircleIcon />}
              shortcut={ALT_N}
              data-testid="new-campaign-button"
              onClick={openCreate}
            >
              {t('button.new-campaign')}
            </Button>
          </HeaderButtons>
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={r => r.id}
        // `data.loading` (a non-suspending read) drives the table's loading
        // treatment, so a slow fetch never flashes the empty state.
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        // No detail screen: a row opens the editor on that campaign (`.14`).
        onRowClick={openEdit}
        emptyMessage={t('error.no-campaigns')}
        empty={
          <Button
            variant="ghost"
            shortcut={ALT_N}
            data-testid="nothing-here-create-button"
            onClick={openCreate}
          >
            {t('button.create-a-new-one')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        // The table's own footer swaps the pager for the selection bar (count +
        // these actions + Clear) while rows are selected — Delete is the
        // register's only bulk action.
        selectionActions={
          <DeleteCampaignsAction
            selectedIds={selectedIds}
            mayEdit={mayEdit}
            onRefused={refusePermission}
            onDeleted={onDeleted}
            onPartiallyDeleted={onPartiallyDeleted}
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
          onPageSizeChange: first => setQuery({ ...query(), first, offset: 0 }),
        }}
      />
      {/* Mounted only while open, so the dialog's ids exist exactly while it
          applies (e2e/TESTIDS.md) and a fresh draft is built per open. */}
      <Show when={editing() !== undefined}>
        <CampaignEditModal
          campaign={editing() ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={onSaved}
        />
      </Show>
    </Page>
  );
};

export default CampaignsList;
