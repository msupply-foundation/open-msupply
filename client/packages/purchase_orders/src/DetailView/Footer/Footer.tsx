import {
  Box,
  AppFooterPortal,
  useTranslation,
  DeleteIcon,
  Action,
  ActionsFooter,
  PurchaseOrderNodeStatus,
  StatusCrumbs,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';
import { StatusChangeButton } from './StatusChangeButton';
import { getStatusTranslator, purchaseOrderStatuses } from './utils';

const createStatusLog = () => {
  // TODO: Implement the logic that ties the dates for when status changes?
  const statusLog: Record<PurchaseOrderNodeStatus, null | undefined | string> =
    {
      [PurchaseOrderNodeStatus.New]: null, // PurchaseOrder.createdDatetime
      [PurchaseOrderNodeStatus.Authorised]: null,
      [PurchaseOrderNodeStatus.Confirmed]: null,
      [PurchaseOrderNodeStatus.Finalised]: null,
    };

  return statusLog;
};

export const Footer: FC = () => {
  const {
    query: { data },
  } = usePurchaseOrder();
  const t = useTranslation();

  const selectedRows = [];
  const confirmAndDelete = () => {};

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
          {selectedRows.length !== 0 && (
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRows.length}
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
              <StatusCrumbs
                statuses={purchaseOrderStatuses}
                statusLog={createStatusLog()}
                statusFormatter={getStatusTranslator(t)}
              />
              <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
                <StatusChangeButton />
              </Box>
            </Box>
          ) : null}
        </>
      }
    />
  );
};
