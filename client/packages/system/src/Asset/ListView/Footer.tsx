import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useIsCentralServerApi,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useAssetDelete } from '../api/hooks';

export const FooterComponent: FC = () => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();

  const { deleteAssets, selectedRows } = useAssetDelete();

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: deleteAssets,
    messages: {
      confirmMessage: t('messages.confirm-delete-assets', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-assets', {
        count: selectedRows.length,
      }),
    },
  });

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
  ];

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedRows.length !== 0 && isCentralServer && (
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
