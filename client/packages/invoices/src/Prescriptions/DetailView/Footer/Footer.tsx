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
} from '@openmsupply-client/common';
import { getStatusTranslator, prescriptionStatuses } from '../../../utils';
import { StatusChangeButton } from './StatusChangeButton';
import {
  PrescriptionRowFragment,
  usePrescription,
  usePrescriptionLines,
} from '../../api';

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
    statusLog[InvoiceNodeStatus.Cancelled] = invoice.verifiedDatetime;
  }

  return statusLog;
};

export const FooterComponent: FC = () => {
  const t = useTranslation();
  const {
    query: { data },
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

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: () => deleteLines(selectedRows),
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

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
      disabled: isDisabled,
      disabledToastMessage: t('messages.cant-delete-generic'),
    },
    {
      label: t('button.print-prescription-label'),
      icon: <PrinterIcon />,
      onClick: () => {},
      disabled: isDisabled,
      disabledToastMessage: t('heading.unable-to-print'),
    },
  ];

  const statusList = prescriptionStatuses.filter(status => {
    return data?.status === InvoiceNodeStatus.Cancelled
      ? true
      : status !== InvoiceNodeStatus.Cancelled;
  });

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
          {data?.id && selectedRows.length === 0 && (
            <Box
              gap={2}
              display="flex"
              flexDirection="row"
              alignItems="center"
              height={64}
            >
              <StatusCrumbs
                statuses={statusList}
                statusLog={createStatusLog(data)}
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
