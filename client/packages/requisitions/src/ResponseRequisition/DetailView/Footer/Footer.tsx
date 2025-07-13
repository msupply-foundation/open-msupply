import React, { FC } from 'react';
import {
  Box,
  StatusCrumbs,
  useTranslation,
  AppFooterPortal,
  RequisitionNodeStatus,
  Action,
  DeleteIcon,
  ActionsFooter,
} from '@openmsupply-client/common';
import { responseStatuses, getRequisitionTranslator } from '../../../utils';
import { ResponseFragment, useResponse } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';

export const createStatusLog = (requisition: ResponseFragment) => {
  const statusLog: Record<
    RequisitionNodeStatus | 'create-shipment',
    null | undefined | string
  > = {
    [RequisitionNodeStatus.New]: requisition.createdDatetime,
    [RequisitionNodeStatus.Finalised]: requisition.finalisedDatetime,
    'create-shipment': null,
    // Keeping typescript happy, not used for response requisitions.
    [RequisitionNodeStatus.Draft]: null,
    [RequisitionNodeStatus.Sent]: null,
  };

  return statusLog;
};

export const Footer: FC = () => {
  const { data } = useResponse.document.get();
  const t = useTranslation();
  const { selectedRows, confirmAndDelete } = useResponse.line.delete();

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
          {data && selectedRows.length === 0 && (
            <Box
              gap={2}
              display="flex"
              flexDirection="row"
              alignItems="center"
              height={64}
            >
              <StatusCrumbs
                statuses={responseStatuses}
                statusLog={createStatusLog(data)}
                statusFormatter={getRequisitionTranslator(t)}
              />

              <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
                <StatusChangeButton requisition={data} />
              </Box>
            </Box>
          )}
        </>
      }
    />
  );
};
