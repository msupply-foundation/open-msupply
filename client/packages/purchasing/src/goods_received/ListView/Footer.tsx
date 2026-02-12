import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useGoodsReceivedList } from '../api';
import { canDeleteGoodsReceived } from '../utils';
import { GoodsReceivedRowFragment } from '../api/operations.generated';

export const FooterComponent = ({ selectedRows, resetRowSelection }: {
  selectedRows: GoodsReceivedRowFragment[];
  resetRowSelection: () => void
}) => {
  const t = useTranslation();
  const {
    delete: { deleteGoodsReceived },
  } = useGoodsReceivedList();

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: async () => {
      await deleteGoodsReceived(selectedRows);
      resetRowSelection();
    },
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
              resetRowSelection={resetRowSelection}
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
