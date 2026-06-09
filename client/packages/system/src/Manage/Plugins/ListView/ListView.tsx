import React, { useMemo, useState } from 'react';
import {
  NothingHere,
  useTranslation,
  useEditModal,
  useNonPaginatedMaterialTable,
  ColumnDef,
  MaterialTable,
  InstalledPluginKindType,
  usePluginProvider,
  SettingsIcon,
  useIsCentralServerApi,
  IconButton,
  DeleteIcon,
  useConfirmationModal,
  useNotification,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { PluginUploadModal } from './PluginUploadModal';
import { PluginConfigModal } from './PluginConfigModal';
import { InstalledPluginNodeFragment, useInstalledPlugins } from '../api';

export const PluginsList = () => {
  const t = useTranslation();
  const { success, error } = useNotification();

  const {
    query: { data, isError, isFetching },
    install: { installMutation, installLoading },
    uninstall: { uninstallMutation, uninstallLoading },
  } = useInstalledPlugins();

  const { isOpen, onClose, onOpen } = useEditModal();
  const { cachedPluginBundles } = usePluginProvider();
  // Saving a plugin configuration writes a plugin_data row with store_id NULL
  // (global, syncs everywhere). The service only permits that from the central
  // server, so we hide the configure affordance on remote sites entirely.
  const isCentralServer = useIsCentralServerApi();
  const [configuringPluginCode, setConfiguringPluginCode] = useState<
    string | null
  >(null);

  const isConfigurable = (code: string) =>
    isCentralServer && !!cachedPluginBundles[code]?.configuration;

  const showDeleteConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: '',
    onConfirm: () => {},
  });

  const onDelete = (plugin: InstalledPluginNodeFragment) => {
    showDeleteConfirmation({
      message: t('messages.confirm-delete-plugin', { code: plugin.code }),
      onConfirm: async () => {
        try {
          await uninstallMutation(plugin.id);
          success(t('messages.plugin-deleted-successfully'))();
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          error(`${t('error.unable-to-delete-plugin')}: ${message}`)();
        }
      },
    });
  };

  const columns = useMemo(
    (): ColumnDef<InstalledPluginNodeFragment>[] => [
      {
        accessorKey: 'code',
        header: t('label.code'),
        enableSorting: true,
      },
      {
        accessorKey: 'version',
        header: t('label.version'),
        enableSorting: true,
      },
      {
        id: 'kind',
        header: t('label.kind'),
        accessorFn: row =>
          row.kind === InstalledPluginKindType.Backend
            ? t('label.backend')
            : t('label.frontend'),
        enableSorting: true,
      },
      {
        id: 'types',
        header: t('label.types'),
        accessorFn: row => row.types.join(', '),
      },
      {
        id: 'configure',
        header: '',
        enableSorting: false,
        size: 40,
        Cell: ({ row }) =>
          isCentralServer &&
          cachedPluginBundles[row.original.code]?.configuration ? (
            <SettingsIcon
              fontSize="small"
              titleAccess={t('title.configure-plugin')}
            />
          ) : null,
      },
      {
        id: 'actions',
        header: '',
        size: 60,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <IconButton
            icon={<DeleteIcon />}
            label={t('button.delete')}
            disabled={uninstallLoading}
            onClick={() => onDelete(row.original)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, cachedPluginBundles, isCentralServer, uninstallLoading]
  );

  const { table } = useNonPaginatedMaterialTable({
    tableId: 'plugins-list',
    columns,
    data: data?.nodes,
    isLoading: isFetching,
    isError,
    noDataElement: <NothingHere body={t('error.no-plugins')} />,
    enableRowSelection: false,
    onRowClick: row => {
      if (isConfigurable(row.code)) setConfiguringPluginCode(row.code);
    },
    // The table sets `cursor: pointer` on every row whenever onRowClick is
    // provided. Reset it for rows that aren't actually clickable so the
    // affordance matches reality.
    muiTableBodyRowProps: ({ row }) =>
      isConfigurable(row.original.code) ? {} : { sx: { cursor: 'default' } },
  });

  return (
    <>
      <AppBarButtons onOpen={onOpen} />
      {isOpen && (
        <PluginUploadModal
          isOpen={isOpen}
          onClose={onClose}
          install={installMutation}
          isInstalling={installLoading}
        />
      )}
      {configuringPluginCode && (
        <PluginConfigModal
          isOpen
          pluginCode={configuringPluginCode}
          onClose={() => setConfiguringPluginCode(null)}
        />
      )}
      <MaterialTable table={table} />
    </>
  );
};
