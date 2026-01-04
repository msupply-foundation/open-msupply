import React from 'react';
import {
  Box,
  ButtonWithIcon,
  StatusCrumbs,
  useTranslation,
  AppFooterPortal,
  InvoiceNodeStatus,
  XCircleIcon,
  useBreadcrumbs,
  ArrowLeftIcon,
  DeleteIcon,
  RewindIcon,
  Action,
  ActionsFooter,
  ArrowRightIcon,
  useEditModal,
  useNotification,
  usePreferences,
} from '@openmsupply-client/common';
import { ChangeCampaignOrProgramConfirmationModal } from '@openmsupply-client/system';
import {
  getStatusTranslator,
  inboundStatuses,
  manualInboundStatuses,
} from '../../../utils';
import { InboundFragment, InboundLineFragment, useInbound } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';
import { OnHoldButton } from './OnHoldButton';
import { useIsInboundDisabled } from '../../api/hooks/utils/useIsInboundDisabled';

const createStatusLog = (invoice: InboundFragment) => {
  const statusIdx = inboundStatuses.findIndex(s => invoice.status === s);
  const statusLog: Record<InvoiceNodeStatus, null | string | undefined> = {
    [InvoiceNodeStatus.New]: null,
    [InvoiceNodeStatus.Picked]: null,
    [InvoiceNodeStatus.Shipped]: null,
    [InvoiceNodeStatus.Delivered]: null,
    [InvoiceNodeStatus.Received]: null,
    [InvoiceNodeStatus.Verified]: null,
    // Placeholder for typescript, not used in inbounds
    [InvoiceNodeStatus.Allocated]: null,
    [InvoiceNodeStatus.Cancelled]: null,
  };

  if (statusIdx >= 0) {
    statusLog[InvoiceNodeStatus.New] = invoice.createdDatetime;
  }
  if (statusIdx >= 1) {
    statusLog[InvoiceNodeStatus.Picked] = invoice.pickedDatetime;
  }
  if (statusIdx >= 2) {
    statusLog[InvoiceNodeStatus.Shipped] = invoice.shippedDatetime;
  }
  if (statusIdx >= 3) {
    statusLog[InvoiceNodeStatus.Delivered] = invoice.deliveredDatetime;
  }
  if (statusIdx >= 4) {
    statusLog[InvoiceNodeStatus.Received] = invoice.receivedDatetime;
  }
  if (statusIdx >= 5) {
    statusLog[InvoiceNodeStatus.Verified] = invoice.verifiedDatetime;
  }

  return statusLog;
};

interface FooterComponentProps {
  onReturnLines: () => void;
  selectedRows: InboundLineFragment[];
  resetRowSelection: () => void;
}

export const FooterComponent = ({
  onReturnLines,
  selectedRows,
  resetRowSelection,
}: FooterComponentProps) => {
  const t = useTranslation();
  const { navigateUpOne } = useBreadcrumbs();
  const { info } = useNotification();
  const changeCampaignOrProgramModal = useEditModal();
  const { invoiceStatusOptions } = usePreferences();

  const { data } = useInbound.document.get();
  const onDelete = useInbound.lines.deleteSelected(
    selectedRows,
    resetRowSelection
  );
  const onZeroQuantities = useInbound.lines.zeroQuantities(
    selectedRows,
    resetRowSelection
  );
  const { mutateAsync } = useInbound.lines.save();
  const isDisabled = useIsInboundDisabled();
  const isManuallyCreated = !data?.linkedShipment?.id;

  const handleCampaignClick = () => {
    if (isDisabled) {
      info(
        t('messages.cant-change-campaign-or-program-on-finalised-invoice')
      )();
    } else {
      changeCampaignOrProgramModal.onOpen();
    }
  };

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: onDelete,
    },
    {
      label: t('button.change-campaign-or-program'),
      icon: <ArrowRightIcon />,
      onClick: handleCampaignClick,
      shouldShrink: false,
    },
    {
      label: t('button.zero-line-quantity'),
      icon: <RewindIcon />,
      onClick: onZeroQuantities,
      shouldShrink: false,
    },
    {
      label: t('button.return-lines'),
      icon: <ArrowLeftIcon />,
      onClick: () => onReturnLines(),
      shouldShrink: false,
    },
  ];
  const statuses = isManuallyCreated
    ? manualInboundStatuses.filter(status =>
        invoiceStatusOptions?.includes(status)
      )
    : inboundStatuses.filter(status => invoiceStatusOptions?.includes(status));

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
          {data && selectedRows.length === 0 ? (
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
          ) : null}
          {
            <ChangeCampaignOrProgramConfirmationModal
              isOpen={changeCampaignOrProgramModal.isOpen}
              onCancel={changeCampaignOrProgramModal.onClose}
              clearSelected={resetRowSelection}
              rows={selectedRows}
              onChange={mutateAsync}
            />
          }
        </>
      }
    />
  );
};

export const Footer = React.memo(FooterComponent);
