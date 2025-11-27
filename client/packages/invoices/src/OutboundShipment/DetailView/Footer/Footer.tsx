import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  ArrowLeftIcon,
  Box,
  ButtonWithIcon,
  StatusCrumbs,
  XCircleIcon,
  DeleteIcon,
  ZapIcon,
  useTranslation,
  AppFooterPortal,
  InvoiceNodeStatus,
  useBreadcrumbs,
  useConfirmationModal,
  InvoiceLineNodeType,
  usePreferences,
} from '@openmsupply-client/common';
import { getStatusTranslator, outboundStatuses } from '../../../utils';
import { useOutbound, OutboundFragment } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';
import { OnHoldButton } from './OnHoldButton';
import { StockOutLineFragment } from 'packages/invoices/src/StockOut';

const createStatusLog = (invoice: OutboundFragment) => {
  const statusIdx = outboundStatuses.findIndex(s => invoice.status === s);

  const statusLog: Record<InvoiceNodeStatus, null | undefined | string> = {
    [InvoiceNodeStatus.New]: null,
    [InvoiceNodeStatus.Allocated]: null,
    [InvoiceNodeStatus.Picked]: null,
    [InvoiceNodeStatus.Shipped]: null,
    [InvoiceNodeStatus.Delivered]: null,
    [InvoiceNodeStatus.Verified]: null,
    // Not used in outbound shipments
    [InvoiceNodeStatus.Cancelled]: null,
    [InvoiceNodeStatus.Received]: null,
  };

  if (statusIdx >= 0) {
    statusLog[InvoiceNodeStatus.New] = invoice.createdDatetime;
  }
  if (statusIdx >= 1) {
    statusLog[InvoiceNodeStatus.Allocated] = invoice.allocatedDatetime;
  }
  if (statusIdx >= 2) {
    statusLog[InvoiceNodeStatus.Picked] = invoice.pickedDatetime;
  }
  if (statusIdx >= 3) {
    statusLog[InvoiceNodeStatus.Shipped] = invoice.shippedDatetime;
  }
  if (statusIdx >= 4) {
    statusLog[InvoiceNodeStatus.Delivered] = invoice.deliveredDatetime;
  }
  if (statusIdx >= 5) {
    statusLog[InvoiceNodeStatus.Received] = invoice.receivedDatetime;
  }
  if (statusIdx >= 6) {
    statusLog[InvoiceNodeStatus.Verified] = invoice.verifiedDatetime;
  }

  return statusLog;
};

interface FooterComponentProps {
  onReturnLines: (selectedLines: StockOutLineFragment[]) => void;
  selectedRows: StockOutLineFragment[];
  resetRowSelection: () => void;
}

export const FooterComponent: FC<FooterComponentProps> = ({
  onReturnLines,
  selectedRows,
  resetRowSelection,
}) => {
  const t = useTranslation();
  const { navigateUpOne } = useBreadcrumbs();
  const { skipIntermediateStatusesInOutbound } = usePreferences();

  const { data } = useOutbound.document.get();
  const onDelete = useOutbound.line.deleteSelected(
    selectedRows,
    resetRowSelection
  );
  const { onAllocate } = useOutbound.line.allocateSelected(
    selectedRows,
    resetRowSelection
  );

  const selectedUnallocatedEmptyLines = selectedRows
    .filter(
      ({ type, numberOfPacks }) =>
        type === InvoiceLineNodeType.UnallocatedStock && numberOfPacks === 0
    )
    .flat()
    .map(row => row.id);

  const getConfirmation = useConfirmationModal({
    onConfirm: onAllocate,
    title: t('heading.are-you-sure'),
    message: t('messages.empty-unallocated-lines', {
      count: selectedUnallocatedEmptyLines.length,
    }),
  });

  const confirmAllocate = () => {
    if (selectedUnallocatedEmptyLines.length !== 0) {
      getConfirmation();
    } else {
      onAllocate();
    }
  };

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: onDelete,
    },
    {
      label: t('button.allocate-lines'),
      icon: <ZapIcon />,
      onClick: confirmAllocate,
      shouldShrink: false,
    },
    {
      label: t('button.return-lines'),
      icon: <ArrowLeftIcon />,
      onClick: () => onReturnLines(selectedRows),
      shouldShrink: false,
    },
  ];

  const statuses = outboundStatuses.filter(
    status =>
      !skipIntermediateStatusesInOutbound ||
      (status !== InvoiceNodeStatus.Allocated &&
        status !== InvoiceNodeStatus.Picked)
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
          {data && selectedRows.length === 0 && (
            <Box
              gap={2}
              display="flex"
              flexDirection="row"
              alignItems="center"
              height={64}
            >
              <OnHoldButton />

              <StatusCrumbs
                statuses={statuses}
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
