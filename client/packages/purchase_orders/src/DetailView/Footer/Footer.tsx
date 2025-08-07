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
} from '@openmsupply-client/common';
import { usePurchaseOrder, PurchaseOrderFragment } from '../../api';
import { getStatusTranslator, purchaseOrderStatuses } from './utils';
import { StatusChangeButton } from './StatusChangeButton';

const createStatusLog = (purchaseOrder: PurchaseOrderFragment) => {
  const statusLog: Record<PurchaseOrderNodeStatus, null | undefined | string> =
    {
      [PurchaseOrderNodeStatus.New]: purchaseOrder.createdDatetime,
      [PurchaseOrderNodeStatus.Authorised]: purchaseOrder.authorisedDatetime,
      [PurchaseOrderNodeStatus.Confirmed]: purchaseOrder.confirmedDatetime,
      [PurchaseOrderNodeStatus.Finalised]: purchaseOrder.finalisedDatetime,
    };

  return statusLog;
};

interface FooterProps {
  showStatusBar: boolean;
}

export const Footer = ({ showStatusBar }: FooterProps): ReactElement => {
  const {
    query: { data },
  } = usePurchaseOrder();
  const t = useTranslation();

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
                statuses={purchaseOrderStatuses}
                statusLog={createStatusLog(data)}
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
