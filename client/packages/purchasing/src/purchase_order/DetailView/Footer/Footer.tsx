import React, { ReactElement } from 'react';
import {
  Box,
  AppFooterPortal,
  useTranslation,
  DeleteIcon,
  Action,
  ActionsFooter,
  PurchaseOrderNodeStatus,
  StatusCrumbs,
  useTableStore,
  usePreferences,
} from '@openmsupply-client/common';
import { usePurchaseOrder, PurchaseOrderFragment } from '../../api';
import { getStatusTranslator, purchaseOrderStatuses } from './utils';
import { StatusChangeButton } from './StatusChangeButton';

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

interface FooterProps {
  showStatusBar: boolean;
}

export const Footer = ({ showStatusBar }: FooterProps): ReactElement => {
  const t = useTranslation();
  const {
    query: { data },
  } = usePurchaseOrder();
  const { authorisePurchaseOrder = false } = usePreferences();

  const selectedRows = useTableStore(state => {
    const selectedLines =
      data?.lines.nodes.filter(line => state.rowState[line.id]?.isSelected) ||
      [];
    return selectedLines;
  });

  const confirmAndDelete = () => {};

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
  ];

  const filteredStatuses = authorisePurchaseOrder
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
          {data && selectedRows.length === 0 && showStatusBar ? (
            <Box
              gap={2}
              display="flex"
              flexDirection="row"
              alignItems="center"
              height={64}
            >
              <StatusCrumbs
                statuses={filteredStatuses}
                statusLog={createStatusLog(data, authorisePurchaseOrder)}
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
