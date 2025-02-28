import React, { FC, memo } from 'react';
import {
  Box,
  ButtonWithIcon,
  StatusCrumbs,
  XCircleIcon,
  useTranslation,
  AppFooterPortal,
  InvoiceNodeStatus,
  useBreadcrumbs,
  useTableStore,
  useDeleteConfirmation,
  DeleteIcon,
  Action,
  ActionsFooter,
  PrinterIcon,
  AlertModal,
} from '@openmsupply-client/common';
import { getStatusTranslator, prescriptionStatuses } from '../../../utils';
import { StatusChangeButton } from './StatusChangeButton';
import {
  PrescriptionRowFragment,
  usePrescription,
  usePrescriptionLines,
} from '../../api';
import { usePrintLabels } from '../hooks/usePrinter';

const createStatusLog = (invoice: PrescriptionRowFragment) => {
  const statusIdx = prescriptionStatuses.findIndex(s => invoice.status === s);

  const statusLog: Record<InvoiceNodeStatus, null | undefined | string> = {
    [InvoiceNodeStatus.New]: null,
    [InvoiceNodeStatus.Picked]: null,
    [InvoiceNodeStatus.Verified]: null,
    [InvoiceNodeStatus.Cancelled]: null,
    // placeholder not used in prescriptions
    [InvoiceNodeStatus.Allocated]: null,
    [InvoiceNodeStatus.Shipped]: null,
    [InvoiceNodeStatus.Delivered]: null,
  };

  if (statusIdx >= 0) {
    statusLog[InvoiceNodeStatus.New] = invoice.createdDatetime;
  }
  if (statusIdx >= 1) {
    statusLog[InvoiceNodeStatus.Picked] = invoice.pickedDatetime;
  }
  if (statusIdx >= 2) {
    statusLog[InvoiceNodeStatus.Verified] = invoice.verifiedDatetime;
  }
  if (statusIdx >= 3) {
    statusLog[InvoiceNodeStatus.Cancelled] = invoice.cancelledDatetime;
  }

  return statusLog;
};

export const FooterComponent: FC = () => {
  const t = useTranslation();
  const {
    query: { data: prescription },
    isDisabled,
    rows: items,
  } = usePrescription();
  const { navigateUpOne } = useBreadcrumbs();

  const selectedRows =
    useTableStore(state => {
      return items
        ?.filter(({ id }) => state.rowState[id]?.isSelected)
        .map(({ lines }) => lines.flat())
        .flat();
    }) || [];

  const {
    delete: { deleteLines },
  } = usePrescriptionLines();

  const deleteAction = async () => {
    await deleteLines(selectedRows);
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-lines', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: selectedRows.length,
      }),
    },
  });

  const {
    printLabels: printPrescriptionLabels,
    isPrintingLabels,
    printerExists,
    setPrinterExists,
  } = usePrintLabels();

  const handlePrintLabels = () => {
    if (prescription) {
      printPrescriptionLabels(prescription, selectedRows);
    }
  };

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
    {
      label: t('button.print-prescription-label'),
      icon: <PrinterIcon />,
      onClick: handlePrintLabels,
      disabled: isDisabled || isPrintingLabels,
      disabledToastMessage: t('heading.unable-to-print'),
    },
  ];

  // Don't show "Cancelled" status unless this prescription is already cancelled
  const statusList = prescriptionStatuses.filter(status =>
    prescription?.status === InvoiceNodeStatus.Cancelled
      ? true
      : status !== InvoiceNodeStatus.Cancelled
  );

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedRows.length !== 0 && (
            <>
              <ActionsFooter
                actions={actions}
                selectedRowCount={selectedRows.length}
              />
              <AlertModal
                title={t('heading.unable-to-print')}
                message={t('error.label-printer-not-configured')}
                open={printerExists}
                onOk={() => setPrinterExists(false)}
              />
            </>
          )}
          {prescription?.id && selectedRows.length === 0 && (
            <Box
              gap={2}
              display="flex"
              flexDirection="row"
              alignItems="center"
              height={64}
            >
              <StatusCrumbs
                statuses={statusList}
                statusLog={createStatusLog(prescription)}
                statusFormatter={getStatusTranslator(t)}
              />

              <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
                <ButtonWithIcon
                  shrinkThreshold="lg"
                  Icon={<XCircleIcon />}
                  label={t('button.close')}
                  color="secondary"
                  sx={{ fontSize: '12px' }}
                  onClick={() => navigateUpOne()}
                />
                <StatusChangeButton />
              </Box>
            </Box>
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
