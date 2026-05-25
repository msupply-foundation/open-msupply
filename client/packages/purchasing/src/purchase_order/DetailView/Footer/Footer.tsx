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
import { UpdateDeliveryDateModal } from './UpdateDeliveryDateModal';

/**
 * The status crumbs + status-change button row, extracted so the parent
 * `DetailView` can render it through `AppFooterStatusPortal` on tabs that
 * don't own the lines table (Details/Documents/Log/Inbound Shipments).
 */
export const StatusFooter = (): ReactElement | null => {
  const t = useTranslation();
  const { authorisePurchaseOrder = false } = usePreferences();
  const {
    query: { data },
  } = usePurchaseOrder();

  if (!data) return null;

  const filteredStatuses = authorisePurchaseOrder
    ? purchaseOrderStatuses
    : purchaseOrderStatuses.filter(
        status => status !== PurchaseOrderNodeStatus.RequestApproval
      );

  return (
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
  );
};

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
  status: PurchaseOrderNodeStatus;
  selectedRows: PurchaseOrderLineFragment[];
  resetRowSelection: () => void;
}

export const Footer = ({
  status,
  selectedRows,
  resetRowSelection,
}: FooterProps): ReactElement => {
  const t = useTranslation();
  const { success } = useNotification();
  const {
    isOn: isExpectedDateOn,
    toggleOn: toggleExpectedDateOn,
    toggleOff: toggleExpectedDateOff,
  } = useToggle();
  const {
    isOn: isRequestedDateOn,
    toggleOn: toggleRequestedDateOn,
    toggleOff: toggleRequestedDateOff,
  } = useToggle();
  const { isDisabled } = usePurchaseOrder();
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
  ];

  if (
    status !== PurchaseOrderNodeStatus.Confirmed &&
    status !== PurchaseOrderNodeStatus.Sent &&
    status !== PurchaseOrderNodeStatus.Finalised
  ) {
    actions.push({
      label: t('label.update-expected-delivery-date'),
      icon: <EditIcon />,
      onClick: toggleExpectedDateOn,
    });
  }

  if (
    status !== PurchaseOrderNodeStatus.Confirmed &&
    status !== PurchaseOrderNodeStatus.Sent &&
    status !== PurchaseOrderNodeStatus.Finalised
  ) {
    actions.push({
      label: t('label.update-requested-delivery-date'),
      icon: <EditIcon />,
      onClick: toggleRequestedDateOn,
    });
  }

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

  // Only mount the footer portal when there's a selection to show actions for.
  // When nothing is selected, we leave the slot free so the parent
  // `AppFooterStatusPortal` (status crumbs + status-change button) shows
  // through — no need to duplicate the status footer here.
  return (
    <>
      {selectedRows.length !== 0 && (
        <AppFooterPortal
          Content={
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRows.length}
              resetRowSelection={resetRowSelection}
            />
          }
        />
      )}
      {isExpectedDateOn && (
        <UpdateDeliveryDateModal
          dateType="expected"
          selectedRows={selectedRows}
          isOpen={isExpectedDateOn}
          onClose={toggleExpectedDateOff}
          resetRowSelection={resetRowSelection}
        />
      )}
      {isRequestedDateOn && (
        <UpdateDeliveryDateModal
          dateType="requested"
          selectedRows={selectedRows}
          isOpen={isRequestedDateOn}
          onClose={toggleRequestedDateOff}
          resetRowSelection={resetRowSelection}
        />
      )}
    </>
  );
};
