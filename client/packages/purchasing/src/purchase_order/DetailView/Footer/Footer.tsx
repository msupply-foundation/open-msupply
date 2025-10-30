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
  usePreferences,
  useDeleteConfirmation,
  CloseIcon,
  useConfirmationModal,
  useNotification,
  EditIcon,
  useToggle,
  PurchaseOrderLineStatusNode,
} from '@openmsupply-client/common';
import {
  usePurchaseOrder,
  PurchaseOrderFragment,
  usePurchaseOrderLine,
  PurchaseOrderLineFragment,
} from '../../api';
import { getStatusTranslator, purchaseOrderStatuses } from './utils';
import { StatusChangeButton } from './StatusChangeButton';
import { ExpectedDeliveryDateModal } from './ExpectedDeliveryDateModal';

const createStatusLog = (
  purchaseOrder: PurchaseOrderFragment,
  requiresAuthorisation: boolean
) => {
  const allocatePurchaseOrderSentStatus =
    purchaseOrder.sentDatetime &&
    (purchaseOrder.status === PurchaseOrderNodeStatus.Sent ||
      purchaseOrder.status === PurchaseOrderNodeStatus.Finalised);

  const statusLog: Record<PurchaseOrderNodeStatus, null | undefined | string> =
    {
      [PurchaseOrderNodeStatus.New]: purchaseOrder.createdDatetime,
      [PurchaseOrderNodeStatus.RequestApproval]: requiresAuthorisation
        ? purchaseOrder.requestApprovalDatetime
        : null,
      [PurchaseOrderNodeStatus.Confirmed]: purchaseOrder.confirmedDatetime,
      [PurchaseOrderNodeStatus.Sent]: allocatePurchaseOrderSentStatus
        ? purchaseOrder.sentDatetime
        : null,
      [PurchaseOrderNodeStatus.Finalised]: purchaseOrder.finalisedDatetime,
    };

  return statusLog;
};

interface FooterProps {
  showStatusBar: boolean;
  status: PurchaseOrderNodeStatus;
  selectedRows: PurchaseOrderLineFragment[];
  resetRowSelection: () => void;
}

export const Footer = ({
  showStatusBar,
  status,
  selectedRows,
  resetRowSelection,
}: FooterProps): ReactElement => {
  const t = useTranslation();
  const { success } = useNotification();
  const { isOn, toggleOn, toggleOff } = useToggle();
  const { authorisePurchaseOrder = false } = usePreferences();

  const {
    query: { data },
    isDisabled,
  } = usePurchaseOrder();
  const {
    updateLines,
    delete: { deleteLines },
  } = usePurchaseOrderLine();

  const deleteAction = async () => {
    const ids = selectedRows.map(row => row.id);
    if (ids.length === 0) return;
    await deleteLines(ids);
    resetRowSelection();
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

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
    {
      label: t('label.update-expected-delivery-date'),
      icon: <EditIcon />,
      onClick: toggleOn,
    },
  ];

  const confirmAndClose = async () => {
    try {
      await updateLines(selectedRows, {
        status: PurchaseOrderLineStatusNode.Closed,
      });
      success(
        t('messages.closed-purchase-order-lines', {
          count: selectedRows.length,
        })
      )();
      resetRowSelection();
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

  if (status === PurchaseOrderNodeStatus.Sent) {
    actions.push({
      label: t('button.close-purchase-order-lines'),
      onClick: showCloseConfirmation,
      icon: <CloseIcon />,
    });
  }

  const filteredStatuses = authorisePurchaseOrder
    ? purchaseOrderStatuses
    : purchaseOrderStatuses.filter(
        status => status !== PurchaseOrderNodeStatus.RequestApproval
      );

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
                width={280}
              />
              <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
                <StatusChangeButton />
              </Box>
            </Box>
          ) : null}
          {isOn && (
            <ExpectedDeliveryDateModal
              selectedRows={selectedRows}
              isOpen={isOn}
              onClose={toggleOff}
              resetRowSelection={resetRowSelection}
            />
          )}
        </>
      }
    />
  );
};
