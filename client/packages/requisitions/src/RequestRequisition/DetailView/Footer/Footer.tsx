import React from 'react';
import {
  Box,
  StatusCrumbs,
  AppFooterPortal,
  RequisitionNodeStatus,
  useTranslation,
  DeleteIcon,
  Action,
  ActionsFooter,
} from '@openmsupply-client/common';
import { getRequisitionTranslator, requestStatuses } from '../../../utils';
import { RequestFragment, RequestLineFragment, useRequest } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';

export const createStatusLog = (requisition: RequestFragment) => {
  const statusLog: Record<RequisitionNodeStatus, null | undefined | string> = {
    [RequisitionNodeStatus.Draft]: requisition.createdDatetime,
    [RequisitionNodeStatus.Sent]: requisition.sentDatetime,
    [RequisitionNodeStatus.Finalised]: requisition.finalisedDatetime,
    // Keeping typescript happy, not used for request requisitions.
    [RequisitionNodeStatus.New]: null,
  };

  return statusLog;
};

export const Footer = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: RequestLineFragment[];
  resetRowSelection: () => void;
}) => {
  const { data } = useRequest.document.get();
  const t = useTranslation();
  const { confirmAndDelete } = useRequest.line.delete(
    selectedRows,
    resetRowSelection
  );

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
              <StatusCrumbs
                statuses={requestStatuses}
                statusLog={createStatusLog(data)}
                statusFormatter={getRequisitionTranslator(t)}
              />

              <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
                <StatusChangeButton />
              </Box>
            </Box>
          )}
        </>
      }
    />
  );
};
