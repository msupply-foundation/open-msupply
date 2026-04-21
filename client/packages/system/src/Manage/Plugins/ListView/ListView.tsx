import React, { useMemo } from 'react';
import {
  NothingHere,
  useTranslation,
  useEditModal,
  useNonPaginatedMaterialTable,
  ColumnDef,
  MaterialTable,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { useInstalledPlugins } from '../api/hooks/useInstalledPluginsList';
import { PluginUploadModal } from './PluginUploadModal';
import {
  InstalledPluginNodeFragment,
  InstalledPluginKindType,
} from '../api/operations.generated';

export const PluginsList = () => {
  const t = useTranslation();

  const {
    query: { data, isError, isFetching },
    install: { installMutation },
  } = useInstalledPlugins();

  const { isOpen, onClose, onOpen } = useEditModal();

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
    ],
    []
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
        />
      )}
      <MaterialTable table={table} />
    </>
  );
};
