import React, { memo, ReactElement } from 'react';
import {
  Action,
  ActionsFooter,
  AppFooterPortal,
  DeleteIcon,
  DownloadIcon,
  useDownloadFile,
  useNotification,
  useTableStore,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { SyncFileReferenceFragment } from '@openmsupply-client/system';

interface FooterProps {
  recordId: string;
  documents: SyncFileReferenceFragment[];
  tableName: string;
}

const FooterComponent = ({
  recordId,
  documents,
  tableName,
}: FooterProps): ReactElement => {
  const t = useTranslation();
  // const queryClient = useQueryClient();
  const downloadFile = useDownloadFile();
  const { error, success } = useNotification();

  const selectedRows = useTableStore(state =>
    documents.filter(({ id }) => state.rowState[id]?.isSelected)
  );

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
    const ids = selectedRows.map(row => row.id);
    try {
      const deleteRequests = ids.map(handleFileDelete);
      await Promise.all(deleteRequests);
      success(t('success'))();
      // todo - needed if own tab?
      // queryClient.invalidateQueries([]);
    } catch (e) {
      console.error(e);
      error(t('error.an-error-occurred', { message: (e as Error).message }))();
    }
  };

  const handleFileDownload = async () => {
    // Sequential downloads are better than Promise.all() to avoid browser limits
    for (const file of selectedRows) {
      try {
        const url = `${Environment.SYNC_FILES_URL}/${tableName}/${recordId}/${file.id}`;
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
    {
      label: t('button.delete-document'),
      icon: <DeleteIcon />,
      onClick: handleDelete,
    },
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
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
