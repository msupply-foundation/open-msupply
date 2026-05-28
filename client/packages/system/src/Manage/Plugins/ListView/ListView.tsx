import React, { useMemo } from 'react';
import {
  NothingHere,
  useTranslation,
  useEditModal,
  useNonPaginatedMaterialTable,
  ColumnDef,
  MaterialTable,
  InstalledPluginKindType,
  IconButton,
  DeleteIcon,
  useConfirmationModal,
  useNotification,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { PluginUploadModal } from './PluginUploadModal';
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
    [t, uninstallLoading]
  );

  const { table } = useNonPaginatedMaterialTable({
    tableId: 'plugins-list',
    columns,
    data: data?.nodes,
    isLoading: isFetching,
    isError,
    noDataElement: <NothingHere body={t('error.no-plugins')} />,
    enableRowSelection: false,
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
      <MaterialTable table={table} />
    </>
  );
};
