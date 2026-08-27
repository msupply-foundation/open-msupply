import React from 'react';
import {
  Action,
  ActionsFooter,
  Box,
  DeleteIcon,
  StatusCrumbs,
  useTranslation,
  AppFooterPortal,
  StockRelocationNodeStatus,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import {
  stockMovementStatuses,
  getStatusTranslation,
  isStockMovementDisabled,
} from '../../utils';
import {
  StockMovementFragment,
  StockMovementLineFragment,
  useDeleteStockMovementLines,
} from '../../api';
import { StatusChangeButton } from './StatusChangeButton';

const createStatusLog = (movement: StockMovementFragment) => ({
  [StockRelocationNodeStatus.New]: movement.createdDatetime,
  [StockRelocationNodeStatus.Confirmed]: movement.confirmedDatetime ?? null,
  [StockRelocationNodeStatus.Finalised]: movement.finalisedDatetime ?? null,
});

interface FooterProps {
  movement: StockMovementFragment;
  selectedRows: StockMovementLineFragment[];
  resetRowSelection: () => void;
}

export const Footer = ({
  movement,
  selectedRows,
  resetRowSelection,
}: FooterProps) => {
  const t = useTranslation();
  const { deleteLines } = useDeleteStockMovementLines();

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: async () => {
      await deleteLines(selectedRows.map(row => row.id));
      resetRowSelection();
    },
    canDelete: !isStockMovementDisabled(movement.status),
    messages: {
      confirmMessage: t('messages.confirm-delete-stock-movement-lines', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: selectedRows.length,
      }),
      cantDelete: t('messages.cant-delete-finalised-stock-movement-lines'),
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
          {selectedRows.length === 0 && (
            <Box
              gap={2}
              display="flex"
              flexDirection="row"
              alignItems="center"
              height={64}
            >
              <StatusCrumbs
                statuses={stockMovementStatuses}
                statusLog={createStatusLog(movement)}
                statusFormatter={status => getStatusTranslation(status, t)}
              />
              <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
                {!isStockMovementDisabled(movement.status) && (
                  <StatusChangeButton movement={movement} />
                )}
              </Box>
            </Box>
          )}
        </>
      }
    />
  );
};
