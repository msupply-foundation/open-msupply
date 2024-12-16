import React, { FC, memo } from 'react';
import {
  ActionButtonFooter,
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
} from '@openmsupply-client/common';
import { getStatusTranslator, outboundStatuses } from '../../../utils';
import { useOutbound, OutboundFragment } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';
import { OnHoldButton } from './OnHoldButton';

const createStatusLog = (invoice: OutboundFragment) => {
  const statusIdx = outboundStatuses.findIndex(s => invoice.status === s);

  const statusLog: Record<InvoiceNodeStatus, null | undefined | string> = {
    [InvoiceNodeStatus.New]: null,
    [InvoiceNodeStatus.Allocated]: null,
    [InvoiceNodeStatus.Picked]: null,
    [InvoiceNodeStatus.Shipped]: null,
    [InvoiceNodeStatus.Delivered]: null,
    [InvoiceNodeStatus.Verified]: null,
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
  onReturnLines: (stockLineIds: string[]) => void;
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
  const selectedIds = useOutbound.utils.selectedIds();

  const actions: ActionButtonFooter[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: onDelete,
      disabled: isDisabled,
    },
    {
      label: t('button.return-lines'),
      icon: <ZapIcon />,
      onClick: onAllocate,
      disabled: isDisabled,
    },
    {
      label: t('button.return-lines'),
      icon: <ArrowLeftIcon />,
      onClick: () => onReturnLines(selectedIds),
    },
  ];

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedIds.length !== 0 && (
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedIds.length}
            />
          )}
          {data && selectedIds.length === 0 && (
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
