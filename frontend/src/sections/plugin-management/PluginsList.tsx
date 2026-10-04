import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { gated } from '@/api/gated';
import { graphqlFetch } from '@/api/graphql';
import { t, tPlural } from '@/intl';
import { configurationFor } from '@/plugins/registry';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { getCellDefinition } from '@/ui/elements/table/tableHelpers';
import { createTableConfig } from '@/api/createTableConfig';
import { DeleteSelectedAction } from '@/domain/selection';
import { PlusCircleIcon, SettingsIcon } from '@/ui/icons';
import { useUrlQueryState } from '@/list/urlQueryState';
import { createAddAction } from '@/ui/utils/keyActions';
import { ALT_N } from '@/ui/utils/shortcuts';
import { remToPx } from '@/ui/utils/rem';
import { ManagedPlugins, UninstallPlugin } from './plugins.generated';
import {
  orderPlugins,
  rowKey,
  rowsForKeys,
  runtimeText,
  typesText,
  uninstallOrder,
  uninstallOutcome,
  type PluginRow,
  type PluginSortKey,
} from './pluginRows';
import { UploadPluginDialog } from './UploadPluginDialog';
import { ConfigurePluginDialog } from './ConfigurePluginDialog';

/*
 * S1 — Installed plugins (spec/plugin-management/ui-surface.md): the standard
 * list screen over ONE read with no paging, filters or export. Sort is held in
 * the URL like every list, but applied here — the server offers none
 * (rules › reading the installed plugins).
 *
 * The destination's central-server + server-admin gate is navigation's, so
 * this screen renders no gate of its own.
 */

type PluginsListState = { sort?: SortState<PluginSortKey> };

const kindLabel = (kind: PluginRow['kind']): string =>
  kind === 'BACKEND' ? t('label.backend') : t('label.frontend');

// Each selected row is uninstalled by its own call (rules › uninstalling
// plugins), and read through uninstallOutcome — a shared id's wrong removal
// included (OMS-REG-MNG-07.65).
const uninstallOne = async (row: PluginRow) =>
  uninstallOutcome(
    row,
    await graphqlFetch(
      UninstallPlugin,
      { id: row.id },
      { returnGraphqlErrors: true }
    )
  );

// A refused row is named by code, version and runtime (ui-surface S4).
const describeRow = (row: PluginRow): string =>
  [row.code, row.version, runtimeText(row)].filter(Boolean).join(' · ');

const confirmMessage = (rows: readonly PluginRow[]): string =>
  rows.length === 1
    ? t('messages.confirm-delete-plugin', { code: rows[0]?.code ?? '' })
    : tPlural('messages.confirm-delete-plugins', rows.length);

const PluginsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  // No default sort: the server's order stands until a header is chosen.
  const { query, setQuery } = useUrlQueryState<PluginsListState>({});
  const [selectedKeys, setSelectedKeys] = createSignal<string[]>([]);
  const [uploadOpen, setUploadOpen] = createSignal(false);
  const [configuring, setConfiguring] = createSignal<string>();

  // Alt+N — this screen's add action (spec/keyboard KB-R2), declared once by
  // the screen for the header button that triggers it.
  createAddAction({
    name: 'button.upload-plugin',
    run: () => setUploadOpen(true),
  });

  const tableConfig = createTableConfig({ tableId: 'plugins' });

  // Read through `gated`, which never suspends, so the first load shows the
  // table's own loading treatment rather than the route's fallback
  // (kdd/solid-reactivity-pitfalls). Failures surface globally.
  const [data, { refetch }] = createResource(async () => {
    const result = await graphqlFetch(ManagedPlugins, {});
    if (result.kind !== 'success') return undefined;
    return result.data.centralServer.plugin.installedPlugins.nodes;
  });

  const rows = createMemo(() =>
    orderPlugins(gated(data) ?? [], query().sort, kindLabel)
  );

  // Configurable = this app LOADED a plugin of the code that ships an editor;
  // every row of the code offers it (rules › configuring a plugin).
  const configurable = (row: PluginRow) =>
    configurationFor(row.code) !== undefined;

  const currentSort = (): SortState<PluginSortKey> | undefined => query().sort;
  const onSort = (key: PluginSortKey, desc: boolean) =>
    setQuery({ ...query(), sort: { key, desc } });

  const columns = (): Column<PluginRow, PluginSortKey>[] => [
    {
      c: { key: 'code' },
      sortKey: 'code',
      header: () => t('label.code'),
      // Card view: the code is the card's title.
      ...getCellDefinition('code', { headerPosition: 'primary' }),
      // Capped, so one very long code ellipsises (full text on hover) instead
      // of pushing Types and the Configure button out of view
      // (PLG-20261001-F4). Wider than the shared `code` preset's ~9
      // characters: plugin codes run to twenty and more.
      maxSize: remToPx(16),
    },
    {
      c: { key: 'version' },
      sortKey: 'version',
      header: () => t('label.version'),
    },
    {
      c: { accessor: row => kindLabel(row.kind), id: 'kind' },
      sortKey: 'kind',
      header: () => t('label.kind'),
    },
    {
      c: { accessor: runtimeText, id: 'runtime' },
      sortKey: 'runtime',
      header: () => t('label.runtime'),
    },
    {
      // One line, truncated, with the full list on hover (ui-surface S1) —
      // capped like Code, so a long list can't widen the column either.
      c: { accessor: typesText, id: 'types' },
      header: () => t('label.types'),
      maxSize: remToPx(24),
    },
    {
      // Headerless; the button is the keyboard route to the same action a
      // row click takes (ui-surface S1 › layout). `actions` per CELL_TYPES.
      c: { id: 'actions' },
      header: () => '',
      // One icon button plus the cell's padding; never grows.
      size: remToPx(3.5),
      maxSize: remToPx(3.5),
      // Card view: the row action rides the card header's inline-end corner.
      meta: {
        headerPosition: 'badge',
        align: 'right',
        hideFromColumnSettings: true,
      },
      cell: info => (
        <Show when={configurable(info.row.original)}>
          <IconButton
            icon={<SettingsIcon />}
            label={t('title.configure-plugin')}
            data-testid="plugin-configure-button"
            onClick={event => {
              // The row's own click would open the same dialog a second time.
              event.stopPropagation();
              setConfiguring(info.row.original.code);
            }}
          />
        </Show>
      ),
    },
  ];

  const selectedRows = () => rowsForKeys(rows(), selectedKeys());

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('plugins') }]} />
          <HeaderButtons>
            <Button
              icon={<PlusCircleIcon />}
              shortcut={ALT_N}
              data-testid="upload-plugin-button"
              onClick={() => setUploadOpen(true)}
            >
              {t('button.upload-plugin')}
            </Button>
          </HeaderButtons>
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={rowKey}
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={row => setConfiguring(row.code)}
        rowClickable={configurable}
        emptyMessage={t('error.no-plugins')}
        enableSelection
        selectedIds={selectedKeys()}
        onSelectionChange={setSelectedKeys}
        selectionActions={
          // No guard: navigation's server-admin gate already holds.
          <DeleteSelectedAction
            // Backend rows first, whatever the sort (OMS-REG-MNG-07.66).
            selected={() => uninstallOrder(selectedRows())}
            deleteOne={uninstallOne}
            // One call at a time: the server addresses a row by id alone, and
            // a backend and a frontend row can share one (contract ›
            // uninstalling plugins).
            batchSize={1}
            nameOf={describeRow}
            confirmMessage={confirmMessage}
            refusedMessage={() => t('error.unable-to-delete-plugin')}
            onChanged={() => void refetch()}
            onDone={() => {
              setSelectedKeys([]);
              // A shared-id refusal still removed a row (the backend one), so
              // the list reads again whatever the outcome said (.65).
              void refetch();
            }}
          />
        }
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
      />
      <Show when={uploadOpen()}>
        <UploadPluginDialog
          onClose={() => setUploadOpen(false)}
          onAttempted={() => void refetch()}
        />
      </Show>
      <Show when={configuring()}>
        {code => (
          <ConfigurePluginDialog
            storeId={params.storeId}
            pluginCode={code()}
            onClose={() => setConfiguring(undefined)}
          />
        )}
      </Show>
    </Page>
  );
};

export default PluginsList;
