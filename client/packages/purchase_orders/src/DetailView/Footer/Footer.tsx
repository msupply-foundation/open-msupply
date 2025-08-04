import {
  Box,
  AppFooterPortal,
  useTranslation,
  DeleteIcon,
  Action,
  ActionsFooter,
  PurchaseOrderNodeStatus,
  StatusCrumbs,
  usePreference,
  PreferenceKey,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';
import { StatusChangeButton } from './StatusChangeButton';
import { getStatusTranslator, purchaseOrderStatuses } from './utils';
import { PurchaseOrderFragment } from '../../api';

const createStatusLog = (
  purchaseOrder: PurchaseOrderFragment,
  requiresAuthorisation: boolean
) => {
  const statusLog: Record<PurchaseOrderNodeStatus, null | undefined | string> =
    {
      [PurchaseOrderNodeStatus.New]: purchaseOrder.createdDatetime,
      [PurchaseOrderNodeStatus.Authorised]: requiresAuthorisation
        ? purchaseOrder.authorisedDatetime
        : null,
      [PurchaseOrderNodeStatus.Confirmed]: purchaseOrder.confirmedDatetime,
      [PurchaseOrderNodeStatus.Finalised]: purchaseOrder.finalisedDatetime,
    };

  return statusLog;
};

export const Footer: FC = () => {
  const t = useTranslation();
  const {
    query: { data },
  } = usePurchaseOrder();
  const { data: preferences } = usePreference(
    PreferenceKey.AuthorisePurchaseOrder
  );

  const selectedRows = [];
  const confirmAndDelete = () => {};

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
  ];

  const requiresAuthorisation = preferences?.authorisePurchaseOrder ?? false;
  const filteredStatuses = requiresAuthorisation
    ? purchaseOrderStatuses
    : purchaseOrderStatuses.filter(
        status => status !== PurchaseOrderNodeStatus.Authorised
      );

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
                statuses={filteredStatuses}
                statusLog={createStatusLog(
                  data,
                  preferences?.authorisePurchaseOrder ?? false
                )}
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
