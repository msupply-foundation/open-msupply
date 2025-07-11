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
} from '@openmsupply-client/common';
import {
  getStatusTranslator,
  supplierReturnStatuses,
  outboundStatuses,
} from '../../../utils';
import { SupplierReturnRowFragment, useReturns } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';
import { OnHoldButton } from './OnHoldButton';

const createStatusLog = (invoice: SupplierReturnRowFragment) => {
  const statusIdx = outboundStatuses.findIndex(s => invoice.status === s);
  const statusLog: Record<InvoiceNodeStatus, null | undefined | string> = {
    [InvoiceNodeStatus.New]: null,
    [InvoiceNodeStatus.Picked]: null,
    [InvoiceNodeStatus.Shipped]: null,
    [InvoiceNodeStatus.Verified]: null,
    [InvoiceNodeStatus.Received]: null,
    // Not used for Supplier return
    [InvoiceNodeStatus.Delivered]: null,
    [InvoiceNodeStatus.Allocated]: null,
    [InvoiceNodeStatus.Cancelled]: null,
  };
  if (statusIdx >= 0) {
    statusLog[InvoiceNodeStatus.New] = invoice.createdDatetime;
  }
  // Skipping Allocated
  if (statusIdx >= 2) {
    statusLog[InvoiceNodeStatus.Picked] = invoice.pickedDatetime;
  }
  if (statusIdx >= 3) {
    statusLog[InvoiceNodeStatus.Shipped] = invoice.shippedDatetime;
  }
  // Skipping Delivered
  if (statusIdx >= 5) {
    statusLog[InvoiceNodeStatus.Received] = invoice.receivedDatetime;
  }
  // Skipping received
  if (statusIdx >= 6) {
    statusLog[InvoiceNodeStatus.Verified] = invoice.verifiedDatetime;
  }
  return statusLog;
};

export const FooterComponent: FC = () => {
  const t = useTranslation();
  const { data } = useReturns.document.supplierReturn();
  const { navigateUpOne } = useBreadcrumbs();
  const { id } = data ?? { id: '' };
  const { selectedIds, confirmAndDelete } =
    useReturns.lines.deleteSelectedSupplierLines({
      returnId: id,
    });

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
  ];

  return (
    <AppFooterPortal
      Content={
        <>
          {' '}
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
                statuses={supplierReturnStatuses}
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
