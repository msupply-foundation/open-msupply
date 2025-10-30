import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
  useTableStore,
} from '@openmsupply-client/common';
import { useGoodsReceivedList } from '../api';
import { canDeleteGoodsReceived } from '../utils';
import { GoodsReceivedRowFragment } from '../api/operations.generated';

interface FooterProps {
  data?: GoodsReceivedRowFragment[];
}

export const FooterComponent = ({ data }: FooterProps) => {
  const t = useTranslation();
  const {
    delete: { deleteGoodsReceived },
  } = useGoodsReceivedList();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.find(({ id }) => selectedId === id))
      .filter(Boolean) as GoodsReceivedRowFragment[],
  }));

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: () => deleteGoodsReceived(selectedRows),
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
