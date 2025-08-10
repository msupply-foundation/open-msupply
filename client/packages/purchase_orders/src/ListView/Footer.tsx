import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
  PurchaseOrderNodeStatus,
} from '@openmsupply-client/common';
import { ListParams, usePurchaseOrderList } from '../api';

export const FooterComponent: FC<{ listParams: ListParams }> = ({
  listParams,
}) => {
  const t = useTranslation();

  const {
    selectedRows,
    delete: { deletePurchaseOrders },
  } = usePurchaseOrderList(listParams);

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: async () => {
      console.log('Deleting...', selectedRows);
      const ids = selectedRows.map(row => row.id);
      return await deletePurchaseOrders(ids);
    },
    canDelete: selectedRows.every(
      row => row.status === PurchaseOrderNodeStatus.New
    ),
    messages: {
      confirmMessage: t('messages.confirm-delete-purchase_orders', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-purchase_orders', {
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
