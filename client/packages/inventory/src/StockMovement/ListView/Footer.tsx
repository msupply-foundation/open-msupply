import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { canDeleteStockMovement } from '../utils';
import { StockMovementRowFragment, useDeleteStockMovements } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: StockMovementRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const { deleteStockMovements } = useDeleteStockMovements();

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: async () => {
      await deleteStockMovements(selectedRows.map(row => row.id));
      resetRowSelection();
    },
    canDelete: selectedRows.every(row => canDeleteStockMovement(row.status)),
    messages: {
      confirmMessage: t('messages.confirm-delete-stock-movements', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-stock-movements', {
        count: selectedRows.length,
      }),
      cantDelete: t('messages.cant-delete-finalised-stock-movements'),
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
