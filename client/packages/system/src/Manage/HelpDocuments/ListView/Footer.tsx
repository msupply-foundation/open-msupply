import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  AppFooterPortal,
  DeleteIcon,
  DownloadIcon,
  useDownloadFile,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { HelpDocumentRowFragment } from '../api';

interface FooterProps {
  selectedRows: HelpDocumentRowFragment[];
  deleteRows: () => void;
  resetRowSelection: () => void;
}

export const FooterComponent: FC<FooterProps> = ({
  selectedRows,
  deleteRows,
  resetRowSelection,
}) => {
  const t = useTranslation();
  const downloadFile = useDownloadFile();
  const { error } = useNotification();

  const handleDownload = async () => {
    // Sequential to avoid browser concurrent-download limits (copied from
    // the Documents footer pattern).
    for (const doc of selectedRows) {
      const file = doc.files.nodes[0];
      if (!file) continue;
      try {
        const url = `${Environment.SYNC_FILES_URL}/help_document/${doc.id}/${file.id}`;
        await downloadFile(url, { credentials: 'include' });
      } catch (e) {
        console.error(e);
        error(t('error.an-error-occurred', { message: (e as Error).message }))();
      }
    }
  };

  const actions: Action[] = [
    {
      label: t('button.download'),
      icon: <DownloadIcon />,
      onClick: handleDownload,
    },
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: deleteRows,
    },
  ];

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedRows.length > 0 && (
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
