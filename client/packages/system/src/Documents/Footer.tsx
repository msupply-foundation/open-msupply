import React, { memo, ReactElement, useMemo } from 'react';
import {
  Action,
  ActionsFooter,
  AppFooterPortal,
  DeleteIcon,
  DownloadIcon,
  useDeleteConfirmation,
  useDownloadFile,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { SyncFileReferenceFragment } from '@openmsupply-client/system';

interface FooterProps {
  recordId: string;
  tableName: string;
  invalidateQueries?: () => void;
  selectedRows?: SyncFileReferenceFragment[];
  resetRowSelection?: () => void;
  deletableDocumentIds?: Set<string>;
}

const FooterComponent = ({
  recordId,
  tableName,
  invalidateQueries = () => {},
  selectedRows = [],
  resetRowSelection = () => {},
  deletableDocumentIds,
}: FooterProps): ReactElement => {
  const t = useTranslation();
  const downloadFile = useDownloadFile();
  const { error } = useNotification();

  // Filter selected rows to only deletable ones
  const deletableRows = useMemo(() => {
    if (!deletableDocumentIds) return selectedRows;

    return selectedRows.filter(row => deletableDocumentIds.has(row.id));
  }, [selectedRows, deletableDocumentIds]);

  const handleFileDelete = async (id: string) => {
    const url = `${Environment.SYNC_FILES_URL}/${tableName}/${recordId}/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok)
      error(t('error.an-error-occurred', { message: response.statusText }))();
  };

  const handleDelete = async () => {
    // Only delete the deletable ones
    if (deletableRows.length === 0) {
      return;
    }

    try {
      const deleteRequests = deletableRows.map(row => handleFileDelete(row.id));
      await Promise.all(deleteRequests);
      invalidateQueries();
      resetRowSelection();
    } catch (e) {
      console.error(e);
      error(t('error.an-error-occurred', { message: (e as Error).message }))();
    }
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: handleDelete,
    canDelete: deletableRows.length > 0,
    messages: {
      confirmMessage: t('messages.confirm-delete-documents', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-documents', {
        count: selectedRows.length,
      }),
    },
  });

  const handleFileDownload = async () => {
    // Sequential downloads are better than Promise.all() to avoid browser limits
    for (const file of selectedRows) {
      try {
        const url = `${Environment.SYNC_FILES_URL}/${tableName}/${file.recordId}/${file.id}`;
        await downloadFile(url, { credentials: 'include' });
      } catch (e) {
        console.error(e);
        error(
          t('error.an-error-occurred', { message: (e as Error).message })
        )();
      }
    }
  };

  const actions: Action[] = [
    ...(deletableRows.length > 0
      ? [
          {
            label: t('button.delete-document'),
            icon: <DeleteIcon />,
            onClick: confirmAndDelete,
          },
        ]
      : []),
    {
      label: t('button.download'),
      icon: <DownloadIcon />,
      onClick: handleFileDownload,
    },
  ];

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedRows.length !== 0 && (
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRows.length}
              resetRowSelection={resetRowSelection}
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
