import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useGoodsReceivedList } from '../api'; // To be implemented
import { canDeleteGoodsReceived } from '../utils';

export const FooterComponent = () => {
  const t = useTranslation();
  const {
    delete: { deleteGoodsReceived, selectedRows },
  } = useGoodsReceivedList();

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: deleteGoodsReceived,
    canDelete: selectedRows.every(canDeleteGoodsReceived),
    messages: {
      confirmMessage: t('messages.confirm-delete-goods-received', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-goods-received', {
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
