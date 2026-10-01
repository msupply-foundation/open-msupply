import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { configurationFor } from '@/plugins/registry';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { createTableConfig } from '@/api/createTableConfig';
import { CloseIcon, PlusCircleIcon, SettingsIcon } from '@/ui/icons';
import { useUrlQueryState } from '@/list/urlQueryState';
import { InstalledPlugins } from './plugins.generated';
import {
  rowKey,
  rowsForKeys,
  runtimeText,
  sortRows,
  typesText,
  type PluginRow,
  type PluginSort,
  type PluginSortKey,
} from './pluginRows';
import { UploadPluginDialog } from './UploadPluginDialog';
import { ConfigurePluginDialog } from './ConfigurePluginDialog';
import { UninstallPluginsAction } from './UninstallPluginsAction';

/*
 * S1 — Installed plugins (spec/plugin-management/ui-surface.md): the standard
 * list screen over ONE read with no paging, filters or export. Sort is held in
 * the URL like every list, but applied here — the server offers none
 * (rules › reading the installed plugins).
 *
 * The destination's central-server + server-admin gate is navigation's, so
 * this screen renders no gate of its own.
 */

type PluginsListState = { sort?: PluginSort };

const kindLabel = (kind: PluginRow['kind']): string =>
  kind === 'BACKEND' ? t('label.backend') : t('label.frontend');

const PluginsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  // No default sort: the server's order stands until a header is chosen.
  const { query, setQuery } = useUrlQueryState<PluginsListState>({});
  const [selectedKeys, setSelectedKeys] = createSignal<string[]>([]);
  const [uploadOpen, setUploadOpen] = createSignal(false);
  const [configuring, setConfiguring] = createSignal<string>();

  const tableConfig = createTableConfig({ tableId: 'plugins' });

  // A first-load read with no live state to lose; `.latest` keeps it
  // non-suspending all the same, so the table shows its own loading treatment
  // (kdd/solid-reactivity-pitfalls). Failures surface globally.
  const [data, { refetch }] = createResource(async () => {
    const result = await graphqlFetch(InstalledPlugins, {});
    if (result.kind !== 'success') return undefined;
    return result.data.centralServer.plugin.installedPlugins.nodes;
  });

  const rows = createMemo(() =>
    sortRows(data.latest ?? [], query().sort, kindLabel)
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
      meta: { headerPosition: 'primary' },
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
      c: { accessor: typesText, id: 'types' },
      header: () => t('label.types'),
      meta: { wrapLines: 2 },
    },
    {
      // Headerless; the button is the keyboard route to the same action a
      // row click takes (ui-surface S1 › layout).
      c: { id: 'configure' },
      header: () => '',
      size: 56,
      meta: { hideFromColumnSettings: true },
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
              data-testid="upload-plugin-button"
              onClick={() => setUploadOpen(true)}
            >
              {t('button.upload-plugin')}
            </Button>
          </HeaderButtons>
        </Header>
      }
      contentFooter={
        <Show when={selectedKeys().length > 0}>
          <ContentFooter testId="actions-footer">
            <strong data-testid="selected-rows-count">
              {selectedKeys().length} {t('label.selected')}
            </strong>
            <UninstallPluginsAction
              selected={selectedRows}
              onUninstalled={() => {
                setSelectedKeys([]);
                void refetch();
              }}
              onPartlyUninstalled={() => void refetch()}
            />
            <ContentFooterActions>
              <Button
                variant="secondary"
                icon={<CloseIcon />}
                onClick={() => setSelectedKeys([])}
              >
                {t('label.clear-selection')}
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        </Show>
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
