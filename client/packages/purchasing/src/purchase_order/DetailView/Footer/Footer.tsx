import React, { ReactElement } from 'react';
import {
  Box,
  AppFooterPortal,
  useTranslation,
  DeleteIcon,
  Action,
  ActionsFooter,
  PurchaseOrderNodeStatus,
  StatusCrumbs,
  useTableStore,
  usePreferences,
  useDeleteConfirmation,
  CloseIcon,
  useConfirmationModal,
  useNotification,
} from '@openmsupply-client/common';
import {
  usePurchaseOrder,
  PurchaseOrderFragment,
  usePurchaseOrderLine,
} from '../../api';
import { getStatusTranslator, purchaseOrderStatuses } from './utils';
import { StatusChangeButton } from './StatusChangeButton';

const createStatusLog = (
  purchaseOrder: PurchaseOrderFragment,
  requiresAuthorisation: boolean
) => {
  const statusLog: Record<PurchaseOrderNodeStatus, null | undefined | string> =
    {
      [PurchaseOrderNodeStatus.New]: purchaseOrder.createdDatetime,
      [PurchaseOrderNodeStatus.Authorised]: requiresAuthorisation
        ? purchaseOrder.authorisedDatetime
        : null,
      [PurchaseOrderNodeStatus.Confirmed]: purchaseOrder.confirmedDatetime,
      [PurchaseOrderNodeStatus.Finalised]: purchaseOrder.finalisedDatetime,
    };

  return statusLog;
};

interface FooterProps {
  showStatusBar: boolean;
  status: PurchaseOrderNodeStatus;
}

export const Footer = ({
  showStatusBar,
  status,
}: FooterProps): ReactElement => {
  const t = useTranslation();
  const { success } = useNotification();
  const { clearSelected } = useTableStore();
  const {
    query: { data },
    isDisabled,
  } = usePurchaseOrder();
  const { updateLineStatus } = usePurchaseOrderLine();
  const { authorisePurchaseOrder = false } = usePreferences();
  const {
    delete: { deleteLines },
  } = usePurchaseOrderLine();

  const selectedRows = useTableStore(state => {
    const selectedLines =
      data?.lines.nodes.filter(line => state.rowState[line.id]?.isSelected) ||
      [];
    return selectedLines;
  });

  const deleteAction = async () => {
    const ids = selectedRows.map(row => row.id);
    if (ids.length === 0) return;
    return await deleteLines(ids);
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-lines-purchase-order', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: selectedRows.length,
      }),
    },
  });

  const confirmAndClose = async () => {
    try {
      await updateLineStatus(selectedRows);
      success(
        t('messages.closed-purchase-order-lines', {
          count: selectedRows.length,
        })
      )();
      clearSelected();
    } catch (e) {
      console.error('Error closing purchase order lines:', e);
    }
  };

  const showCloseConfirmation = useConfirmationModal({
    onConfirm: confirmAndClose,
    message: t('messages.confirm-close-purchase-order-lines', {
      count: selectedRows.length,
    }),
    title: t('heading.are-you-sure'),
  });

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
  ];

  if (status === PurchaseOrderNodeStatus.Confirmed) {
    actions.push({
      label: t('button.close-purchase-order-lines'),
      onClick: showCloseConfirmation,
      icon: <CloseIcon />,
    });
  }

  const filteredStatuses = authorisePurchaseOrder
    ? purchaseOrderStatuses
    : purchaseOrderStatuses.filter(
        status => status !== PurchaseOrderNodeStatus.Authorised
      );

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
          {data && selectedRows.length === 0 && showStatusBar ? (
            <Box
              gap={2}
              display="flex"
              flexDirection="row"
              alignItems="center"
              height={64}
            >
              <StatusCrumbs
                statuses={filteredStatuses}
                statusLog={createStatusLog(data, authorisePurchaseOrder)}
                statusFormatter={getStatusTranslator(t)}
              />
              <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
                <StatusChangeButton />
              </Box>
            </Box>
          ) : null}
        </>
      }
    />
  );
};
