import React, { useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  MaterialTable,
  NothingHere,
  useDeleteConfirmation,
  useEditModal,
  usePaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';
import { UploadModal } from './UploadModal';
import { HelpDocumentRowFragment, useHelpDocuments } from '../api';

export const HelpDocumentsList = () => {
  const t = useTranslation();
  const { isOpen, onClose, onOpen } = useEditModal();

  const {
    query: { data, isError, isFetching },
    delete: { deleteHelpDocument },
  } = useHelpDocuments();

  const columns = useMemo(
    (): ColumnDef<HelpDocumentRowFragment>[] => [
      { accessorKey: 'title', header: t('label.title'), enableSorting: true },
      {
        // Render the file name as a link to the inline-view URL — same one
        // the Help page uses, so PDFs preview in a new tab. Rows whose file
        // blob hasn't synced yet just show plain text.
        id: 'fileName',
        header: t('label.filename'),
        accessorFn: row => row.files.nodes[0]?.fileName ?? '',
        enableSorting: false,
        Cell: ({ row }) => {
          const file = row.original.files.nodes[0];
          if (!file) return null;
          const url = `${Environment.SYNC_FILES_URL}/help_document/${row.original.id}/${file.id}`;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
            >
              {file.fileName}
            </a>
          );
        },
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.uploaded'),
        columnType: ColumnType.Date,
      },
    ],
    [t]
  );

  const { table, selectedRows } = usePaginatedMaterialTable({
    tableId: 'help-document-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    noDataElement: (
      <NothingHere body={t('error.no-help-documents')} onCreate={onOpen} />
    ),
  });

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: async () => {
      const results = await Promise.all(
        selectedRows.map(row => deleteHelpDocument(row.id))
      );
      if (results.some(r => r?.__typename !== 'DeleteResponse')) {
        throw new Error('Delete failed');
      }
      table.resetRowSelection();
    },
    messages: {
      confirmMessage: t('messages.confirm-delete-help-documents', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-help-documents', {
        count: selectedRows.length,
      }),
    },
  });

  return (
    <>
      <AppBarButtons onOpen={onOpen} />
      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows}
        deleteRows={confirmAndDelete}
        resetRowSelection={table.resetRowSelection}
      />
      {isOpen && <UploadModal isOpen={isOpen} onClose={onClose} />}
    </>
  );
};
