import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
  PurchaseOrderNodeStatus,
} from '@openmsupply-client/common';
import { PurchaseOrderRowFragment, usePurchaseOrderList } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: PurchaseOrderRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const {
    delete: { deletePurchaseOrders },
  } = usePurchaseOrderList();

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: async () => {
      const ids = selectedRows.map(row => row.id);
      deletePurchaseOrders(ids);
      resetRowSelection();
    },
    canDelete: selectedRows.every(row =>
      [
        PurchaseOrderNodeStatus.New,
        PurchaseOrderNodeStatus.RequestApproval,
      ].includes(row.status)
    ),
    messages: {
      confirmMessage: t('messages.confirm-delete-purchase-orders', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-purchase-orders', {
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
