import React, { FC, memo } from 'react';
import {
  Box,
  ButtonWithIcon,
  StatusCrumbs,
  XCircleIcon,
  useTranslation,
  AppFooterPortal,
  useBreadcrumbs,
  InvoiceNodeStatus,
  Action,
  DeleteIcon,
  ActionsFooter,
  usePreferences,
} from '@openmsupply-client/common';
import {
  getStatusTranslator,
  manualCustomerReturnStatuses,
  inboundStatuses,
  customerReturnStatuses,
} from '../../../utils';
import { CustomerReturnFragment, useReturns } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';
import { OnHoldButton } from './OnHoldButton';

const createStatusLog = (invoice: CustomerReturnFragment) => {
  const statusIdx = inboundStatuses.findIndex(s => invoice.status === s);
  const statusLog: Record<InvoiceNodeStatus, null | undefined | string> = {
    [InvoiceNodeStatus.New]: null,
    [InvoiceNodeStatus.Picked]: null,
    [InvoiceNodeStatus.Shipped]: null,
    [InvoiceNodeStatus.Received]: null,
    [InvoiceNodeStatus.Verified]: null,
    // Not used for returns
    [InvoiceNodeStatus.Delivered]: null,
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
  // Skipping delivered
  if (statusIdx >= 4) {
    statusLog[InvoiceNodeStatus.Received] = invoice.receivedDatetime;
  }
  if (statusIdx >= 5) {
    statusLog[InvoiceNodeStatus.Verified] = invoice.verifiedDatetime;
  }
  return statusLog;
};

export const FooterComponent: FC = () => {
  const t = useTranslation();
  const { invoiceStatusOptions } = usePreferences();
  const { navigateUpOne } = useBreadcrumbs();
  const { data } = useReturns.document.customerReturn();
  const { id } = data ?? { id: '' };
  const { confirmAndDelete } = useReturns.lines.deleteSelectedCustomerLines({
    returnId: id,
  });
  const { selectedIds } = useReturns.lines.deleteSelectedCustomerLines({
    returnId: id,
  });

  const isManuallyCreated = !data?.linkedShipment?.id;

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
  ];

  const statuses = isManuallyCreated
    ? manualCustomerReturnStatuses.filter(status =>
        invoiceStatusOptions?.includes(status)
      )
    : customerReturnStatuses.filter(status =>
        invoiceStatusOptions?.includes(status)
      );

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
