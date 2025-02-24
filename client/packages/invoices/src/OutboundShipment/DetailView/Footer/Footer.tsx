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
  useTableStore,
  useNotification,
  InvoiceLineNodeType,
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
    [InvoiceNodeStatus.Cancelled]: null,
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
    statusLog[InvoiceNodeStatus.Verified] = invoice.verifiedDatetime;
  }

  return statusLog;
};

interface FooterComponentProps {
  onReturnLines: (selectedLines: StockOutLineFragment[]) => void;
}

export const FooterComponent: FC<FooterComponentProps> = ({
  onReturnLines,
}) => {
  const t = useTranslation();
  const { navigateUpOne } = useBreadcrumbs();

  const { data } = useOutbound.document.get();
  const isDisabled = useOutbound.utils.isDisabled();
  const onDelete = useOutbound.line.deleteSelected();
  const { onAllocate } = useOutbound.line.allocateSelected();
  const { info } = useNotification();

  const selectedLines = useOutbound.utils.selectedLines();
  const { clearSelected } = useTableStore();

  const selectedUnallocatedEmptyLines = selectedLines
    .filter(({ type }) => type === InvoiceLineNodeType.UnallocatedStock)
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
      const infoSnack = info(t('label.no-unallocated-rows-selected'));
      infoSnack();
    }
    clearSelected();
  };

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: onDelete,
      disabled: isDisabled,
      disabledToastMessage: t('messages.cant-delete-generic'),
    },
    {
      label: t('button.allocate-lines'),
      icon: <ZapIcon />,
      onClick: confirmAllocate,
      disabled: isDisabled,
      shouldShrink: false,
      disabledToastMessage: t('label.no-unallocated-rows-selected'),
    },
    {
      label: t('button.return-lines'),
      icon: <ArrowLeftIcon />,
      onClick: () => onReturnLines(selectedLines),
      shouldShrink: false,
    },
  ];

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedLines.length !== 0 && (
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedLines.length}
            />
          )}
          {data && selectedLines.length === 0 && (
            <Box
              gap={2}
              display="flex"
              flexDirection="row"
              alignItems="center"
              height={64}
            >
              <OnHoldButton />

              <StatusCrumbs
                statuses={outboundStatuses}
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
